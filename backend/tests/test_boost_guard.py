# mypy: ignore-errors
from types import SimpleNamespace

from services.boost import BoostService

REF = "boost-ref-001"
PROP_ID = "00000000-0000-0000-0000-000000000002"
MANAGER_ID = "00000000-0000-0000-0000-000000000001"


class FakeTable:
    def __init__(self, name):
        self._name = name
        self._rows = []
        self._conditions = []
        self._payload = None
        self._update_calls = 0
        self._last_select = None

    def select(self, *cols):
        self._last_select = cols
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
        if name in ("subscription_plans", "boost_packages"):
            from services.boost import reset_packages_cache
            from services.subscriptions import reset_plans_cache
            reset_plans_cache()
            reset_packages_cache()


def make_pending_boost():
    return {
        "id": "boost-1",
        "property_id": PROP_ID,
        "manager_id": MANAGER_ID,
        "amount_paid": "500",
        "duration_days": 7,
        "transaction_id": REF,
        "status": "pending",
        "started_at": None,
        "expires_at": None,
    }


def make_package():
    return {
        "id": "7d",
        "days": 7,
        "price_ugx": 500,
        "label": "7 Days",
        "is_active": True,
        "sort_order": 1,
    }


def test_wrong_amount_marks_failed():
    sb = FakeSupabase()
    sb.seed("property_boosts", [make_pending_boost()])
    sb.seed("boost_packages", [make_package()])

    result = BoostService(sb).activate_by_reference(REF, "txn-1", paid_amount=100)

    assert result is None
    boosts_table = sb.tables["property_boosts"]
    assert boosts_table._payload["status"] == "failed"


def test_correct_amount_activates():
    sb = FakeSupabase()
    sb.seed("property_boosts", [make_pending_boost()])
    sb.seed("boost_packages", [make_package()])

    result = BoostService(sb).activate_by_reference(REF, "txn-1", paid_amount=500)

    assert result is not None
    assert result["status"] == "active"
    assert result["transaction_id"] == REF


def test_no_amount_still_activates():
    sb = FakeSupabase()
    sb.seed("property_boosts", [make_pending_boost()])
    sb.seed("boost_packages", [make_package()])

    result = BoostService(sb).activate_by_reference(REF, "txn-1")

    assert result is not None
    assert result["status"] == "active"
