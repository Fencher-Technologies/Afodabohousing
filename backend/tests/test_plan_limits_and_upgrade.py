# mypy: ignore-errors
"""Tenant limits (max_tenants) and upgrading while a plan is still active."""
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest

from services.subscriptions import SubscriptionService, reset_plans_cache

MANAGER = "00000000-0000-0000-0000-000000000001"


class Query:
    """Minimal PostgREST-style fake that honours eq() filters."""

    def __init__(self, store, name):
        self.store, self.name = store, name
        self.filters, self.payload = [], None

    def select(self, *_a, **_k):
        return self

    def eq(self, col, val):
        self.filters.append((col, str(val)))
        return self

    def limit(self, _):
        return self

    def update(self, payload):
        self.payload = payload
        return self

    def _match(self, row):
        return all(str(row.get(c)) == v for c, v in self.filters)

    def execute(self):
        rows = [r for r in self.store.setdefault(self.name, []) if self._match(r)]
        if self.payload is not None:
            for r in rows:
                r.update(self.payload)
        return SimpleNamespace(data=[dict(r) for r in rows], count=len(rows))


class FakeSupabase:
    def __init__(self, **tables):
        self.store = tables

    def table(self, name):
        return Query(self.store, name)


PLANS = [
    {"id": "3mo", "name": "Essential", "duration_days": 90, "price_ugx": 40000, "price_usd": 10,
     "max_properties": 3, "max_tenants": 10, "is_active": True},
    {"id": "12mo", "name": "Elite", "duration_days": 365, "price_ugx": 1000000, "price_usd": 250,
     "max_properties": None, "max_tenants": None, "is_active": True},
]


@pytest.fixture(autouse=True)
def _fresh_cache():
    reset_plans_cache()
    yield
    reset_plans_cache()


def _active_sub(plan_id, days_left=30, sid="sub-old"):
    now = datetime.now(UTC)
    return {"id": sid, "manager_id": MANAGER, "plan_id": plan_id, "status": "active",
            "payment_status": "completed", "payment_reference": f"ref-{sid}",
            "started_at": (now - timedelta(days=10)).isoformat(),
            "expires_at": (now + timedelta(days=days_left)).isoformat()}


def _leases(n, status="active"):
    return [{"id": f"l{status}{i}", "owner_id": MANAGER, "status": status} for i in range(n)]


def test_tenant_limit_blocks_at_max():
    sb = FakeSupabase(subscription_plans=PLANS, manager_subscriptions=[_active_sub("3mo")],
                      leases=_leases(10) + _leases(4, "terminated"))
    q = SubscriptionService(sb).get_tenant_quota(MANAGER)
    assert q["tenants_used"] == 10
    assert q["max_tenants"] == 10
    assert q["can_add_tenant"] is False


def test_tenant_limit_allows_under_max():
    sb = FakeSupabase(subscription_plans=PLANS, manager_subscriptions=[_active_sub("3mo")],
                      leases=_leases(9))
    assert SubscriptionService(sb).get_tenant_quota(MANAGER)["can_add_tenant"] is True


def test_elite_has_no_tenant_limit():
    sb = FakeSupabase(subscription_plans=PLANS, manager_subscriptions=[_active_sub("12mo")],
                      leases=_leases(500))
    q = SubscriptionService(sb).get_tenant_quota(MANAGER)
    assert q["max_tenants"] is None and q["can_add_tenant"] is True


def test_upgrade_switches_plan_and_carries_over_days():
    pending = {"id": "sub-new", "manager_id": MANAGER, "plan_id": "12mo", "status": "pending",
               "payment_status": "pending", "payment_reference": "ref-new"}
    sb = FakeSupabase(subscription_plans=PLANS,
                      manager_subscriptions=[_active_sub("3mo", days_left=30), pending])

    result = SubscriptionService(sb).confirm_subscription("ref-new", paid_amount=1000000)

    assert result is not None
    assert result.plan_id == "12mo"
    assert result.status == "active"
    expires = datetime.fromisoformat(result.expires_at)
    expected = datetime.now(UTC) + timedelta(days=30 + 365)
    assert abs((expires - expected).total_seconds()) < 120

    rows = {r["id"]: r for r in sb.store["manager_subscriptions"]}
    assert rows["sub-old"]["status"] == "expired"
    assert sum(1 for r in rows.values() if r["status"] == "active") == 1
