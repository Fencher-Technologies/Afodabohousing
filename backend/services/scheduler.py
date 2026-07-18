import logging
from datetime import date, timedelta
from typing import Any

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore[import-untyped]

from config import get_settings

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()
TENANCY_EXPIRY_REMINDER_DAYS = {30, 14, 7, 1, 0}


def _get_supabase_for_scheduler():
    from dependencies.database import get_service_client
    return get_service_client()


async def check_rent_reminders():
    """Check for upcoming rent due dates and send reminders."""
    try:
        supabase = _get_supabase_for_scheduler()
        dispatcher = NotificationDispatcher(supabase)
        today = date.today()
        tomorrow = (today + timedelta(days=1)).isoformat()
        three_days = (today + timedelta(days=3)).isoformat()

        payments = (
            supabase.table("payments")
            .select("id, lease_id, tenant_id, amount, due_date")
            .in_("status", ["pending", "failed"])
            .gte("due_date", tomorrow)
            .lte("due_date", three_days)
            .execute()
        )

        for payment in (payments.data or []):
            payment_id = payment["id"]
            amount = payment.get("amount", 0)
            due_date = payment.get("due_date", "")
            lease_id = payment.get("lease_id")
            tenant_id = payment.get("tenant_id")

            if not lease_id or not tenant_id:
                continue

            days_until_due = _days_until(due_date, today)

            lease = _fetch_single(supabase, "leases", lease_id)
            if not lease:
                continue

            prop = _fetch_single(supabase, "properties", lease.get("property_id"))
            tenant = _fetch_single(supabase, "tenants", tenant_id)
            if not tenant:
                continue

            recipient_id = tenant.get("user_id")
            to_email = tenant.get("email")
            property_title = prop.get("title") if prop else None

            if days_until_due == 1:
                title = "Rent due tomorrow"
                body = (
                    f"Your rent of UGX {amount:,.0f} is due tomorrow ({due_date}). "
                    "Please make your payment to avoid any inconvenience."
                )
            else:
                title = f"Rent due in {days_until_due} days"
                body = (
                    f"Your rent of UGX {amount:,.0f} is due on {due_date} "
                    f"({days_until_due} days away). "
                    "Please make your payment on time."
                )

            property_suffix = f" for {property_title}" if property_title else ""
            body += property_suffix

            event_key = f"rent_reminder:{payment_id}:{days_until_due}"
            metadata = {
                "payment_id": payment_id,
                "lease_id": lease_id,
                "property_id": lease.get("property_id"),
                "amount": amount,
                "due_date": due_date,
                "days_until_due": days_until_due,
            }

            if recipient_id and not await dispatcher.has_delivery(event_key, "in_app"):
                try:
                    await dispatcher.send_in_app(
                        recipient_id=recipient_id,
                        type="rent_reminder",
                        title=title,
                        body=body,
                        metadata=metadata,
                    )
                    await dispatcher.record_delivery(
                        event_key=event_key,
                        channel="in_app",
                        recipient_id=recipient_id,
                        status="sent",
                    )
                except Exception as exc:
                    await dispatcher.record_delivery(
                        event_key=event_key,
                        channel="in_app",
                        recipient_id=recipient_id,
                        status="failed",
                        error=str(exc),
                    )
                    logger.error("Failed to create rent reminder notification: %s", exc)

            if to_email and not await dispatcher.has_delivery(event_key, "email"):
                try:
                    sent = await dispatcher.send_email(to_email=to_email, subject=title, body=body)
                    await dispatcher.record_delivery(
                        event_key=event_key,
                        channel="email",
                        recipient_id=recipient_id,
                        status="sent" if sent else "skipped",
                    )
                except Exception as exc:
                    await dispatcher.record_delivery(
                        event_key=event_key,
                        channel="email",
                        recipient_id=recipient_id,
                        status="failed",
                        error=str(exc),
                    )
                    logger.error("Failed to send rent reminder email: %s", exc)

            if recipient_id and not await dispatcher.has_delivery(event_key, "push"):
                try:
                    sent = await dispatcher.send_push(recipient_id=recipient_id, title=title, body=body)
                    await dispatcher.record_delivery(
                        event_key=event_key,
                        channel="push",
                        recipient_id=recipient_id,
                        status="sent" if sent else "skipped",
                    )
                except Exception as exc:
                    await dispatcher.record_delivery(
                        event_key=event_key,
                        channel="push",
                        recipient_id=recipient_id,
                        status="failed",
                        error=str(exc),
                    )
                    logger.error("Failed to send rent reminder push: %s", exc)

    except Exception as e:
        logger.error("Rent reminder check failed: %s", str(e), exc_info=True)


