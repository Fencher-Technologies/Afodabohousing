import logging
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore[import-untyped]

from config import get_settings
from services.email import email_endpoint as _email_endpoint
from services.crud import _compute_rent_financials
from services import notification_copy as copy

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()
TENANCY_EXPIRY_REMINDER_DAYS = {30, 14, 7, 1, 0}


def _get_supabase_for_scheduler():
    from dependencies.database import get_service_client
    return get_service_client()


async def _deliver_all_channels(
    dispatcher: Any,
    *,
    event_key: str,
    recipient_id: str | None,
    to_email: str | None,
    type: str,
    title: str,
    body: str,
    metadata: dict[str, Any],
) -> None:
    """In-app, email and push for one reminder; each channel sent at most once per event_key."""
    channels = []
    if recipient_id:
        channels.append("in_app")
    if to_email and not to_email.endswith((".app", ".local")):
        channels.append("email")
    if recipient_id:
        channels.append("push")

    for channel in channels:
        if await dispatcher.has_delivery(event_key, channel):
            continue
        try:
            if channel == "in_app":
                await dispatcher.send_in_app(
                    recipient_id=recipient_id, type=type, title=title, body=body, metadata=metadata
                )
                sent = True
            elif channel == "email":
                sent = await dispatcher.send_email(to_email=to_email, subject=title, body=body)
            else:
                sent = await dispatcher.send_push(recipient_id=recipient_id, title=title, body=body)
            await dispatcher.record_delivery(
                event_key=event_key, channel=channel, recipient_id=recipient_id,
                status="sent" if sent else "skipped",
            )
        except Exception as exc:
            await dispatcher.record_delivery(
                event_key=event_key, channel=channel, recipient_id=recipient_id,
                status="failed", error=str(exc),
            )
            logger.error("Rent reminder %s via %s failed: %s", event_key, channel, exc)


async def check_rent_reminders(supabase=None, today: date | None = None, dispatcher=None):
    """Rent reminders for tenants AND their property managers.

    * Tenant owes money (arrears > 0): the tenant is told their rent is due
      and the manager is told which tenant owes how much. Both are repeated
      every RENT_REMINDER_INTERVAL_DAYS (default 7) until it is paid.
    * Tenant is paid up but the next rent falls due within 3 days: the
      tenant gets a heads-up, once per rent period.

    Previously only tenants were reminded (managers never heard about
    arrears), and only inside a narrow window around the due date.
    Idempotent per lease / period / channel via notification_deliveries, so
    it is safe to run many times a day.
    """
    try:
        supabase = supabase or _get_supabase_for_scheduler()
        today = today or date.today()
        dispatcher = dispatcher or NotificationDispatcher(supabase)
        interval = max(1, int(getattr(get_settings(), "rent_reminder_interval_days", 7) or 7))
        period = today.toordinal() // interval

        leases = (
            supabase.table("leases")
            .select("id, owner_id, property_id, tenant_id, monthly_rent, status, start_date, end_date, rent_effective_date")
            .eq("status", "active")
            .execute()
        )

        tracked = [l for l in (leases.data or []) if l.get("rent_effective_date")]
        if not tracked:
            return

        lease_ids = [l["id"] for l in tracked]
        payments = (
            supabase.table("payments")
            .select("lease_id, payment_type, status, amount")
            .in_("lease_id", lease_ids)
            .execute()
        )
        payments_by_lease: dict[str, list[dict[str, Any]]] = {}
        for p in payments.data or []:
            payments_by_lease.setdefault(p.get("lease_id"), []).append(p)

        for lease in tracked:
            lease_id = lease["id"]
            tenant_id = lease.get("tenant_id")
            if not tenant_id:
                continue

            fin = _compute_rent_financials(
                lease.get("rent_effective_date"),
                payments_by_lease.get(lease_id, []),
                lease.get("monthly_rent"),
                start_date=lease.get("start_date"),
                end_date=lease.get("end_date"),
                today=today,
            )
            arrears = float(fin.get("arrears_amount") or 0)
            next_due = fin.get("next_payment_due_date")
            days_left = fin.get("rent_days_remaining")

            due_soon = (
                arrears <= 0
                and next_due is not None
                and days_left is not None
                and 0 <= int(days_left) <= 3
            )
            if arrears <= 0 and not due_soon:
                continue

            tenant = _fetch_single(supabase, "tenants", tenant_id) or {}
            ctx = copy.lease_context(supabase, lease)
            tenant_name = copy.first_name(tenant.get("first_name") or tenant.get("last_name"), ctx["tenant"])
            metadata = {
                "lease_id": lease_id,
                "property_id": lease.get("property_id"),
                "amount": arrears if arrears > 0 else lease.get("monthly_rent"),
                "next_payment_due_date": next_due,
                "days_until_due": _days_until(next_due, today) if next_due else None,
            }

            if arrears > 0:
                t_title, t_body = copy.rent_due_for_tenant(tenant_name, arrears, ctx["currency"], True, next_due)
                await _deliver_all_channels(
                    dispatcher,
                    event_key=f"rent_due:{lease_id}:{period}",
                    recipient_id=tenant.get("user_id"),
                    to_email=tenant.get("email"),
                    type="rent_reminder", title=t_title, body=t_body, metadata=metadata,
                )

                manager_id = lease.get("owner_id")
                if manager_id:
                    profile = copy._one(supabase, "profiles", "user_id", manager_id, "full_name,email")
                    m_title, m_body = copy.rent_due_for_manager(
                        copy.first_name(profile.get("full_name"), "there"),
                        tenant_name, ctx["place"], arrears, ctx["currency"],
                    )
                    await _deliver_all_channels(
                        dispatcher,
                        event_key=f"rent_due_manager:{lease_id}:{period}",
                        recipient_id=str(manager_id),
                        to_email=profile.get("email"),
                        type="tenant_rent_due", title=m_title, body=m_body,
                        metadata={**metadata, "tenant_id": tenant_id},
                    )
            else:
                t_title, t_body = copy.rent_due_for_tenant(
                    tenant_name, lease.get("monthly_rent"), ctx["currency"], False, next_due
                )
                await _deliver_all_channels(
                    dispatcher,
                    event_key=f"rent_due_soon:{lease_id}:{next_due}",
                    recipient_id=tenant.get("user_id"),
                    to_email=tenant.get("email"),
                    type="rent_reminder", title=t_title, body=t_body, metadata=metadata,
                )

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
        """Send one transactional email.

        Defaults to the Supabase `send-email` edge function, which holds the
        provider API key as a Supabase secret. That avoids needing any new
        backend environment variables: SUPABASE_URL and the service role key
        are already configured. Setting EMAIL_PROVIDER_URL and
        EMAIL_PROVIDER_API_KEY overrides this and posts to that provider
        directly instead.
        """
        url, auth_token = _email_endpoint(self.settings)
        if not url or not auth_token:
            logger.info("Email notification skipped; provider is not configured")
            return False

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {auth_token}"},
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
        """Push through Expo to the recipient's registered devices.

        Previously required PUSH_PROVIDER_URL / PUSH_PROVIDER_API_KEY, which
        were never set, so every scheduled reminder push was skipped.
        """
        import asyncio

        from services.notifications import send_push_notification

        reached = await asyncio.to_thread(
            send_push_notification,
            self.supabase,
            recipient_id=recipient_id,
            title=title,
            body=body,
        )
        return reached > 0


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


