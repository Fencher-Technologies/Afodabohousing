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
) -> int:
    """Push to every device the recipient has registered. Returns devices reached.

    Best-effort and never raises. Tokens Expo reports as DeviceNotRegistered
    (app uninstalled, notifications revoked) are deleted so they are not
    retried forever.
    """
    try:
        tokens_result = (
            supabase.table("push_tokens")
            .select("token")
            .eq("user_id", str(recipient_id))
            .execute()
        )
        tokens = [row["token"] for row in (tokens_result.data or []) if row.get("token")]
    except Exception as e:
        logger.warning("Could not load push tokens for %s: %s", recipient_id, e)
        return 0
    if not tokens:
        return 0

    delivered = 0
    dead: list[str] = []
    # Expo accepts at most 100 messages per request.
    for i in range(0, len(tokens), 100):
        chunk = tokens[i : i + 100]
        messages = [
            {
                "to": token,
                "sound": "default",
                "title": title,
                "body": body,
                "data": data or {},
                "priority": "high",
                "channelId": "default",
            }
            for token in chunk
        ]
        try:
            resp = httpx.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
                timeout=15,
            )
            resp.raise_for_status()
            tickets = (resp.json() or {}).get("data") or []
        except Exception as e:
            logger.warning("Failed to send push notification: %s", e)
            continue
        for token, ticket in zip(chunk, tickets):
            if ticket.get("status") == "ok":
                delivered += 1
            elif (ticket.get("details") or {}).get("error") == "DeviceNotRegistered":
                dead.append(token)
            else:
                logger.warning("Push to %s rejected: %s", recipient_id, ticket.get("message"))

    if dead:
        try:
            supabase.table("push_tokens").delete().in_("token", dead).execute()
        except Exception as e:
            logger.warning("Could not remove stale push tokens: %s", e)
    return delivered


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
    if type not in NO_EMAIL_TYPES:
        send_notification_email(
            supabase,
            recipient_id=recipient_id,
            title=title,
            body=body,
        )


# In-app only: an email for these would be noise.
NO_EMAIL_TYPES = {"pdf_downloaded"}


def profile_label(supabase: Client, user_id: str) -> str:
    """'Full Name (email)' for admin messages; falls back to the id."""
    try:
        res = supabase.table("profiles").select("full_name,email,phone").eq("user_id", str(user_id)).limit(1).execute()
        row = (res.data or [{}])[0]
        name = row.get("full_name") or "A property manager"
        contact = row.get("email") if row.get("email") and not str(row.get("email")).endswith((".app", ".local")) else row.get("phone")
        return f"{name} ({contact})" if contact else name
    except Exception:
        return str(user_id)


def notify_admins(
    supabase: Client,
    *,
    type: str,
    title: str,
    body: str,
    metadata: dict | None = None,
) -> int:
    """Notify every super admin (in-app, push and email). Never raises.

    Admins previously received no notifications at all, so managers waiting
    for approval, new listings to review and payments went unnoticed.
    """
    try:
        res = supabase.table("profiles").select("user_id").eq("role", "super_admin").execute()
        admin_ids = [r["user_id"] for r in (res.data or []) if r.get("user_id")]
    except Exception as e:
        logger.warning("Could not look up admins for %s: %s", type, e)
        return 0

    sent = 0
    for admin_id in admin_ids:
        try:
            notify(supabase, recipient_id=str(admin_id), type=type, title=title, body=body, metadata=metadata)
            sent += 1
        except Exception as e:
            logger.warning("Admin notification %s to %s failed: %s", type, admin_id, e)
    return sent
