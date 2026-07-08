# mypy: ignore-errors
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_supabase_client

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
    notifications: list[NotificationResponse]
    total: int


class UnreadCountResponse(BaseModel):
    count: int


@router.get("", response_model=PaginatedNotificationsResponse)
def list_notifications(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> PaginatedNotificationsResponse:
    result = (
        supabase.table("notifications")
        .select("*")
        .eq("recipient_id", str(current_user.id))
        .order("created_at", desc=True)
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
        notifications=notifications,
        total=len(notifications),
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_notification_count(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> UnreadCountResponse:
    result = (
        supabase.table("notifications")
        .select("*", count="exact")
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