async def check_tenancy_expiry():
    """Check for leases expiring at reminder milestones and notify tenants."""
    try:
        supabase = _get_supabase_for_scheduler()
        sent_count = await process_tenancy_expiry_reminders(supabase, today=date.today())
        logger.info("Tenancy expiry reminder check completed: %d deliveries attempted", sent_count)
    except Exception as e:
        logger.error("Tenancy expiry check failed: %s", str(e), exc_info=True)


class NotificationDispatcher:
    def __init__(self, supabase: Any):
        self.supabase = supabase
        self.settings = get_settings()

    async def has_delivery(self, event_key: str, channel: str) -> bool:
        response = (
            self.supabase.table("notification_deliveries")
            .select("id")
            .eq("event_key", event_key)
            .eq("channel", channel)
            .execute()
        )
        return bool(response.data)

    async def record_delivery(
        self,
        *,
        event_key: str,
        channel: str,
        recipient_id: str | None,
        status: str,
        error: str | None = None,
    ) -> None:
        self.supabase.table("notification_deliveries").insert({
            "event_key": event_key,
            "channel": channel,
            "recipient_id": recipient_id,
            "status": status,
            "error": error,
        }).execute()

    async def send_in_app(
        self,
        *,
        recipient_id: str,
        type: str = "tenancy_expiry",
        title: str,
        body: str,
        metadata: dict[str, Any],
    ) -> None:
        self.supabase.table("notifications").insert({
            "recipient_id": recipient_id,
            "type": type,
            "title": title,
            "body": body,
            "metadata": metadata,
        }).execute()

    async def send_email(self, *, to_email: str, subject: str, body: str) -> bool:
        if not self.settings.email_provider_url or not self.settings.email_provider_api_key:
            logger.info("Email notification skipped; provider is not configured")
            return False

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                self.settings.email_provider_url,
                headers={"Authorization": f"Bearer {self.settings.email_provider_api_key}"},
                json={
                    "from": self.settings.email_from_address,
                    "to": to_email,
                    "subject": subject,
                    "text": body,
                },
            )
            response.raise_for_status()
        return True

    async def send_push(self, *, recipient_id: str, title: str, body: str) -> bool:
        if not self.settings.push_provider_url or not self.settings.push_provider_api_key:
            logger.info("Push notification skipped; provider is not configured")
            return False

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                self.settings.push_provider_url,
                headers={"Authorization": f"Bearer {self.settings.push_provider_api_key}"},
                json={
                    "recipient_id": recipient_id,
                    "title": title,
                    "body": body,
                },
            )
            response.raise_for_status()
        return True


def _days_until(end_date: str, today: date) -> int:
    return (date.fromisoformat(end_date) - today).days


def _reminder_copy(days_left: int, property_title: str | None, end_date: str) -> tuple[str, str]:
    subject_property = property_title or "your tenancy"
    if days_left == 0:
        title = "Your tenancy expires today"
        body = (
            f"{subject_property} expires today ({end_date}). "
            "Please contact your house manager to renew or arrange move-out."
        )
    elif days_left == 1:
        title = "Your tenancy expires tomorrow"
        body = (
            f"{subject_property} expires tomorrow ({end_date}). "
            "Please contact your house manager to renew or arrange move-out."
        )
    else:
        title = f"Your tenancy expires in {days_left} days"
        body = (
            f"{subject_property} expires on {end_date}, in {days_left} days. "
            "Please contact your house manager to renew or arrange move-out."
        )
    return title, body


def _fetch_single(supabase: Any, table: str, record_id: str) -> dict[str, Any] | None:
    response = supabase.table(table).select("*").eq("id", record_id).execute()
    return response.data[0] if response.data else None


