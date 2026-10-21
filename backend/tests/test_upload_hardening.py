"""Uploads: size caps, content sniffing, safe names and the request-size guard."""

import io
import struct
import zlib
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from dependencies import get_current_user, get_service_client, require_active_subscription
from main import app
from services import upload_validation as uv


def _png(width=4, height=4) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), (200, 30, 30)).save(buf, "PNG")
    return buf.getvalue()


def _jpeg() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), (10, 120, 10)).save(buf, "JPEG")
    return buf.getvalue()


def _webp() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), (10, 10, 120)).save(buf, "WEBP")
    return buf.getvalue()


def _huge_png_header(width: int, height: int) -> bytes:
    """A tiny, structurally valid PNG that *declares* an enormous canvas."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(b"\x00")) + chunk(b"IEND", b"")


M4A = b"\x00\x00\x00\x20ftypM4A \x00\x00\x00\x00" + b"\x00" * 32
MP3_ID3 = b"ID3\x04\x00\x00\x00\x00\x00\x00" + b"\x00" * 32
WAV = b"RIFF\x24\x00\x00\x00WAVEfmt " + b"\x00" * 32
WEBM = b"\x1a\x45\xdf\xa3" + b"\x00" * 32
PDF = b"%PDF-1.4\n" + b"0" * 32
HTML = b"<html><script>alert(1)</script></html>"
SVG = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
EXE = b"MZ\x90\x00" + b"\x00" * 64


class TestSniff:
    @pytest.mark.parametrize(
        "data,kind",
        [
            (_jpeg(), uv.JPEG), (_png(), uv.PNG), (_webp(), uv.WEBP), (PDF, uv.PDF),
            (M4A, uv.M4A), (MP3_ID3, uv.MP3), (WAV, uv.WAV), (WEBM, uv.WEBM),
            (b"OggS" + b"\x00" * 20, uv.OGG), (b"#!AMR\n" + b"\x00" * 20, uv.AMR),
            (b"\x00\x00\x00\x18ftypheic" + b"\x00" * 20, uv.HEIC),
            (b"\x00\x00\x00\x18ftyp3gp4" + b"\x00" * 20, uv.GPP),
            (b"\xff\xf1\x50\x80" + b"\x00" * 20, uv.AAC),
            (b"\xff\xfb\x90\x00" + b"\x00" * 20, uv.MP3),
        ],
    )
    def test_recognises(self, data, kind):
        assert uv.sniff(data) == kind

    @pytest.mark.parametrize("data", [HTML, SVG, EXE, b"", b"plain text", b"GIF89a" + b"\x00" * 10])
    def test_rejects_unknown(self, data):
        assert uv.sniff(data) is None


class TestValidate:
    def test_empty_is_400(self):
        with pytest.raises(Exception) as exc:
            uv.validate_upload(b"", uv.PROPERTY_IMAGE_KINDS)
        assert exc.value.status_code == 400

    @pytest.mark.parametrize("data", [HTML, SVG, EXE, PDF, M4A])
    def test_non_images_rejected_for_property_images(self, data):
        with pytest.raises(Exception) as exc:
            uv.validate_upload(data, uv.PROPERTY_IMAGE_KINDS)
        assert exc.value.status_code == 415

    def test_pdf_allowed_for_payment_proof_only(self):
        assert uv.validate_upload(PDF, uv.PAYMENT_PROOF_KINDS) == uv.PDF
        with pytest.raises(Exception):
            uv.validate_upload(PDF, uv.PROPERTY_IMAGE_KINDS)

    def test_corrupt_image_rejected(self):
        broken = b"\x89PNG\r\n\x1a\n" + b"not really a png"
        with pytest.raises(Exception) as exc:
            uv.validate_upload(broken, uv.PROPERTY_IMAGE_KINDS)
        assert exc.value.status_code == 400

    def test_decompression_bomb_rejected(self):
        bomb = _huge_png_header(60_000, 60_000)
        assert len(bomb) < 200  # tiny on disk, 3.6 billion pixels declared
        with pytest.raises(Exception) as exc:
            uv.validate_upload(bomb, uv.PROPERTY_IMAGE_KINDS)
        assert exc.value.status_code == 400

    def test_audio_rejected_where_images_expected_and_vice_versa(self):
        with pytest.raises(Exception):
            uv.validate_upload(M4A, uv.PROPERTY_IMAGE_KINDS)
        with pytest.raises(Exception):
            uv.validate_upload(_png(), uv.VOICE_NOTE_KINDS)


class TestFilename:
    def test_extension_comes_from_the_bytes_not_the_client(self):
        assert uv.storage_filename("holiday.html", "x", uv.JPEG).endswith(".jpg")
        assert uv.storage_filename("a.php.png", "x", uv.PNG).endswith(".png")

    def test_path_tricks_and_odd_characters_are_neutralised(self):
        name = uv.storage_filename("../../etc/pass wd?.jpg", "fallback", uv.JPEG)
        assert "/" not in name and ".." not in name and "?" not in name and " " not in name

    def test_fallback_and_uniqueness(self):
        a = uv.storage_filename(None, "payment-proof", uv.PNG)
        b = uv.storage_filename(None, "payment-proof", uv.PNG)
        assert a.startswith("payment-proof-") and a != b


# ── Endpoints ───────────────────────────────────────────────────────────────

@pytest.fixture
def storage(test_user):
    bucket = MagicMock()
    bucket.create_signed_url.return_value = {"signedURL": "https://signed.example/x"}
    bucket.get_public_url.return_value = "https://public.example/x"
    sb = MagicMock()
    sb.storage.from_.return_value = bucket

    app.dependency_overrides[get_service_client] = lambda: sb
    app.dependency_overrides[get_current_user] = lambda: test_user
    app.dependency_overrides[require_active_subscription] = lambda: test_user
    yield sb, bucket
    app.dependency_overrides.clear()


def _post(route, data, name="file.bin", ctype="application/octet-stream"):
    return TestClient(app).post(route, files={"file": (name, data, ctype)})


class TestEndpoints:
    def test_property_image_uses_detected_type_and_extension(self, storage):
        sb, bucket = storage
        # The mobile app labels everything image/jpeg and names it by URI.
        r = _post("/uploads/property-image", _png(), name="IMG 001.jpg", ctype="image/jpeg")
        assert r.status_code == 201, r.text
        path, body, opts = bucket.upload.call_args.args
        assert path.endswith(".png")
        assert opts["content-type"] == "image/png"
        assert body == _png()

    def test_property_image_rejects_html_even_if_labelled_jpeg(self, storage):
        _, bucket = storage
        r = _post("/uploads/property-image", HTML, name="x.jpg", ctype="image/jpeg")
        assert r.status_code == 415
        bucket.upload.assert_not_called()

    def test_property_image_rejects_svg(self, storage):
        r = _post("/uploads/property-image", SVG, name="x.svg", ctype="image/svg+xml")
        assert r.status_code == 415

    def test_oversize_is_413_and_never_reaches_storage(self, storage, monkeypatch):
        _, bucket = storage
        monkeypatch.setattr(uv, "MAX_PROPERTY_IMAGE_BYTES", 1024)
        monkeypatch.setattr("routers.uploads.MAX_PROPERTY_IMAGE_BYTES", 1024)
        r = _post("/uploads/property-image", _png(200, 200) + b"\x00" * 4096)
        assert r.status_code == 413
        bucket.upload.assert_not_called()

    def test_payment_proof_accepts_pdf_and_images(self, storage):
        assert _post("/uploads/payment-proof", PDF).status_code == 201
        assert _post("/uploads/payment-proof", _jpeg()).status_code == 201

    def test_payment_proof_rejects_executables(self, storage):
        assert _post("/uploads/payment-proof", EXE, name="proof.jpg", ctype="image/jpeg").status_code == 415

    def test_voice_note_accepts_audio_and_rejects_images(self, storage):
        assert _post("/uploads/voice-note", M4A, name="n.m4a").status_code == 201
        assert _post("/uploads/voice-note", WEBM, name="n.webm").status_code == 201
        assert _post("/uploads/voice-note", _png()).status_code == 415

    def test_empty_file_is_400(self, storage):
        assert _post("/uploads/payment-proof", b"").status_code == 400


class TestRequestSizeGuard:
    def test_declared_length_over_cap_is_refused_before_parsing(self, storage):
        _, bucket = storage
        r = TestClient(app).post(
            "/uploads/property-image",
            content=b"x",
            headers={"content-length": str(uv.MAX_UPLOAD_REQUEST_BYTES + 1), "content-type": "multipart/form-data; boundary=x"},
        )
        assert r.status_code == 413
        assert r.json()["error"] == "payload_too_large"
        bucket.upload.assert_not_called()

    def test_other_routes_are_not_affected(self):
        r = TestClient(app).get("/health")
        assert r.status_code == 200
