import time
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_service_client

router = APIRouter(prefix="/uploads", tags=["uploads"])

PAYMENT_PROOF_URL_TTL_SECONDS = 60 * 60 * 24 * 30


class UploadResponse(BaseModel):
    path: str
    url: str


def _safe_filename(filename: str | None, fallback: str) -> str:
    candidate = Path(filename or fallback).name
    return candidate.replace(" ", "-")


@router.post("/payment-proof", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_payment_proof(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> UploadResponse:
    file_bytes = await file.read()
    if not file_bytes:
      raise HTTPException(status_code=400, detail="Uploaded file is empty")

    filename = _safe_filename(file.filename, "payment-proof.bin")
    storage_path = f"{current_user.id}/{int(time.time() * 1000)}-{filename}"

    supabase.storage.from_("payment-proofs").upload(
        storage_path,
        file_bytes,
        {"content-type": file.content_type or "application/octet-stream", "upsert": "false"},
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
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    filename = _safe_filename(file.filename, "voice-note.m4a")
    storage_path = f"{current_user.id}/{int(time.time() * 1000)}-{filename}"

    supabase.storage.from_("voice-notes").upload(
        storage_path,
        file_bytes,
        {"content-type": file.content_type or "audio/mp4", "upsert": "false"},
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
    supabase: Client = Depends(get_service_client),
) -> UploadResponse:
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    filename = _safe_filename(file.filename, "property-image.jpg")
    storage_path = f"properties/{current_user.id}/{int(time.time() * 1000)}-{filename}"

    supabase.storage.from_("property-images").upload(
        storage_path,
        file_bytes,
        {"content-type": file.content_type or "image/jpeg", "upsert": "false"},
    )
    public_url = supabase.storage.from_("property-images").get_public_url(storage_path)

    if not public_url:
        raise HTTPException(status_code=500, detail="Failed to create public property image URL")

    return UploadResponse(path=storage_path, url=public_url)