async def _deliver_tenancy_expiry_reminder(
    *,
    dispatcher: NotificationDispatcher,
    lease: dict[str, Any],
    tenant: dict[str, Any] | None,
    prop: dict[str, Any] | None,
    days_left: int,
) -> int:
    lease_id = lease["id"]
    event_key = f"lease_expiry:{lease_id}:{days_left}"
    recipient_id = tenant.get("user_id") if tenant else None
    to_email = tenant.get("email") if tenant else None
    property_title = prop.get("title") if prop else None
    title, body = _reminder_copy(days_left, property_title, lease["end_date"])
    metadata = {
        "lease_id": lease_id,
        "property_id": lease.get("property_id"),
        "tenant_id": lease.get("tenant_id"),
        "end_date": lease.get("end_date"),
        "days_left": days_left,
    }
    attempted = 0

    if recipient_id and not await dispatcher.has_delivery(event_key, "in_app"):
        try:
            await dispatcher.send_in_app(
                recipient_id=recipient_id,
                title=title,
                body=body,
                metadata=metadata,
            )
            await dispatcher.record_delivery(
                event_key=event_key,
                channel="in_app",
                recipient_id=recipient_id,
                status="sent",
            )
            attempted += 1
        except Exception as exc:
            await dispatcher.record_delivery(
                event_key=event_key,
                channel="in_app",
                recipient_id=recipient_id,
                status="failed",
                error=str(exc),
            )
            logger.error("Failed to create in-app tenancy expiry notification: %s", exc)

    if to_email and not await dispatcher.has_delivery(event_key, "email"):
        try:
            sent = await dispatcher.send_email(to_email=to_email, subject=title, body=body)
            await dispatcher.record_delivery(
                event_key=event_key,
                channel="email",
                recipient_id=recipient_id,
                status="sent" if sent else "skipped",
            )
            attempted += 1
        except Exception as exc:
            await dispatcher.record_delivery(
                event_key=event_key,
                channel="email",
                recipient_id=recipient_id,
                status="failed",
                error=str(exc),
            )
            logger.error("Failed to send tenancy expiry email: %s", exc)

    if recipient_id and not await dispatcher.has_delivery(event_key, "push"):
        try:
            sent = await dispatcher.send_push(recipient_id=recipient_id, title=title, body=body)
            await dispatcher.record_delivery(
                event_key=event_key,
                channel="push",
                recipient_id=recipient_id,
                status="sent" if sent else "skipped",
            )
            attempted += 1
        except Exception as exc:
            await dispatcher.record_delivery(
                event_key=event_key,
                channel="push",
                recipient_id=recipient_id,
                status="failed",
                error=str(exc),
            )
            logger.error("Failed to send tenancy expiry push notification: %s", exc)

    return attempted


async def process_tenancy_expiry_reminders(
    supabase: Any,
    *,
    today: date,
    dispatcher: NotificationDispatcher | None = None,
) -> int:
    """Send tenancy expiry reminders for 30, 14, 7, 1, and 0 day milestones."""
    window_end = today + timedelta(days=max(TENANCY_EXPIRY_REMINDER_DAYS))
    response = (
        supabase.table("leases")
        .select("id, owner_id, property_id, tenant_id, end_date, status")
        .eq("status", "active")
        .gte("end_date", today.isoformat())
        .lte("end_date", window_end.isoformat())
        .execute()
    )
    dispatcher = dispatcher or NotificationDispatcher(supabase)
    attempted = 0

    for lease in response.data or []:
        days_left = _days_until(lease["end_date"], today)
        if days_left not in TENANCY_EXPIRY_REMINDER_DAYS:
            continue

        tenant = _fetch_single(supabase, "tenants", lease["tenant_id"])
        prop = _fetch_single(supabase, "properties", lease["property_id"])
        attempted += await _deliver_tenancy_expiry_reminder(
            dispatcher=dispatcher,
            lease=lease,
            tenant=tenant,
            prop=prop,
            days_left=days_left,
        )

    return attempted


def start_scheduler():
    settings = get_settings()
    if settings.environment == "production":
        scheduler.add_job(check_rent_reminders, "cron", hour=8, minute=0)
        scheduler.add_job(check_tenancy_expiry, "cron", hour=6, minute=0)
    else:
        scheduler.add_job(check_rent_reminders, "interval", hours=6)
        scheduler.add_job(check_tenancy_expiry, "interval", hours=12)
    scheduler.start()
    logger.info("Background scheduler started")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")
