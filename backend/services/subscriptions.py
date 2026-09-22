import logging
import math
import time
from datetime import UTC, datetime, timedelta

from supabase import Client

from models.subscription import (
    ManagerSubscriptionResponse,
    SubscriptionPlanResponse,
)

logger = logging.getLogger(__name__)

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


def _now() -> datetime:
    return datetime.now(UTC)


def _derive_status(expires_at: str | None, stored_status: str) -> str:
    if stored_status != "active":
        return stored_status
    if expires_at is None:
        return "expired"
    expires_dt = _parse_iso(expires_at)
    if expires_dt is None:
        return stored_status
    if expires_dt <= _now():
        return "expired"
    return "active"


def _parse_iso(raw: str) -> datetime | None:
    try:
        return raw if isinstance(raw, datetime) else datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def get_current_subscription_raw(supabase: Client, manager_id: str) -> dict | None:
    """Single source of truth for a manager's current subscription.

    Rules:
      - A row counts as active ONLY if status == 'active' AND expires_at > now().
      - If several qualify, the current one is the LATEST expires_at.
      - Never trusts stored status alone.
    """
    now = _now()
    try:
        rows = (
            supabase.table("manager_subscriptions")
            .select("*")
            .eq("manager_id", manager_id)
            .execute()
        )
        data = rows.data or []
    except Exception:
        logger.warning("Failed to fetch subscriptions for %s", manager_id, exc_info=True)
        return None

    qualifying = []
    for row in data:
        expires_at = row.get("expires_at")
        expires_dt = _parse_iso(expires_at) if expires_at else None
        if expires_dt and expires_dt > now:
            qualifying.append(row)

    if not qualifying:
        return None

    qualifying.sort(key=lambda r: _parse_iso(r.get("expires_at")) or datetime.min.replace(tzinfo=UTC), reverse=True)
    return qualifying[0]


