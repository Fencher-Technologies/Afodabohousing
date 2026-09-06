import logging

import httpx
from supabase import Client

from config import get_settings
from services.email import email_endpoint

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def create_notification(
    supabase: Client,
    *,
    recipient_id: str,
    type: str,
    title: str,
    body: str,
    metadata: dict | None = None,
) -> dict | None:
    payload = {
        "recipient_id": recipient_id,
        "type": type,
        "title": title,
        "body": body,
        "metadata": metadata or {},
        "is_read": False,
    }
    try:
        result = supabase.table("notifications").insert(payload).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.warning("Failed to create notification: %s", str(e))
        return None


def send_push_notification(
    supabase: Client,
    *,
    recipient_id: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    try:
        tokens_result = (
            supabase.table("push_tokens")
            .select("token")
            .eq("user_id", recipient_id)
            .execute()
        )
        tokens = [row["token"] for row in (tokens_result.data or [])]
    except Exception as e:
        logger.warning("Push tokens table not available, skipping push: %s", str(e))
        return
    if not tokens:
        return

    messages = [
        {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
            "priority": "high",
        }
        for token in tokens
    ]

    try:
        import httpx
        resp = httpx.post(
            EXPO_PUSH_URL,
            json=messages,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            timeout=15,
        )
        resp.raise_for_status()
    except Exception as e:
        logger.warning("Failed to send push notification: %s", str(e))


def send_notification_email(
    supabase: Client,
    *,
    recipient_id: str,
    title: str,
    body: str,
) -> bool:
    """Email a notification to the recipient, if we can resolve an address.

    Best-effort and never raises: an email failure must not roll back the
    action that triggered it (approving a payment, rejecting an agreement).
    """
    settings = get_settings()
    url, token = email_endpoint(settings)
    if not url or not token:
        return False

    try:
        profile = (
            supabase.table("profiles")
            .select("email")
            .eq("user_id", str(recipient_id))
            .limit(1)
            .execute()
        )
    except Exception as e:
        logger.warning("Could not look up email for %s: %s", recipient_id, e)
        return False

    row = profile.data[0] if isinstance(profile.data, list) and profile.data else None
    to_email = row.get("email") if isinstance(row, dict) else None
    # Phone-registered accounts carry a synthetic address that cannot receive.
    if not isinstance(to_email, str) or not to_email or to_email.endswith((".app", ".local")):
        return False

    try:
        response = httpx.post(
            url,
            headers={"Authorization": f"Bearer {token}"},
            json={
                "from": settings.email_from_address,
                "to": to_email,
                "subject": title,
                "text": body,
            },
            timeout=15,
        )
        response.raise_for_status()
        return True
    except Exception as e:
        logger.warning("Notification email to %s failed: %s", to_email, e)
        return False


def notify(
    supabase: Client,
    *,
    recipient_id: str,
    type: str,
    title: str,
    body: str,
    metadata: dict | None = None,
) -> None:
    create_notification(
        supabase,
        recipient_id=recipient_id,
        type=type,
        title=title,
        body=body,
        metadata=metadata,
    )
    send_push_notification(
        supabase,
        recipient_id=recipient_id,
        title=title,
        body=body,
        data=metadata,
    )
    send_notification_email(
        supabase,
        recipient_id=recipient_id,
        title=title,
        body=body,
    )
