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

    # Status matters as well as the date: a cancelled or refunded row can
    # still carry a future expiry, and counting it made the app flip between
    # "active" and "expired" depending on which row sorted first.
    live_statuses = ("active", "grace")
    qualifying = []
    for row in data:
        if (row.get("status") or "") not in live_statuses:
            continue
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

    def confirm_subscription(
        self, payment_reference: str, paid_amount: float | None = None,
        paid_currency: str | None = None, tracking_id: str | None = None,
    ) -> ManagerSubscriptionResponse | None:
        """Only call after a server-to-server COMPLETED gateway response.

        The database validates the stored quote and activates under a manager
        lock in one transaction. Errors propagate so callbacks can retry.
        """
        result = self.supabase.rpc("activate_verified_subscription", {
            "p_reference": payment_reference,
            "p_tracking_id": tracking_id,
            "p_amount": paid_amount,
            "p_currency": paid_currency,
        }).execute()
        payload = result.data
        if not payload:
            return None
        row = payload["subscription"]
        if payload.get("activated"):
            try:
                from services.notifications import notify_admins, profile_label
                notify_admins(
                    self.supabase, type="admin_subscription_paid",
                    title="Subscription activated",
                    body=f"{profile_label(self.supabase, row['manager_id'])}'s subscription is active until {row['expires_at']}.",
                    metadata={"subscription_id": str(row["id"]), "manager_id": str(row["manager_id"])},
                )
            except Exception:
                logger.warning("Admin subscription notification failed", exc_info=True)
        return self.to_response(row)

    def expire_subscriptions(self) -> int:
        return 0
