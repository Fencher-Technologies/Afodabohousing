import logging
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from supabase import Client

from models.boost import BoostCreate, BoostStats
from services.base import BaseService, with_retry

logger = logging.getLogger(__name__)

def get_boost_packages(supabase: Client) -> list[dict]:
    """Return active boost packages from the database, ordered for display."""
    result = (
        supabase.table("boost_packages")
        .select("*")
        .eq("is_active", True)
        .order("sort_order")
        .execute()
    )
    return result.data or []


def get_boost_package(supabase: Client, duration_days: int) -> dict | None:
    """Return the active package matching a duration, or None if it does not exist."""
    result = (
        supabase.table("boost_packages")
        .select("*")
        .eq("days", duration_days)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def calculate_boost_price(supabase: Client, duration_days: int) -> Decimal:
    """Return the authoritative UGX price for a boost duration from the database."""
    pkg = get_boost_package(supabase, duration_days)
    if not pkg:
        raise ValueError(f"Invalid boost duration: {duration_days}")
    return Decimal(str(pkg["price_ugx"]))


class BoostService(BaseService):
    def __init__(self, supabase: Client):
        super().__init__(supabase)
        self._table = "property_boosts"

    # ── CRUD ──

    @with_retry
    def create(self, data: BoostCreate, manager_id: UUID) -> dict:
        now = datetime.now(UTC)
        expires = now + timedelta(days=data.duration_days)
        payload = {
            "property_id": str(data.property_id),
            "manager_id": str(manager_id),
            "amount_paid": str(data.amount_paid),
            "duration_days": data.duration_days,
            "started_at": now.isoformat(),
            "expires_at": expires.isoformat(),
            "status": "active",
        }
        result = self.table.insert(payload).execute()
        return result.data[0]

    @with_retry
    def create_pending(self, data: BoostCreate, manager_id: UUID, transaction_id: str, payment_method: str) -> dict:
        now = datetime.now(UTC)
        expires = now + timedelta(days=data.duration_days)
        payload = {
            "property_id": str(data.property_id),
            "manager_id": str(manager_id),
            "amount_paid": str(data.amount_paid),
            "duration_days": data.duration_days,
            "started_at": now.isoformat(),
            "expires_at": expires.isoformat(),
            "status": "pending",
            "transaction_id": transaction_id,
            "payment_method": payment_method,
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
    def get_by_id(self, boost_id: UUID) -> dict | None:
        result = self.table.select("*").eq("id", str(boost_id)).execute()
        return result.data[0] if result.data else None

    @with_retry
    def get_all(
        self, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict], int]:
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
    def get_by_manager(
        self, manager_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict], int]:
        count_resp = (
            self.supabase.table(self._table)
            .select("*", count="exact")
            .eq("manager_id", str(manager_id))
            .execute()
        )
        total = count_resp.count if hasattr(count_resp, "count") else 0
        result = (
            self.table.select("*")
            .eq("manager_id", str(manager_id))
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return result.data or [], total

    @with_retry
    def cancel(self, boost_id: UUID) -> bool:
        result = (
            self.table.update({"status": "cancelled"})
            .eq("id", str(boost_id))
            .execute()
        )
        return bool(result.data)

    @with_retry
    def expire_old(self) -> int:
        """Sweep expired boosts to 'expired' status. Returns count expired."""
        now = datetime.now(UTC).isoformat()
        result = (
            self.table.update({"status": "expired"})
            .eq("status", "active")
            .lt("expires_at", now)
            .execute()
        )
        return len(result.data or [])

    @with_retry
    def get_stats(self) -> BoostStats:
        now = datetime.now(UTC).isoformat()
        all_boosts = self.supabase.table(self._table).select("*").execute()
        data = all_boosts.data or []

        total = len(data)
        active = sum(1 for b in data if b.get("status") == "active" and b.get("expires_at", "") > now)
        revenue = sum(float(b.get("amount_paid", 0) or 0) for b in data)
        avg = round(revenue / total, 2) if total > 0 else 0

        return BoostStats(
            active_boosts=active,
            total_boosts=total,
            total_revenue=round(revenue, 2),
            avg_boost_price=avg,
        )

    # ── Packages ──

    def get_packages(self) -> list[dict]:
        return get_boost_packages(self.supabase)

    # ── Ranking ──

    @with_retry
    def get_active_boost_by_property_id(self, property_id: str) -> dict | None:
        now = datetime.now(UTC).isoformat()
        result = (
            self.supabase.table(self._table)
            .select("*")
            .eq("property_id", property_id)
            .eq("status", "active")
            .gt("expires_at", now)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    @with_retry
    def get_active_boosted_property_ids(self) -> set[str]:
        """Return set of property_ids that have active (non-expired) boosts."""
        now = datetime.now(UTC).isoformat()
        result = (
            self.supabase.table(self._table)
            .select("property_id")
            .eq("status", "active")
            .gt("expires_at", now)
            .execute()
        )
        return {r["property_id"] for r in (result.data or []) if r.get("property_id")}

    @with_retry
    def get_active_boost_details(self) -> dict[str, dict]:
        """Return dict of property_id → boost details for all active boosts."""
        now = datetime.now(UTC).isoformat()
        result = (
            self.supabase.table(self._table)
            .select("*")
            .eq("status", "active")
            .gt("expires_at", now)
            .execute()
        )
        details: dict[str, dict] = {}
        for b in (result.data or []):
            pid = b.get("property_id")
            if pid:
                details[pid] = {
                    "is_boosted": True,
                    "boosted_until": b.get("expires_at"),
                    "boost_started_at": b.get("started_at"),
                    "boost_duration_days": b.get("duration_days"),
                    "boost_package_label": f"{b.get('duration_days')} Days",
                    "boost_amount_paid": b.get("amount_paid"),
                }
        return details


def get_boost_service(supabase: Client) -> BoostService:
    return BoostService(supabase)
