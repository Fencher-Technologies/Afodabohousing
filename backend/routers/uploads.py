import time

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from supabase import Client

from dependencies import (
    CurrentUser,
    get_current_user,
    get_service_client,
    require_active_subscription,
)
from services.upload_validation import (
    MAX_PAYMENT_PROOF_BYTES,
    MAX_PROPERTY_IMAGE_BYTES,
    MAX_VOICE_NOTE_BYTES,
    PAYMENT_PROOF_KINDS,
    PROPERTY_IMAGE_KINDS,
    VOICE_NOTE_KINDS,
    read_limited,
    storage_filename,
    validate_upload,
)

router = APIRouter(prefix="/uploads", tags=["uploads"])

PAYMENT_PROOF_URL_TTL_SECONDS = 60 * 60 * 24 * 30


class UploadResponse(BaseModel):
    path: str
    url: str


@router.post("/payment-proof", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_payment_proof(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> UploadResponse:
    file_bytes = await read_limited(file, MAX_PAYMENT_PROOF_BYTES)
    # What the file is comes from its bytes, never from the declared type or
    # the client's extension.
    kind = validate_upload(file_bytes, PAYMENT_PROOF_KINDS)

    filename = storage_filename(file.filename, "payment-proof", kind)
    storage_path = f"{current_user.id}/{int(time.time() * 1000)}-{filename}"

    supabase.storage.from_("payment-proofs").upload(
        storage_path,
        file_bytes,
        {"content-type": kind.mime, "upsert": "false"},
    )
    signed = supabase.storage.from_("payment-proofs").create_signed_url(
        storage_path,
        PAYMENT_PROOF_URL_TTL_SECONDS,
    )
    signed_url = signed.get("signedURL") or signed.get("signedUrl")
    if not signed_url:
        raise HTTPException(status_code=500, detail="Failed to create signed payment proof URL")

    return UploadResponse(path=storage_path, url=signed_url)


VOICE_NOTE_URL_TTL_SECONDS = 60 * 60 * 24 * 365


@router.post("/voice-note", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_voice_note(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> UploadResponse:
    file_bytes = await read_limited(file, MAX_VOICE_NOTE_BYTES)
    kind = validate_upload(file_bytes, VOICE_NOTE_KINDS)

    filename = storage_filename(file.filename, "voice-note", kind)
    storage_path = f"{current_user.id}/{int(time.time() * 1000)}-{filename}"

    supabase.storage.from_("voice-notes").upload(
        storage_path,
        file_bytes,
        {"content-type": kind.mime, "upsert": "false"},
    )
    signed = supabase.storage.from_("voice-notes").create_signed_url(
        storage_path,
        VOICE_NOTE_URL_TTL_SECONDS,
    )
    signed_url = signed.get("signedURL") or signed.get("signedUrl")
    if not signed_url:
        raise HTTPException(status_code=500, detail="Failed to create signed voice note URL")

    return UploadResponse(path=storage_path, url=signed_url)


@router.post("/property-image", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_property_image(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    _subscription_guard: CurrentUser = Depends(require_active_subscription),
    supabase: Client = Depends(get_service_client),
) -> UploadResponse:
    file_bytes = await read_limited(file, MAX_PROPERTY_IMAGE_BYTES)
    # The public bucket must only ever hold real, bounded-size images. The
    # mobile app labels every photo image/jpeg whatever it is, so the type is
    # taken from the bytes and stored accordingly.
    kind = validate_upload(file_bytes, PROPERTY_IMAGE_KINDS)

    filename = storage_filename(file.filename, "property-image", kind)
    storage_path = f"properties/{current_user.id}/{int(time.time() * 1000)}-{filename}"

    supabase.storage.from_("property-images").upload(
        storage_path,
        file_bytes,
        {"content-type": kind.mime, "upsert": "false"},
    )
    public_url = supabase.storage.from_("property-images").get_public_url(storage_path)

    if not public_url:
        raise HTTPException(status_code=500, detail="Failed to create public property image URL")

    return UploadResponse(path=storage_path, url=public_url)
