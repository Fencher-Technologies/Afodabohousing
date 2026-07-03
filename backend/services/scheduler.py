import logging
from datetime import date, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore[import-untyped]

from config import get_settings

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def _get_supabase_for_scheduler():
    from dependencies.database import get_service_client
    return get_service_client()


async def check_rent_reminders():
    """Check for upcoming rent due dates and send reminders."""
    try:
        supabase = _get_supabase_for_scheduler()
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        three_days = (date.today() + timedelta(days=3)).isoformat()

        payments = (
            supabase.table("payments")
            .select("id, lease_id, tenant_id, amount, due_date")
            .in_("status", ["pending", "failed"])
            .gte("due_date", tomorrow)
            .lte("due_date", three_days)
            .execute()
        )

        for payment in (payments.data or []):
            logger.info(
                "Rent reminder: payment %s of %.2f due on %s",
                payment.get("id"),
                payment.get("amount", 0),
                payment.get("due_date"),
            )
    except Exception as e:
        logger.error("Rent reminder check failed: %s", str(e), exc_info=True)


async def check_tenancy_expiry():
    """Check for leases expiring soon and log alerts."""
    try:
        supabase = _get_supabase_for_scheduler()
        next_month = (date.today() + timedelta(days=30)).isoformat()

        expiring = (
            supabase.table("leases")
            .select("id, property_id, tenant_id, end_date")
            .eq("status", "active")
            .lte("end_date", next_month)
            .execute()
        )

        for lease in (expiring.data or []):
            days_left = (date.fromisoformat(lease["end_date"]) - date.today()).days
            level = "CRITICAL" if days_left <= 7 else "WARNING"
            logger.info(
                "%s: Lease %s expires on %s (%d days)",
                level,
                lease.get("id"),
                lease.get("end_date"),
                days_left,
            )
    except Exception as e:
        logger.error("Tenancy expiry check failed: %s", str(e), exc_info=True)


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
