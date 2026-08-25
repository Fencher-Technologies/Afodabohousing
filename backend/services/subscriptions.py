import logging
import time
from datetime import UTC, datetime, timedelta

from supabase import Client

from models.subscription import (
    ManagerSubscriptionResponse,
    SubscriptionPlanResponse,
)

logger = logging.getLogger(__name__)

# Plans are low-churn reference rows queried on every guard/initiate/current-sub
# call. Cache them briefly; the only writes are direct DB edits, and 60s of
# staleness is invisible for pricing display.
_PLANS_TTL = 60.0
_plans_cache: dict[str, object] = {"at": 0.0, "data": []}


def _all_plans(supabase: Client) -> list[dict]:
    now = time.monotonic()
    if _plans_cache["data"] and now - _plans_cache["at"] < _PLANS_TTL:
        return _plans_cache["data"]
    result = supabase.table("subscription_plans").select("*").execute()
    _plans_cache["data"] = result.data or []
    _plans_cache["at"] = now
    return _plans_cache["data"]


def reset_plans_cache() -> None:
    _plans_cache["data"] = []
    _plans_cache["at"] = 0.0


def get_subscription_service(supabase: Client) -> "SubscriptionService":
    return SubscriptionService(supabase)


class SubscriptionService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def get_active_plans(self) -> list[SubscriptionPlanResponse]:
        rows = [r for r in _all_plans(self.supabase) if r.get("is_active") is True]
        rows.sort(key=lambda r: r.get("sort_order") or 0)
        return [SubscriptionPlanResponse(**row) for row in rows]

    def get_plan(self, plan_id: str) -> dict | None:
        for row in _all_plans(self.supabase):
            if str(row.get("id")) == str(plan_id):
                return row
        return None

    def get_current_subscription(self, manager_id: str) -> ManagerSubscriptionResponse | None:
        raw = self.get_current_subscription_raw(manager_id)
        if raw is None:
            return None
        return self.to_response(raw)

    def get_current_subscription_raw(self, manager_id: str) -> dict | None:
        result = (
            self.supabase.table("manager_subscriptions")
            .select("*")
            .eq("manager_id", manager_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        return result.data[0]

    def to_response(self, sub: dict) -> ManagerSubscriptionResponse:
        plan = self.get_plan(sub["plan_id"])
        plan_name = plan["name"] if plan else sub["plan_id"]

        now = datetime.now(UTC)
        expires_dt = None
        raw_expires = sub.get("expires_at")
        if raw_expires:
            try:
                expires_dt = (
                    raw_expires
                    if isinstance(raw_expires, datetime)
                    else datetime.fromisoformat(str(raw_expires).replace("Z", "+00:00"))
                )
            except (TypeError, ValueError):
                expires_dt = None

        st = sub["status"]
        if st == "active" and expires_dt and expires_dt <= now:
            st = "expired"

        days_remaining = 0
        if st == "active" and expires_dt:
            remaining = expires_dt - now
            days_remaining = max(0, remaining.days)

        return ManagerSubscriptionResponse(
            id=str(sub["id"]),
            manager_id=str(sub["manager_id"]),
            plan_id=sub["plan_id"],
            plan_name=plan_name,
            status=st,
            started_at=sub.get("started_at"),
            expires_at=sub.get("expires_at"),
            auto_renew=sub.get("auto_renew", True),
            payment_reference=sub.get("payment_reference"),
            payment_status=sub.get("payment_status", "pending"),
            days_remaining=days_remaining,
        )

    def confirm_subscription(self, payment_reference: str, paid_amount: float | None = None) -> dict | None:
        result = (
            self.supabase.table("manager_subscriptions")
            .select("*")
            .eq("payment_reference", payment_reference)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None

        sub = result.data[0]

        # Idempotency: a replayed webhook must not re-extend the subscription.
        if sub.get("status") == "active":
            return self.get_current_subscription(sub["manager_id"])

        plan = self.get_plan(sub["plan_id"])
        if not plan:
            return None

        # Amount verification: accept either UGX or USD plan price (dual-currency checkout).
        # Pesapal forwards amount in the currency submitted; we check both.
        if paid_amount is not None:
            ugx = float(plan["price_ugx"])
            usd = float(plan.get("price_usd") or 0)
            if abs(float(paid_amount) - ugx) > 1.0 and abs(float(paid_amount) - usd) > 0.05:
                now = datetime.now(UTC)
                logger.warning(
                    "Subscription %s amount mismatch: paid=%s expected UGX=%s USD=%s",
                    sub["id"], paid_amount, ugx, usd,
                )
                self.supabase.table("manager_subscriptions").update(
                    {"status": "failed", "payment_status": "failed", "updated_at": now.isoformat()}
                ).eq("id", sub["id"]).eq("status", "pending").execute()
                return None

        duration_days = plan["duration_days"]
        now = datetime.now(UTC)

        sub_payload = {
            "status": "active",
            "payment_status": "completed",
            "started_at": now.isoformat(),
            "expires_at": (now + timedelta(days=duration_days)).isoformat(),
            "updated_at": now.isoformat(),
        }

        self.supabase.table("manager_subscriptions").update(sub_payload).eq(
            "id", sub["id"]
        ).eq("status", "pending").execute()

        return self.get_current_subscription(sub["manager_id"])

    def expire_subscriptions(self) -> int:
        now = datetime.now(UTC).isoformat()
        result = (
            self.supabase.table("manager_subscriptions")
            .update({"status": "expired", "updated_at": now})
            .eq("status", "active")
            .lt("expires_at", now)
            .execute()
        )
        return len(result.data) if result.data else 0
