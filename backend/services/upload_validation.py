"""Upload hardening: size caps, content sniffing and safe file names.

The upload endpoints used to read the whole body into memory, trust the
client's declared content type, and keep the client's file name (and so its
extension). Any of those lets a caller park arbitrary content in a public
bucket, or exhaust the process's memory with one request.

Everything here works from the bytes themselves. The declared MIME type and
file name are only hints and are never used to decide what a file is.
"""

from __future__ import annotations

import io
import re
import uuid
from dataclasses import dataclass

from fastapi import HTTPException, UploadFile, status

MB = 1024 * 1024

MAX_PAYMENT_PROOF_BYTES = 10 * MB
MAX_PROPERTY_IMAGE_BYTES = 10 * MB
MAX_VOICE_NOTE_BYTES = 15 * MB

#: Largest request body any /uploads route may carry (biggest file + multipart
#: framing). Enforced before the body is parsed, see UploadSizeLimitMiddleware.
MAX_UPLOAD_REQUEST_BYTES = MAX_VOICE_NOTE_BYTES + MB

#: A decoded image can be far larger than its file: a tiny PNG may declare a
#: 60,000 x 60,000 canvas. Refuse anything past this many pixels.
MAX_IMAGE_PIXELS = 50_000_000

_CHUNK = 64 * 1024


@dataclass(frozen=True)
class FileKind:
    mime: str
    ext: str
    is_image: bool = False


JPEG = FileKind("image/jpeg", "jpg", True)
PNG = FileKind("image/png", "png", True)
WEBP = FileKind("image/webp", "webp", True)
HEIC = FileKind("image/heic", "heic", True)
PDF = FileKind("application/pdf", "pdf")

M4A = FileKind("audio/mp4", "m4a")
GPP = FileKind("audio/3gpp", "3gp")
MP3 = FileKind("audio/mpeg", "mp3")
AAC = FileKind("audio/aac", "aac")
WAV = FileKind("audio/wav", "wav")
OGG = FileKind("audio/ogg", "ogg")
WEBM = FileKind("audio/webm", "webm")
AMR = FileKind("audio/amr", "amr")

IMAGES_WEB = frozenset({JPEG, PNG, WEBP})
PAYMENT_PROOF_KINDS = frozenset({JPEG, PNG, WEBP, HEIC, PDF})
PROPERTY_IMAGE_KINDS = IMAGES_WEB
VOICE_NOTE_KINDS = frozenset({M4A, GPP, MP3, AAC, WAV, OGG, WEBM, AMR})

_HEIC_BRANDS = {b"heic", b"heix", b"hevc", b"hevx", b"heim", b"heis", b"mif1", b"msf1"}


def sniff(data: bytes) -> FileKind | None:
    """Identify a file from its leading bytes, or None if it is not recognised."""
    head = data[:16]
    if head[:3] == b"\xff\xd8\xff":
        return JPEG
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return PNG
    if head[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return WEBP
    if head[:5] == b"%PDF-":
        return PDF
    if head[4:8] == b"ftyp":
        brand = data[8:12]
        if brand in _HEIC_BRANDS:
            return HEIC
        if brand.startswith(b"3gp") or brand.startswith(b"3g2"):
            return GPP
        return M4A
    if head[:4] == b"RIFF" and data[8:12] == b"WAVE":
        return WAV
    if head[:4] == b"OggS":
        return OGG
    if head[:4] == b"\x1a\x45\xdf\xa3":
        return WEBM
    if head[:5] == b"#!AMR":
        return AMR
    if head[:3] == b"ID3":
        return MP3
    if len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xF0) == 0xF0:
        # ADTS (AAC) frames carry layer bits 00; MPEG audio (MP3) never does.
        return AAC if ((head[1] >> 1) & 0b11) == 0 else MP3
    return None


async def read_limited(file: UploadFile, max_bytes: int) -> bytes:
    """Read an upload without ever holding more than max_bytes + one chunk."""
    declared = getattr(file, "size", None)
    if declared is not None and declared > max_bytes:
        raise _too_large(max_bytes)

    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(_CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise _too_large(max_bytes)
        chunks.append(chunk)
    return b"".join(chunks)


def _too_large(max_bytes: int) -> HTTPException:
    return HTTPException(
        status_code=413,
        detail=f"File is too large. The limit is {max_bytes // MB} MB.",
    )


def _verify_image(data: bytes, kind: FileKind) -> None:
    """Reject images that are corrupt or declare an absurd canvas size.

    HEIC cannot be opened by Pillow, so it is accepted on its signature alone.
    """
    if kind is HEIC:
        return
    try:
        from PIL import Image

        with Image.open(io.BytesIO(data)) as img:
            width, height = img.size
            if width * height > MAX_IMAGE_PIXELS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Image dimensions are too large.",
                )
            img.verify()
    except HTTPException:
        raise
    except Exception as exc:  # corrupt, truncated or not really an image
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The file is not a valid image.",
        ) from exc


def validate_upload(data: bytes, allowed: frozenset[FileKind]) -> FileKind:
    """Return the detected kind, or raise 400/415 if it is empty or not allowed."""
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    kind = sniff(data)
    if kind is None or kind not in allowed:
        accepted = ", ".join(sorted({k.ext.upper() for k in allowed}))
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type. Allowed: {accepted}.",
        )
    if kind.is_image:
        _verify_image(data, kind)
    return kind


_UNSAFE = re.compile(r"[^A-Za-z0-9._-]+")


def storage_filename(original: str | None, fallback_stem: str, kind: FileKind) -> str:
    """A storage-safe name whose extension comes from the detected type.

    The client's extension is discarded: "photo.html" holding a JPEG is stored
    as .jpg, and a script renamed "scan.jpg" is rejected before it gets here.
    A short random suffix keeps two uploads in the same millisecond apart.
    """
    stem = (original or "").replace("\\", "/").rsplit("/", 1)[-1]
    stem = stem.rsplit(".", 1)[0] if "." in stem else stem
    stem = _UNSAFE.sub("-", stem).strip("-._")[:60] or fallback_stem
    return f"{stem}-{uuid.uuid4().hex[:8]}.{kind.ext}"
