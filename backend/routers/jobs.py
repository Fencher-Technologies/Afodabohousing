"""Scheduled jobs, triggered from outside the server.

The in-process APScheduler only runs while this web service is awake. On
Render the service sleeps when idle and loses its timers, which is why rent
reminders silently stopped. Supabase (always on) now calls this endpoint on a
schedule with pg_cron, which also wakes the service.

The caller proves itself with the X-Cron-Secret header, checked against the
secret stored in the Supabase vault, so no extra environment variable is
needed here.
"""

import logging

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, status
from supabase import Client
from fastapi import Depends

from dependencies.database import get_service_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/jobs", tags=["internal"])

JOBS = {
    "rent_reminders": "check_rent_reminders",
    "tenancy_expiry": "check_tenancy_expiry",
    "boost_expiry": "check_boost_expiry",
}


async def _run_jobs(names: list[str]) -> None:
    import services.scheduler as scheduler_module

    for name in names:
        func = getattr(scheduler_module, JOBS[name])
        try:
            await func()
            logger.info("Scheduled job %s finished", name)
        except Exception:
            logger.exception("Scheduled job %s failed", name)


@router.post("/run", status_code=status.HTTP_202_ACCEPTED)
def run_jobs(
    background: BackgroundTasks,
    job: str | None = None,
    x_cron_secret: str = Header(default=""),
    supabase: Client = Depends(get_service_client),
) -> dict:
    """Run the scheduled jobs (all of them, or one named in ?job=)."""
    try:
        verified = supabase.rpc("verify_cron_secret", {"p_secret": x_cron_secret}).execute()
        ok = bool(verified.data)
    except Exception:
        logger.exception("Could not verify cron secret")
        ok = False
    if not ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid cron secret")

    names = [job] if job else list(JOBS)
    unknown = [n for n in names if n not in JOBS]
    if unknown:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown job: {unknown[0]}")

    # Answer at once: a cold-started Render service can take a while, and the
    # caller should not hold the connection open while the jobs run.
    background.add_task(_run_jobs, names)
    return {"accepted": names}