def derive_subscription(sub: dict, plan_name: str) -> dict:
    """Return the row plus derived: is_active, days_remaining, derived_status."""
    now = _now()
    expires_at = sub.get("expires_at")
    expires_dt = _parse_iso(expires_at)
    stored_status = sub["status"]
    is_active = stored_status == "active" and expires_dt is not None and expires_dt > now

    days_remaining = 0
    if is_active and expires_dt:
        remaining = expires_dt - now
        days_remaining = max(0, math.ceil(remaining.total_seconds() / 86400))

    return {
        **sub,
        "is_active": is_active,
        "days_remaining": days_remaining,
        "derived_status": "active" if is_active else "expired",
        "plan_name": plan_name,
    }


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

    def _get_plan(self, plan_id: str) -> dict | None:
        return self.get_plan(plan_id)

    def get_current_subscription(self, manager_id: str) -> ManagerSubscriptionResponse | None:
        raw = get_current_subscription_raw(self.supabase, manager_id)
        if raw is None:
            return None
        return self.to_response(raw)

    def to_response(self, sub: dict) -> ManagerSubscriptionResponse:
        plan = self._get_plan(sub["plan_id"])
        plan_name = plan["name"] if plan else sub["plan_id"]

        derived = derive_subscription(sub, plan_name)

        return ManagerSubscriptionResponse(
            id=str(sub["id"]),
            manager_id=str(sub["manager_id"]),
            plan_id=sub["plan_id"],
            plan_name=plan_name,
            status=derived["derived_status"],
            started_at=sub.get("started_at"),
            expires_at=sub.get("expires_at"),
            auto_renew=sub.get("auto_renew", True),
            payment_reference=sub.get("payment_reference"),
            payment_status=sub.get("payment_status", "pending"),
            days_remaining=derived["days_remaining"],
        )

    def get_property_quota(self, manager_id: str) -> dict:
        used = 0
        try:
            res = (
                self.supabase.table("properties")
                .select("id", count="exact")
                .eq("owner_id", str(manager_id))
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
            used = res.count if res.count is not None else len(res.data or [])
        except Exception:
            logger.warning("Property quota count failed for %s", manager_id, exc_info=True)

        sub = self.get_current_subscription(str(manager_id))
        if sub is None or sub.status != "active":
            return {
                "properties_used": used,
                "max_properties": 0,
                "can_add_property": False,
                "plan_id": None,
                "plan_name": None,
                "has_active_subscription": False,
            }
        plan = self._get_plan(sub.plan_id) or {}
        limit = plan.get("max_properties")
        return {
            "properties_used": used,
            "max_properties": limit,
            "can_add_property": True if limit is None else used < int(limit),
            "plan_id": sub.plan_id,
            "plan_name": sub.plan_name,
            "has_active_subscription": True,
        }

    def get_tenant_quota(self, manager_id: str) -> dict:
        """Tenancies counted against the plan's max_tenants (NULL = unlimited).

        A tenancy counts until it is terminated, expired or deactivated.
        """
        used = 0
        try:
            res = (
                self.supabase.table("leases")
                .select("status")
                .eq("owner_id", str(manager_id))
                .execute()
            )
            used = sum(
                1 for r in (res.data or [])
                if (r.get("status") or "active") not in ("terminated", "expired", "inactive")
            )
        except Exception:
            logger.warning("Tenant quota count failed for %s", manager_id, exc_info=True)

        sub = self.get_current_subscription(str(manager_id))
        if sub is None or sub.status != "active":
            return {
                "tenants_used": used,
                "max_tenants": 0,
                "can_add_tenant": False,
                "plan_name": None,
                "has_active_subscription": False,
            }
        plan = self._get_plan(sub.plan_id) or {}
        limit = plan.get("max_tenants")
        return {
            "tenants_used": used,
            "max_tenants": limit,
            "can_add_tenant": True if limit is None else used < int(limit),
            "plan_name": sub.plan_name,
            "has_active_subscription": True,
        }

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
            existing_expires = _parse_iso(sub.get("expires_at"))
            if existing_expires and existing_expires > _now():
                return self.get_current_subscription(sub["manager_id"])
            # Active but expired — treat as no active sub, extend below

        plan = self._get_plan(sub["plan_id"])
        if not plan:
            return None

        if paid_amount is not None:
            ugx = float(plan["price_ugx"])
            usd = float(plan.get("price_usd") or 0)
            if abs(float(paid_amount) - ugx) > 1.0 and abs(float(paid_amount) - usd) > 0.05:
                now = _now()
                logger.warning(
                    "Subscription %s amount mismatch: paid=%s expected UGX=%s USD=%s",
                    sub["id"], paid_amount, ugx, usd,
                )
                self.supabase.table("manager_subscriptions").update(
                    {"status": "failed", "payment_status": "failed", "updated_at": now.isoformat()}
                ).eq("id", sub["id"]).eq("status", "pending").execute()
                return None

        duration_days = plan["duration_days"]
        now = _now()

        # EXTEND logic: if there is an active (non-expired) subscription,
        # add duration_days to its existing expires_at. Otherwise start fresh.
        raw_rows = (
            self.supabase.table("manager_subscriptions")
            .select("*")
            .eq("manager_id", sub["manager_id"])
            .execute()
        )
        current_active = None
        for row in (raw_rows.data or []):
            expires_dt = _parse_iso(row.get("expires_at"))
            if row.get("status") == "active" and expires_dt and expires_dt > now:
                if current_active is None or expires_dt > _parse_iso(current_active.get("expires_at")):
                    current_active = row

        # Renewal / upgrade / downgrade while a plan is still running:
        # the NEW row becomes current (so the new plan's limits and perks,
        # e.g. Elite's free boosting, apply immediately) and the remaining
        # days of the old plan are carried over onto it.
        #
        # Previously this extended the old row with a `status = 'pending'`
        # filter, which never matched an active row: the payment was taken
        # but nothing changed, and an upgrade kept the old plan.
        #
        # idx_one_active_subscription_per_manager allows one active row per
        # manager, so the old row is retired first.
        if current_active and str(current_active["id"]) != str(sub["id"]):
            new_expires = _parse_iso(current_active["expires_at"]) + timedelta(days=duration_days)
        else:
            new_expires = now + timedelta(days=duration_days)

        # Retire every other 'active' row, including stale ones whose
        # expires_at has already passed, or the unique index rejects the
        # activation below.
        for row in (raw_rows.data or []):
            if row.get("status") != "active" or str(row.get("id")) == str(sub["id"]):
                continue
            row_expires = _parse_iso(row.get("expires_at"))
            retire = {"status": "expired", "updated_at": now.isoformat()}
            if row_expires is None or row_expires > now:
                retire["expires_at"] = now.isoformat()
            self.supabase.table("manager_subscriptions").update(retire).eq(
                "id", row["id"]
            ).eq("status", "active").execute()

        sub_payload = {
            "status": "active",
            "payment_status": "completed",
            "started_at": now.isoformat(),
            "expires_at": new_expires.isoformat(),
            "updated_at": now.isoformat(),
        }
        self.supabase.table("manager_subscriptions").update(sub_payload).eq(
            "id", sub["id"]
        ).eq("status", "pending").execute()

        return self.get_current_subscription(sub["manager_id"])

    def expire_subscriptions(self) -> int:
        return 0
