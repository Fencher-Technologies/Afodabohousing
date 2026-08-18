import logging
from datetime import UTC, datetime, timedelta

from supabase import Client

from models.subscription import (
    ManagerSubscriptionResponse,
    SubscriptionPlanResponse,
)

logger = logging.getLogger(__name__)


def get_subscription_service(supabase: Client) -> "SubscriptionService":
    return SubscriptionService(supabase)


class SubscriptionService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def get_active_plans(self) -> list[SubscriptionPlanResponse]:
        result = (
            self.supabase.table("subscription_plans")
            .select("*")
            .eq("is_active", True)
            .order("sort_order")
            .execute()
        )
        return [SubscriptionPlanResponse(**row) for row in result.data]

    def get_plan(self, plan_id: str) -> dict | None:
        result = (
            self.supabase.table("subscription_plans")
            .select("*")
            .eq("id", plan_id)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_current_subscription(self, manager_id: str) -> ManagerSubscriptionResponse | None:
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

        sub = result.data[0]
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

        status = sub["status"]
        if status == "active" and expires_dt and expires_dt <= now:
            status = "expired"

        days_remaining = 0
        if status == "active" and expires_dt:
            remaining = expires_dt - now
            days_remaining = max(0, remaining.days)

        return ManagerSubscriptionResponse(
            id=str(sub["id"]),
            manager_id=str(sub["manager_id"]),
            plan_id=sub["plan_id"],
            plan_name=plan_name,
            status=status,
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

        # Amount verification: only the exact plan price activates the sub.
        if paid_amount is not None:
            expected = float(plan["price_ugx"])
            if abs(float(paid_amount) - expected) > 1.0:
                now = datetime.now(UTC)
                logger.warning(
                    "Subscription %s amount mismatch: paid=%s expected=%s",
                    sub["id"], paid_amount, expected,
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
