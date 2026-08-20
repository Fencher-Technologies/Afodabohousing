from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timedelta, UTC
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import get_settings
from dependencies.database import get_service_client
from services import pesapal
from services.pesapal import PESAPAL_STATUS_MAP
from services.boost import get_boost_service
from services.subscriptions import get_subscription_service

# Table -> (id-column used to match a reference, human label)
TABLES = {
    "manager_subscriptions": {"ref_col": "payment_reference", "label": "subscription"},
    "property_boosts": {"ref_col": "transaction_id", "label": "boost"},
}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Backfill / reconcile pending Pesapal payments that a missed IPN left stranded. "
        "Reconciles every pending row that HAS a pesapal_tracking_id against the gateway (catches up "
        "lost webhooks). Rows WITHOUT a tracking id (created before the tracking-id migration) cannot "
        "be queried — report them, and optionally --fail-stale them, or --set-tracking after recovering "
        "the id from the Pesapal merchant dashboard."
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would change without writing anything.")
    parser.add_argument("--fail-stale", type=int, default=0, metavar="DAYS",
                        help="Mark untracked pending rows older than DAYS as failed (abandoned checkouts). "
                             "0 = leave them untouched.")
    parser.add_argument("--set-tracking", nargs=3, metavar=("TABLE", "REFERENCE", "TRACKING_ID"),
                        help="Attach a tracking id recovered from the Pesapal dashboard to a pending row, "
                             "then reconcile it. TABLE is manager_subscriptions or property_boosts; "
                             "REFERENCE is the payment_reference / transaction_id.")
    return parser


def _row_age_days(row: dict) -> int:
    created = row.get("created_at")
    if not created:
        return 0
    try:
        dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return 0
    return max(0, (datetime.now(UTC) - dt).days)


async def _reconcile(token: str, supabase, table: str, row: dict, dry_run: bool) -> str:
    """Mirror the on-demand reconcile in routers/payments.py for one row.
    Returns a short outcome label: completed / <terminal status> / pending / missing-tracking."""
    tracking = row.get("pesapal_tracking_id")
    if not tracking:
        return "missing-tracking"

    status_data = await pesapal.get_transaction_status(token, tracking)
    status = PESAPAL_STATUS_MAP.get(
        (status_data.get("payment_status_description") or "").upper(), "pending"
    )
    if status == "pending":
        return "pending"

    if status == "completed":
        amount = status_data.get("amount")
        outcome = "completed"
        if dry_run:
            return f"completed (would activate {TABLES[table]['label']})"
        if table == "manager_subscriptions":
            activated = get_subscription_service(supabase).confirm_subscription(
                row.get("payment_reference"), amount
            )
        else:
            activated = get_boost_service(supabase).activate_by_reference(
                row.get("transaction_id"), tracking, amount
            )
        if activated:
            # Persist the tracking id too, so future polls reconcile this row.
            supabase.table(table).update(
                {"pesapal_tracking_id": tracking}
            ).eq("id", row["id"]).execute()
            return outcome
        return "completed-noop"

    if dry_run:
        return f"would set status={status}"
    supabase.table(table).update({"status": status}).eq("id", row["id"]).eq("status", "pending").execute()
    return status


async def _reconcile_all(token: str, supabase, args) -> None:
    summary: dict[str, int] = {}
    untracked: list[tuple[str, dict]] = []

    for table, meta in TABLES.items():
        resp = (
            supabase.table(table)
            .select("*")
            .eq("status", "pending")
            .order("created_at", desc=True)
            .execute()
        )
        rows = resp.data or []
        for row in rows:
            outcome = await _reconcile(token, supabase, table, row, args.dry_run)
            summary[outcome] = summary.get(outcome, 0) + 1
            if outcome == "missing-tracking":
                untracked.append((table, row))

    label = "DRY-RUN (no writes)" if args.dry_run else "RESULT"
    print(f"== {label} ==")
    for k in sorted(summary):
        print(f"  {k:<18} {summary[k]}")
    print()

    if untracked:
        print(f"== {len(untracked)} pending row(s) WITHOUT a tracking id (unrecoverable via API) ==")
        now = datetime.now(UTC)
        for table, row in untracked:
            ref_col = TABLES[table]["ref_col"]
            age = _row_age_days(row)
            print(
                f"  {table} ref={row.get(ref_col)} created={row.get('created_at') or '?'} "
                f"({age}d old) — recover the id in the Pesapal dashboard and "
                f"`--set-tracking {table} {row.get(ref_col)} <id>`."
            )
            if args.fail_stale > 0 and age > args.fail_stale and not args.dry_run:
                supabase.table(table).update(
                    {"status": "failed", "payment_status": "failed"}
                ).eq("id", row["id"]).eq("status", "pending").execute()
                print(f"    -> marked failed (stale > {args.fail_stale}d).")


async def _set_tracking(token: str, supabase, args) -> None:
    table, reference, tracking_id = args.set_tracking
    if table not in TABLES:
        print(f"ERROR: unknown table `{table}`. Use manager_subscriptions or property_boosts.")
        sys.exit(1)
    ref_col = TABLES[table]["ref_col"]
    resp = (
        supabase.table(table)
        .select("*")
        .eq(ref_col, reference)
        .eq("status", "pending")
        .limit(1)
        .execute()
    )
    if not resp.data:
        print(f"ERROR: no pending {TABLES[table]['label']} with {ref_col}={reference}.")
        sys.exit(1)
    row = resp.data[0]

    if not args.dry_run:
        supabase.table(table).update({"pesapal_tracking_id": tracking_id}).eq("id", row["id"]).execute()
        row["pesapal_tracking_id"] = tracking_id
    outcome = await _reconcile(token, supabase, table, row, args.dry_run)
    print(f"Tracking id attached to {table} {reference}; reconcile outcome: {outcome}")


async def main() -> None:
    args = build_parser().parse_args()
    settings = get_settings()

    if not settings.pesapal_consumer_key or not settings.pesapal_consumer_secret:
        print("ERROR: PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET must be set in backend/.env")
        sys.exit(1)

    supabase = get_service_client()
    token = await pesapal.get_auth_token()

    if args.set_tracking:
        await _set_tracking(token, supabase, args)
    else:
        await _reconcile_all(token, supabase, args)


if __name__ == "__main__":
    asyncio.run(main())