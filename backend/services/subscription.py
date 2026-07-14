import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from supabase import Client

from models.subscription import SubscriptionResponse, SubscriptionStats
from services.base import BaseService, with_retry

logger = logging.getLogger(__name__)

PLAN_DURATIONS = {
    "3mo": 90,
    "6mo": 180,
    "12mo": 365,
}


class SubscriptionService(BaseService):
    def __init__(self, supabase: Client):
        super().__init__(supabase)
        self._table = "manager_subscriptions"

    @with_retry
    def create_pending(self, manager_id: UUID, plan_type: str, amount_paid: Decimal, reference: str) -> dict:
        now = datetime.now(timezone.utc)
        days = PLAN_DURATIONS.get(plan_type, 90)
        expires = now + timedelta(days=days)
        payload = {
            "manager_id": str(manager_id),
            "plan_type": plan_type,
            "status": "pending",
            "start_date": now.isoformat(),
            "expiry_date": expires.isoformat(),
            "amount_paid": str(amount_paid),
            "transaction_id": reference,
            "payment_method": "nylonpay",
        }
        result = self.table.insert(payload).execute()
        return result.data[0]

    @with_retry
    def activate_by_reference(self, reference: str, txn_id: str) -> dict | None:
        result = (
            self.table.update({"status": "active", "transaction_id": txn_id})
            .eq("transaction_id", reference)
            .eq("status", "pending")
            .execute()
        )
        return result.data[0] if result.data else None

    @with_retry
    def get_by_id(self, sub_id: UUID) -> dict | None:
        result = self.table.select("*").eq("id", str(sub_id)).execute()
        return result.data[0] if result.data else None

    @with_retry
    def get_by_manager(self, manager_id: UUID) -> dict | None:
        result = (
            self.table.select("*")
            .eq("manager_id", str(manager_id))
            .order("created_at", desc=True)
            .execute()
        )
        return result.data[0] if result.data else None

    @with_retry
    def is_active(self, manager_id: UUID) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        result = (
            self.table.select("id", count="exact")
            .eq("manager_id", str(manager_id))
            .eq("status", "active")
            .gt("expiry_date", now)
            .execute()
        )
        return (result.count if hasattr(result, "count") else len(result.data or [])) > 0

    @with_retry
    def get_all(self, skip: int = 0, limit: int = 100) -> tuple[list[dict], int]:
        count_resp = self.supabase.table(self._table).select("*", count="exact").execute()
        total = count_resp.count if hasattr(count_resp, "count") else 0
        result = (
            self.table.select("*")
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return result.data or [], total

    @with_retry
    def expire_old(self) -> int:
        now = datetime.now(timezone.utc).isoformat()
        result = (
            self.table.update({"status": "expired"})
            .eq("status", "active")
            .lt("expiry_date", now)
            .execute()
        )
        return len(result.data or [])

    @with_retry
    def cancel(self, sub_id: UUID) -> bool:
        result = (
            self.table.update({"status": "cancelled"})
            .eq("id", str(sub_id))
            .execute()
        )
        return bool(result.data)

    @with_retry
    def get_stats(self) -> SubscriptionStats:
        now = datetime.now(timezone.utc).isoformat()
        all_subs = self.supabase.table(self._table).select("*").execute()
        data = all_subs.data or []

        total = len(data)
        active = sum(1 for s in data if s.get("status") == "active" and s.get("expiry_date", "") > now)
        revenue = sum(float(s.get("amount_paid", 0) or 0) for s in data)
        breakdown = {}
        for s in data:
            pt = s.get("plan_type", "unknown")
            breakdown[pt] = breakdown.get(pt, 0) + 1

        return SubscriptionStats(
            active_subscriptions=active,
            total_subscriptions=total,
            total_revenue=round(revenue, 2),
            plan_breakdown=breakdown,
        )


def get_subscription_service(supabase: Client) -> SubscriptionService:
    return SubscriptionService(supabase)
