"""/admin/stats/trends: real month-by-month series, nothing invented."""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from dependencies import CurrentUser, get_current_user, get_service_client
from main import app
from routers.admin import _fetch_all, _month_keys

ADMIN = "00000000-0000-0000-0000-0000000000a1"


class FakeTable:
    def __init__(self, rows):
        self.rows, self._range = rows, None

    def select(self, *_a, **_k):
        return self

    def __getattr__(self, name):  # eq / in_ / order ... are irrelevant to the fake
        return lambda *_a, **_k: self

    def range(self, start, end):
        self._range = (start, end)
        return self

    def execute(self):
        class R:
            pass

        r = R()
        r.data = self.rows[self._range[0]: self._range[1] + 1] if self._range else self.rows
        return r


class FakeDB:
    def __init__(self, **tables):
        self.tables = tables

    def table(self, name):
        return FakeTable(self.tables.get(name, []))


def _ym(offset: int) -> str:
    """'YYYY-MM' for the current month shifted back by `offset` months."""
    return _month_keys(datetime.now(UTC), offset + 1)[0]


def _client(role, db):
    user = CurrentUser(id=ADMIN, email="a@example.com", role=role)
    app.dependency_overrides[get_service_client] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _clear():
    yield
    app.dependency_overrides.clear()


def test_month_keys_roll_over_the_year():
    assert _month_keys(datetime(2026, 2, 10, tzinfo=UTC), 4) == ["2025-11", "2025-12", "2026-01", "2026-02"]


def test_series_are_bucketed_from_real_rows():
    this, prev, old = _ym(0), _ym(1), _ym(11)
    db = FakeDB(
        payments=[
            {"amount": 100, "paid_date": f"{this}-05", "created_at": f"{prev}-28T00:00:00Z"},  # paid_date wins
            {"amount": 50.5, "paid_date": None, "created_at": f"{prev}-02T00:00:00Z"},          # falls back to created_at
            {"amount": 999, "paid_date": f"{old}-01", "created_at": f"{old}-01T00:00:00Z"},    # outside a 6-month window
        ],
        profiles=[
            {"role": "tenant", "created_at": f"{this}-01T00:00:00Z"},
            {"role": "tenant", "created_at": f"{this}-02T00:00:00Z"},
            {"role": "house_manager", "created_at": f"{prev}-03T00:00:00Z"},
        ],
        subscription_plans=[{"id": "3mo", "price_usd": 10}, {"id": "6mo", "price_usd": 100}],
        manager_subscriptions=[
            {"plan_id": "6mo", "created_at": f"{this}-04T00:00:00Z"},
            {"plan_id": "3mo", "created_at": f"{prev}-04T00:00:00Z"},
            {"plan_id": "unknown", "created_at": f"{prev}-05T00:00:00Z"},  # no price: contributes 0
        ],
    )
    r = _client("super_admin", db).get("/admin/stats/trends?months=6")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["months"][-1] == this and body["months"][-2] == prev and len(body["months"]) == 6
    assert body["rent_recorded"] == [0, 0, 0, 0, 50.5, 100]
    assert body["new_tenants"] == [0, 0, 0, 0, 0, 2]
    assert body["new_managers"] == [0, 0, 0, 0, 1, 0]
    assert body["subscription_revenue"] == [0, 0, 0, 0, 10, 100]


def test_no_data_is_all_zeros_not_a_made_up_curve():
    r = _client("super_admin", FakeDB()).get("/admin/stats/trends?months=3")
    body = r.json()
    assert body["rent_recorded"] == [0, 0, 0] and body["new_tenants"] == [0, 0, 0]


def test_every_page_is_counted_not_just_the_first_thousand():
    rows = [{"amount": 1, "paid_date": f"{_ym(0)}-01", "created_at": None} for _ in range(2500)]
    assert len(_fetch_all(lambda: FakeTable(rows))) == 2500
    r = _client("super_admin", FakeDB(payments=rows)).get("/admin/stats/trends?months=1")
    assert r.json()["rent_recorded"] == [2500]


@pytest.mark.parametrize("role", ["house_manager", "tenant"])
def test_only_super_admin_may_read_it(role):
    assert _client(role, FakeDB()).get("/admin/stats/trends").status_code == 403


def test_months_is_bounded():
    c = _client("super_admin", FakeDB())
    assert c.get("/admin/stats/trends?months=0").status_code == 422
    assert c.get("/admin/stats/trends?months=25").status_code == 422
