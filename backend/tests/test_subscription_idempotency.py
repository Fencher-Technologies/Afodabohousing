# mypy: ignore-errors
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from services.subscriptions import SubscriptionService

REF = "ref-sub-001"
PLAN_ID = "plan-monthly"
MANAGER_ID = "00000000-0000-0000-0000-000000000001"


class FakeTable:
    def __init__(self, name):
        self._name = name
        self._rows = []
        self._conditions = []
        self._payload = None
        self._update_calls = 0

    def select(self, *_):
        return self

    def eq(self, column, value):
        self._conditions.append((column, value))
        return self

    def limit(self, _):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def update(self, payload):
        self._update_calls += 1
        self._payload = payload
        return self

    def execute(self):
        if self._payload is not None:
            self._apply_payload()
            return SimpleNamespace(data=self._rows)
        return SimpleNamespace(data=list(self._rows))

    def _apply_payload(self):
        for row in self._rows:
            for key, value in self._payload.items():
                row[key] = value


class FakeSupabase:
    def __init__(self):
        self.tables = {}

    def table(self, name):
        if name not in self.tables:
            self.tables[name] = FakeTable(name)
        return self.tables[name]

    def seed(self, name, rows):
        self.table(name)._rows = rows


def make_pending_sub(extra=None):
    row = {
        "id": "sub-1",
        "manager_id": MANAGER_ID,
        "plan_id": PLAN_ID,
        "status": "pending",
        "payment_reference": REF,
        "payment_status": "pending",
        "started_at": None,
        "expires_at": None,
        "auto_renew": True,
        "created_at": "2026-01-01T00:00:00Z",
    }
    if extra:
        row.update(extra)
    return row


def make_plan():
    return {
        "id": PLAN_ID,
        "name": "Monthly",
        "duration_days": 30,
        "price_ugx": 15000,
        "is_active": True,
        "sort_order": 1,
    }


class TestConfirmSubscriptionIdempotency:
    def test_first_confirm_activates_with_status_pending_guard(self):
        sb = FakeSupabase()
        sb.seed("manager_subscriptions", [make_pending_sub()])
        sb.seed("subscription_plans", [make_plan()])

        result = SubscriptionService(sb).confirm_subscription(REF)

        assert result is not None
        assert result.status == "active"
        assert result.payment_status == "completed"

        subs_table = sb.tables["manager_subscriptions"]
        assert subs_table._update_calls == 1
        assert ("status", "pending") in subs_table._conditions
        assert ("id", "sub-1") in subs_table._conditions
        assert subs_table._payload["status"] == "active"

        expected_expiry = datetime.now(UTC) + timedelta(days=30)
        actual = datetime.fromisoformat(subs_table._payload["expires_at"])
        assert abs((actual - expected_expiry).total_seconds()) < 60

    def test_duplicate_confirm_does_not_re_extend_expiry(self):
        sb = FakeSupabase()
        first_expiry = (datetime.now(UTC) + timedelta(days=30)).isoformat()
        sb.seed("manager_subscriptions", [
            make_pending_sub(
                {
                    "status": "active",
                    "payment_status": "completed",
                    "started_at": (datetime.now(UTC) - timedelta(days=10)).isoformat(),
                    "expires_at": first_expiry,
                }
            )
        ])
        sb.seed("subscription_plans", [make_plan()])

        result = SubscriptionService(sb).confirm_subscription(REF)

        assert result is not None
        assert result.status == "active"
        assert sb.tables["manager_subscriptions"]._update_calls == 0
        assert result.expires_at == first_expiry

    def test_unknown_reference_returns_none(self):
        sb = FakeSupabase()
        sb.seed("subscription_plans", [make_plan()])

        result = SubscriptionService(sb).confirm_subscription("ref-unknown")

        assert result is None
        assert sb.tables["manager_subscriptions"]._update_calls == 0
