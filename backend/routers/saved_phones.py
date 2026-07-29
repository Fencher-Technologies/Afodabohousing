import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_service_client
from phone import normalize_phone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/saved-phones", tags=["saved-phones"])

MAX_SAVED = 5


class SavedPhoneResponse(BaseModel):
    id: str
    phone: str
    usage_count: int
    last_used_at: str
    created_at: str


class SavePhoneRequest(BaseModel):
    phone: str


class SavePhoneResponse(BaseModel):
    id: str
    phone: str
    is_new: bool


@router.get("", response_model=list[SavedPhoneResponse])
def list_saved_phones(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
):
    result = (
        supabase.table("saved_phones")
        .select("*")
        .eq("user_id", current_user.id)
        .order("usage_count", desc=True)
        .execute()
    )
    return [SavedPhoneResponse(**r) for r in result.data]


@router.post("", response_model=SavePhoneResponse, status_code=status.HTTP_201_CREATED)
def save_phone(
    data: SavePhoneRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
):
    phone = normalize_phone(data.phone)

    existing = (
        supabase.table("saved_phones")
        .select("*")
        .eq("user_id", current_user.id)
        .eq("phone", phone)
        .execute()
    )
    if existing.data:
        row = existing.data[0]
        supabase.table("saved_phones").update({
            "usage_count": row["usage_count"] + 1,
            "last_used_at": "now()",
        }).eq("id", row["id"]).execute()
        return SavePhoneResponse(id=row["id"], phone=phone, is_new=False)

    all_phones = (
        supabase.table("saved_phones")
        .select("id")
        .eq("user_id", current_user.id)
        .execute()
    )
    if len(all_phones.data) >= MAX_SAVED:
        to_delete = (
            supabase.table("saved_phones")
            .select("id, usage_count, last_used_at")
            .eq("user_id", current_user.id)
            .order("usage_count")
            .limit(1)
            .execute()
        )
        if to_delete.data:
            supabase.table("saved_phones").delete().eq("id", to_delete.data[0]["id"]).execute()

    inserted = (
        supabase.table("saved_phones").insert({
            "user_id": current_user.id,
            "phone": phone,
            "usage_count": 0,
            "last_used_at": "now()",
        }).execute()
    )
    new_id = inserted.data[0]["id"]
    supabase.table("saved_phones").update({
        "usage_count": 1,
    }).eq("id", new_id).execute()
    return SavePhoneResponse(id=new_id, phone=phone, is_new=True)


@router.delete("/{phone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_phone(
    phone_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
):
    all_phones = (
        supabase.table("saved_phones")
        .select("id")
        .eq("user_id", current_user.id)
        .execute()
    )
    if len(all_phones.data) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last saved phone number")

    supabase.table("saved_phones").delete().eq("id", phone_id).eq("user_id", current_user.id).execute()