async def check_boost_expiry():
    """Expire boosts that have passed their expiry date."""
    try:
        supabase = _get_supabase_for_scheduler()
        from services.boost import BoostService
        svc = BoostService(supabase)
        count = svc.expire_old()
        if count > 0:
            logger.info("Expired %d boost(s)", count)
    except Exception as e:
        logger.error("Boost expiry check failed: %s", str(e), exc_info=True)


async def sync_geonames():
    """Monthly sync of country/region data from GeoNames dumps.

    Runs the sync_geonames.py script as a subprocess to avoid blocking
    the async event loop. Logs results to sync_history via the script.
    """
    try:
        script_path = Path(__file__).parent.parent / "scripts" / "sync_geonames.py"
        proc = subprocess.run(
            [sys.executable, str(script_path), "sync"],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if proc.returncode == 0:
            logger.info("GeoNames sync completed successfully")
        else:
            logger.error("GeoNames sync failed: %s", proc.stderr[-500:] if proc.stderr else "unknown")
    except subprocess.TimeoutExpired:
        logger.error("GeoNames sync timed out after 300s")
    except Exception as e:
        logger.error("GeoNames sync error: %s", str(e), exc_info=True)


def start_scheduler():
    settings = get_settings()
    logging.getLogger("apscheduler.scheduler").setLevel(logging.WARNING)
    if not scheduler.running:
        scheduler.start()
    if settings.environment == "production":
        scheduler.add_job(check_rent_reminders, "cron", hour=8, minute=0, replace_existing=True)
        scheduler.add_job(check_tenancy_expiry, "cron", hour=6, minute=0, replace_existing=True)
        scheduler.add_job(check_boost_expiry, "cron", hour=6, minute=30, replace_existing=True)
        scheduler.add_job(sync_geonames, "cron", day=1, hour=3, minute=0, replace_existing=True)
    else:
        scheduler.add_job(check_rent_reminders, "interval", hours=6, replace_existing=True)
        scheduler.add_job(check_tenancy_expiry, "interval", hours=12, replace_existing=True)
        scheduler.add_job(check_boost_expiry, "interval", hours=12, replace_existing=True)
        scheduler.add_job(sync_geonames, "interval", hours=24 * 30, replace_existing=True)
    logger.info("Background scheduler started")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")
