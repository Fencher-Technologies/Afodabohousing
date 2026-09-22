# mypy: ignore-errors
import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_service_client, get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: UUID
    recipient_id: UUID
    type: str
    title: str
    body: str
    metadata: dict
    is_read: bool
    created_at: str


class PaginatedNotificationsResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    skip: int
    limit: int


class UnreadCountResponse(BaseModel):
    count: int


@router.get("", response_model=PaginatedNotificationsResponse)
def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> PaginatedNotificationsResponse:
    count_resp = (
        supabase.table("notifications")
        .select("id", count="exact")
        .eq("recipient_id", str(current_user.id))
        .execute()
    )
    total = count_resp.count if hasattr(count_resp, "count") else len(count_resp.data or [])

    result = (
        supabase.table("notifications")
        .select("*")
        .eq("recipient_id", str(current_user.id))
        .order("created_at", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )

    data = result.data or []
    notifications = [
        NotificationResponse(
            id=item["id"],
            recipient_id=item["recipient_id"],
            type=item["type"],
            title=item["title"],
            body=item["body"],
            metadata=item.get("metadata", {}),
            is_read=item["is_read"],
            created_at=item["created_at"],
        )
        for item in data
    ]

    return PaginatedNotificationsResponse(
        items=notifications,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_notification_count(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> UnreadCountResponse:
    result = (
        supabase.table("notifications")
        .select("id", count="exact")
        .eq("recipient_id", str(current_user.id))
        .eq("is_read", False)
        .execute()
    )

    return UnreadCountResponse(
        count=result.count if hasattr(result, "count") else len(result.data or []),
    )


@router.patch("/{notification_id}", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> NotificationResponse:
    existing = (
        supabase.table("notifications")
        .select("*")
        .eq("id", str(notification_id))
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    notification = existing.data[0]

    if notification["recipient_id"] != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    result = (
        supabase.table("notifications")
        .update({"is_read": True})
        .eq("id", str(notification_id))
        .execute()
    )

    updated = result.data[0]
    return NotificationResponse(
        id=updated["id"],
        recipient_id=updated["recipient_id"],
        type=updated["type"],
        title=updated["title"],
        body=updated["body"],
        metadata=updated.get("metadata", {}),
        is_read=updated["is_read"],
        created_at=updated["created_at"],
    )


class RegisterPushTokenRequest(BaseModel):
    token: str
    platform: str = "expo"
    device_name: str | None = None


@router.post("/push-token", status_code=status.HTTP_201_CREATED)
def register_push_token(
    data: RegisterPushTokenRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> dict:
    """Register this device for push. Called by the app after every sign-in.

    Upserts on the token, so a phone that signs into a different account
    moves to that account instead of pushing the previous user's alerts.
    """
    token = data.token.strip()
    if not token.startswith(("ExponentPushToken[", "ExpoPushToken[")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid push token")
    supabase.table("push_tokens").upsert(
        {
            "user_id": str(current_user.id),
            "token": token,
            "platform": data.platform,
            "device_name": data.device_name,
            "last_seen_at": datetime.now(UTC).isoformat(),
        },
        on_conflict="token",
    ).execute()
    return {"success": True}


@router.delete("/push-token")
def unregister_push_token(
    token: str = Query(..., min_length=10),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> dict:
    """Stop pushing to this device (called on sign-out)."""
    supabase.table("push_tokens").delete().eq("token", token).eq(
        "user_id", str(current_user.id)
    ).execute()
    return {"success": True}
