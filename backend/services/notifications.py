import logging

from supabase import Client

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
