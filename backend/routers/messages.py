import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_supabase_client
from models import MessageCreate, MessageResponse, MessageUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/messages", tags=["messages"])


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


@router.get("", response_model=PaginatedResponse)
def list_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> PaginatedResponse:
    count_resp = (
        supabase.table("messages")
        .select("*", count="exact")
        .or_(f"sender_id.eq.{current_user.id},receiver_id.eq.{current_user.id}")
        .execute()
    )
    total = count_resp.count if hasattr(count_resp, "count") else 0

    response = (
        supabase.table("messages")
        .select("*")
        .or_(f"sender_id.eq.{current_user.id},receiver_id.eq.{current_user.id}")
        .order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )

    data = response.data or []
    user_ids = set()
    for m in data:
        user_ids.add(m["sender_id"])
        user_ids.add(m["receiver_id"])

    profile_map = {}
    if user_ids:
        profiles = (
            supabase.table("profiles")
            .select("user_id, full_name")
            .in_("user_id", list(user_ids))
            .execute()
        )
        for p in (profiles.data or []):
            profile_map[p["user_id"]] = p.get("full_name") or "Unknown"

    items = []
    for m in data:
        items.append(MessageResponse(
            **m,
            sender_name=profile_map.get(m["sender_id"]),
            receiver_name=profile_map.get(m["receiver_id"]),
        ))

    return PaginatedResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/conversations", response_model=PaginatedResponse)
def list_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> PaginatedResponse:
    all_messages = (
        supabase.table("messages")
        .select("*")
        .or_(f"sender_id.eq.{current_user.id},receiver_id.eq.{current_user.id}")
        .order("created_at", desc=True)
        .execute()
    )

    seen = set()
    conversations = []
    for m in (all_messages.data or []):
        counterpart = m["sender_id"] if m["receiver_id"] == current_user.id else m["receiver_id"]
        if counterpart not in seen:
            seen.add(counterpart)
            conversations.append(m)

    total = len(conversations)
    paginated = conversations[skip : skip + limit]

    user_ids = {current_user.id}
    for m in paginated:
        user_ids.add(m["sender_id"])
        user_ids.add(m["receiver_id"])

    profile_map = {}
    if user_ids:
        profiles = (
            supabase.table("profiles")
            .select("user_id, full_name")
            .in_("user_id", list(user_ids))
            .execute()
        )
        for p in (profiles.data or []):
            profile_map[p["user_id"]] = p.get("full_name") or "Unknown"

    items = []
    for m in paginated:
        counterpart = m["sender_id"] if m["receiver_id"] == current_user.id else m["receiver_id"]
        items.append(MessageResponse(
            **m,
            sender_name=profile_map.get(m["sender_id"]),
            receiver_name=profile_map.get(m["receiver_id"]),
        ))

    return PaginatedResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/unread", response_model=int)
def unread_count(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> dict:
    result = (
        supabase.table("messages")
        .select("*", count="exact")
        .eq("receiver_id", current_user.id)
        .eq("is_read", False)
        .execute()
    )
    return {"unread": result.count if hasattr(result, "count") else 0}


@router.get("/{message_id}", response_model=MessageResponse)
def get_message(
    message_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    result = supabase.table("messages").select("*").eq("id", str(message_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Message not found")

    msg = result.data[0]
    if msg["sender_id"] != current_user.id and msg["receiver_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    profile_map = {}
    profiles = (
        supabase.table("profiles")
        .select("user_id, full_name")
        .in_("user_id", [msg["sender_id"], msg["receiver_id"]])
        .execute()
    )
    for p in (profiles.data or []):
        profile_map[p["user_id"]] = p.get("full_name") or "Unknown"

    return MessageResponse(
        **msg,
        sender_name=profile_map.get(msg["sender_id"]),
        receiver_name=profile_map.get(msg["receiver_id"]),
    )


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    data: MessageCreate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    payload = data.model_dump(exclude_none=True, mode="json")
    payload["sender_id"] = current_user.id

    result = supabase.table("messages").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to send message")

    msg = result.data[0]

    receiver_profile = supabase.table("profiles").select("full_name").eq("user_id", data.receiver_id).execute()
    receiver_name = receiver_profile.data[0].get("full_name") if receiver_profile.data else None

    return MessageResponse(
        **msg,
        sender_name=current_user.email,
        receiver_name=receiver_name,
    )


@router.patch("/{message_id}", response_model=MessageResponse)
def update_message(
    message_id: UUID,
    data: MessageUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    existing = supabase.table("messages").select("*").eq("id", str(message_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Message not found")

    msg = existing.data[0]
    if msg["receiver_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only the receiver can update this message")

    payload = data.model_dump(exclude_none=True, mode="json")
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("messages").update(payload).eq("id", str(message_id)).execute()
    return MessageResponse(**result.data[0])
