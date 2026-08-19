# mypy: ignore-errors
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from dependencies import (
    CurrentUser,
    get_current_user,
    get_service_client,
    get_supabase_client,
)
from main import app

UID_OWNER = "00000000-0000-0000-0000-000000000001"
UID_TENANT_USER = "00000000-0000-0000-0000-000000000002"
UID_ADMIN = "00000000-0000-0000-0000-000000000003"
PID_PROP = "00000000-0000-0000-0000-000000000010"
PID_PROP_2 = "00000000-0000-0000-0000-000000000011"
PID_TENANT = "00000000-0000-0000-0000-000000000020"
PID_LEASE = "00000000-0000-0000-0000-000000000030"
PID_PAYMENT = "00000000-0000-0000-0000-000000000040"
PID_MAINT = "00000000-0000-0000-0000-000000000050"
PID_PROFILE = "00000000-0000-0000-0000-000000000060"
PID_BOOST = "00000000-0000-0000-0000-000000000070"


class MockResponse:
    def __init__(self, data=None, count=None):
        self.data = data or []
        self.count = count


class MockTableBuilder:
    def __init__(self, name, seeds=None):
        self._name = name
        self._seeds = seeds or {}
        self._filters = {}
        self._inserted = None
        self._updated = None
        self._deleted = False
        self._order_col = None
        self._order_desc = False
        self._range_start = 0
        self._range_end = 0
        self._limit = 0
        self._select_cols = "*"
        self._count = None
        self._maybe_single = False

    def select(self, columns="*", count=None):
        self._select_cols = columns
        self._count = count
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def order(self, column, desc=False):
        self._order_col = column
        self._order_desc = desc
        return self

    def range(self, start, end):
        self._range_start = start
        self._range_end = end
        return self

    def limit(self, n):
        self._limit = n
        return self

    def insert(self, payload):
        self._inserted = payload
        return self

    def upsert(self, payload, on_conflict=None):
        self._inserted = payload
        return self

    def single(self):
        self._maybe_single = True
        return self

    def maybe_single(self):
        self._maybe_single = True
        return self

    def update(self, payload):
        self._updated = payload
        return self

    def delete(self):
        self._deleted = True
        return self

    def in_(self, column, values):
        self._filters[column] = ("in", values)
        return self

    def gt(self, column, value):
        self._filters[column] = ("gt", value)
        return self

    def gte(self, column, value):
        self._filters[column] = ("gte", value)
        return self

    def lt(self, column, value):
        self._filters[column] = ("lt", value)
        return self

    def lte(self, column, value):
        self._filters[column] = ("lte", value)
        return self

    def ilike(self, column, pattern):
        self._filters[column] = ("ilike", pattern)
        return self

    def execute(self):
        return self._build_response()

    def _build_response(self):
        seed = self._seed_data()
        now = "2026-05-12T00:00:00Z"

        if self._inserted:
            record = {
                "id": "90000000-0000-0000-0000-000000000001",
                "created_at": now,
                "updated_at": now,
                **self._inserted,
            }
            return MockResponse(data=[record], count=1)

        if self._deleted or self._updated:
            def _matches(d):
                for k, v in self._filters.items():
                    if isinstance(v, tuple):
                        continue
                    if d.get(k) != v:
                        return False
                return True

            matched = any(_matches(d) for d in seed) if seed else False
            if self._deleted:
                return MockResponse(data=[{"id": "deleted"}] if matched else [], count=int(matched))
            if self._updated:
                if not matched:
                    return MockResponse(data=[], count=0)
                base = next(d for d in seed if _matches(d))
                updated = {**base, **self._updated}
                for i, d in enumerate(seed):
                    if _matches(d):
                        seed[i] = updated
                return MockResponse(data=[updated], count=1)

        data = seed[:]
        for col, val in self._filters.items():
            if isinstance(val, tuple):
                op, arg = val
                if op == "in":
                    data = [d for d in data if d.get(col) in arg]
                elif op == "gt":
                    data = [d for d in data if d.get(col, "") > arg]
                elif op == "lt":
                    data = [d for d in data if d.get(col, "") < arg]
                elif op == "gte":
                    data = [d for d in data if d.get(col, "") >= arg]
                elif op == "lte":
                    data = [d for d in data if d.get(col, "") <= arg]
                elif op == "ilike":
                    pattern = arg.replace("%", "").lower()
                    data = [d for d in data if pattern in str(d.get(col, "")).lower()]
            else:
                data = [d for d in data if d.get(col) == val]

        count = len(data)
        if self._count == "exact":
            return MockResponse(data=data, count=count)

        start = self._range_start
        end = self._range_end
        if end:
            data = data[start:end + 1]
        if self._limit:
            data = data[:self._limit]
        if self._maybe_single:
            return MockResponse(data=data[0] if data else None, count=count)
        return MockResponse(data=data, count=count)

    def _seed_data(self):
        if self._name in self._seeds:
            return self._seeds[self._name]
        if self._name == "properties":
            return [
                {
                    "id": PID_PROP,
                    "owner_id": UID_OWNER,
                    "title": "Main St House",
                    "address": "123 Main St",
                    "city": "Kampala",
                    "state": "Central",
                    "zip_code": "12345",
                    "country": "UG",
                    "property_type": "house",
                    "bedrooms": 3,
                    "bathrooms": 2.0,
                    "square_feet": 1500,
                    "monthly_rent": 1500000,
                    "security_deposit": 1500000,
                    "status": "available",
                    "description": "Nice house",
                    "amenities": ["water", "electricity"],
                    "images": [],
                    "is_active": True,
                    "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-01T00:00:00Z",
                },
                {
                    "id": PID_PROP_2,
                    "owner_id": UID_OWNER,
                    "title": "Second St Apartment",
                    "address": "456 Second St",
                    "city": "Kampala",
                    "state": "Central",
                    "zip_code": "12345",
                    "country": "UG",
                    "property_type": "apartment",
                    "bedrooms": 2,
                    "bathrooms": 1.0,
                    "square_feet": 900,
                    "monthly_rent": 800000,
                    "security_deposit": 800000,
                    "status": "available",
                    "description": "Nice apartment",
                    "amenities": ["water"],
                    "images": [],
                    "is_active": True,
                    "created_at": "2026-02-01T00:00:00Z",
                    "updated_at": "2026-02-01T00:00:00Z",
                },
            ]
        if self._name == "property_boosts":
            return [
                {
                    "id": PID_BOOST,
                    "property_id": PID_PROP_2,
                    "manager_id": UID_OWNER,
                    "amount_paid": 70000,
                    "duration_days": 7,
                    "started_at": "2026-07-01T00:00:00Z",
                    "expires_at": "2126-07-08T00:00:00Z",
                    "status": "active",
                    "transaction_id": None,
                    "payment_method": None,
                    "created_at": "2026-07-01T00:00:00Z",
                    "updated_at": "2026-07-01T00:00:00Z",
                },
            ]
        if self._name == "tenants":
            return [
                {
                    "id": PID_TENANT,
                    "owner_id": UID_OWNER,
                    "user_id": UID_TENANT_USER,
                    "first_name": "John",
                    "last_name": "Doe",
                    "email": "john@example.com",
                    "phone": "+256700000000",
                    "status": "active",
                    "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-01T00:00:00Z",
                }
            ]
        if self._name == "leases":
            return [
                {
                    "id": PID_LEASE,
                    "owner_id": UID_OWNER,
                    "property_id": PID_PROP,
                    "tenant_id": PID_TENANT,
                    "start_date": "2026-01-01",
                    "end_date": "2026-12-31",
                    "monthly_rent": 1500000,
                    "security_deposit": 1500000,
                    "status": "active",
                    "terms": None,
                    "rent_effective_date": "2026-01-01",
                    "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-01T00:00:00Z",
                }
            ]
        if self._name == "payments":
            return [
                {
                    "id": PID_PAYMENT,
                    "lease_id": PID_LEASE,
                    "tenant_id": PID_TENANT,
                    "amount": 1500000,
                    "payment_type": "rent",
                    "payment_method": "mobile_money",
                    "status": "completed",
                    "due_date": "2026-02-01",
                    "paid_date": "2026-02-01",
                    "transaction_id": "txn-001",
                    "notes": None,
                    "created_at": "2026-02-01T00:00:00Z",
                    "updated_at": "2026-02-01T00:00:00Z",
                }
            ]
        if self._name == "maintenance_requests":
            return [
                {
                    "id": PID_MAINT,
                    "property_id": PID_PROP,
                    "tenant_id": PID_TENANT,
                    "title": "Leaky faucet",
                    "description": "Kitchen faucet is leaking",
                    "priority": "medium",
                    "status": "open",
                    "scheduled_date": None,
                    "completed_date": None,
                    "cost": None,
                    "notes": None,
                    "created_at": "2026-03-01T00:00:00Z",
                    "updated_at": "2026-03-01T00:00:00Z",
                }
            ]
        if self._name == "profiles":
            return [
                {
                    "id": PID_PROFILE,
                    "user_id": UID_OWNER,
                    "email": "test@test.com",
                    "role": "super_admin",
                    "full_name": "Test User",
                    "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-01T00:00:00Z",
                },
                {
                    "id": "00000000-0000-0000-0000-000000000061",
                    "user_id": UID_TENANT_USER,
                    "email": "tenant@test.com",
                    "role": "tenant",
                    "full_name": "Tenant User",
                    "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-01T00:00:00Z",
                },
                {
                    "id": "00000000-0000-0000-0000-000000000062",
                    "user_id": UID_ADMIN,
                    "email": "admin@test.com",
                    "role": "super_admin",
                    "full_name": "Admin User",
                    "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-01T00:00:00Z",
                },
            ]
        if self._name == "subscription_plans":
            return [
                {
                    "id": "1mo",
                    "name": "1 Month",
                    "duration_days": 30,
                    "price_usd": 5.0,
                    "price_ugx": 20000.0,
                    "benefits": [],
                    "is_active": True,
                    "sort_order": 0,
                    "popular": False,
                    "created_at": "2026-01-01T00:00:00Z",
                },
                {
                    "id": "3mo",
                    "name": "3 Months",
                    "duration_days": 90,
                    "price_usd": 10.0,
                    "price_ugx": 40000.0,
                    "benefits": [],
                    "is_active": True,
                    "sort_order": 1,
                    "popular": False,
                    "created_at": "2026-01-01T00:00:00Z",
                },
                {
                    "id": "6mo",
                    "name": "6 Months",
                    "duration_days": 180,
                    "price_usd": 20.0,
                    "price_ugx": 80000.0,
                    "benefits": [],
                    "is_active": True,
                    "sort_order": 2,
                    "popular": True,
                    "created_at": "2026-01-01T00:00:00Z",
                },
                {
                    "id": "12mo",
                    "name": "1 Year",
                    "duration_days": 365,
                    "price_usd": 25.0,
                    "price_ugx": 100000.0,
                    "benefits": [],
                    "is_active": True,
                    "sort_order": 3,
                    "popular": False,
                    "created_at": "2026-01-01T00:00:00Z",
                },
            ]
        if self._name == "boost_packages":
            return [
                {
                    "id": "7d",
                    "days": 7,
                    "price_ugx": 10000.0,
                    "label": "7 Days",
                    "is_active": True,
                    "sort_order": 1,
                },
                {
                    "id": "14d",
                    "days": 14,
                    "price_ugx": 20000.0,
                    "label": "14 Days",
                    "is_active": True,
                    "sort_order": 2,
                },
                {
                    "id": "30d",
                    "days": 30,
                    "price_ugx": 40000.0,
                    "label": "30 Days",
                    "is_active": True,
                    "sort_order": 3,
                },
                {
                    "id": "60d",
                    "days": 60,
                    "price_ugx": 90000.0,
                    "label": "60 Days",
                    "is_active": False,
                    "sort_order": 4,
                },
            ]
        if self._name == "manager_subscriptions":
            def _sub(uid, status="active", expires_at="2126-07-08T00:00:00Z"):
                return {
                    "id": f"sub-{uid}",
                    "manager_id": uid,
                    "plan_id": "12mo",
                    "status": status,
                    "started_at": "2026-01-01T00:00:00Z",
                    "expires_at": expires_at,
                    "auto_renew": True,
                    "payment_reference": None,
                    "payment_status": "completed",
                    "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-01T00:00:00Z",
                }

            return [_sub(UID_OWNER), _sub(UID_ADMIN)]
        return []


class MockSupabaseClient:
    def __init__(self, seeds=None):
        self._seeds = seeds or {}
        # Each test starts a fresh "database"; drop the process-wide Pesapal
        # reconcile cooldown so a prior test can't suppress this one's lookups.
        from routers.payments import _reset_reconcile_cooldowns
        _reset_reconcile_cooldowns()

    def table(self, name):
        return MockTableBuilder(name, self._seeds)

    def rpc(self, name, params=None):
        mock = MagicMock()
        if name == "get_user_role":
            uid = (params or {}).get("_user_id")
            role = "super_admin"
            for profile in MockTableBuilder("profiles", self._seeds)._seed_data():
                if str(profile.get("user_id")) == str(uid):
                    role = profile.get("role", role)
                    break
            mock.execute.return_value = MockResponse(data=[role])
        else:
            mock.execute.return_value = MockResponse(data=[])
        return mock

    @property
    def auth(self):
        mock = MagicMock()
        mock.sign_up.return_value = {
            "user": MagicMock(model_dump=lambda: {"id": "new-user-id", "email": "test@test.com"}),
            "session": MagicMock(access_token="fake-access-token"),
        }
        mock.sign_in_with_password.return_value = {
            "user": MagicMock(model_dump=lambda: {"id": UID_OWNER, "email": "test@test.com"}),
            "session": MagicMock(access_token="fake-access-token"),
        }
        mock.get_user.return_value = MagicMock(
            user=MagicMock(model_dump=lambda: {"user_metadata": {"full_name": "Test User"}})
        )
        return mock


@pytest.fixture(scope="session", autouse=True)
def _disable_rate_limits():
    from config import get_settings

    s = get_settings()
    previous = s.rate_limit_enabled
    s.rate_limit_enabled = False
    yield
    s.rate_limit_enabled = previous


@pytest.fixture
def test_user() -> CurrentUser:
    return CurrentUser(id=UID_OWNER, email="test@test.com", role="authenticated")


@pytest.fixture
def admin_user() -> CurrentUser:
    return CurrentUser(id=UID_ADMIN, email="admin@test.com", role="admin")


@pytest.fixture
def mock_supabase() -> MockSupabaseClient:
    return MockSupabaseClient()


@pytest.fixture
def client(mock_supabase, test_user) -> TestClient:
    from dependencies.database import _get_cached_client
    _get_cached_client.cache_clear()

    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase
    app.dependency_overrides[get_service_client] = lambda: mock_supabase
    app.dependency_overrides[get_current_user] = lambda: test_user

    with patch("dependencies.database.create_client", return_value=mock_supabase):
        yield TestClient(app)

    app.dependency_overrides.clear()


@pytest.fixture
def seeded_client(test_user):
    """Factory for a TestClient with a configurable mock supabase and user.

    `seeds` overrides the default fixture data for specific tables (e.g.
    ``manager_subscriptions``) so subscription-expiry behavior can be tested.
    """
    from dependencies.database import _get_cached_client

    def _build(*, user: CurrentUser | None = None, seeds: dict | None = None) -> TestClient:
        _get_cached_client.cache_clear()
        mock = MockSupabaseClient(seeds=seeds)
        app.dependency_overrides[get_supabase_client] = lambda: mock
        app.dependency_overrides[get_service_client] = lambda: mock
        app.dependency_overrides[get_current_user] = lambda: user or test_user
        return TestClient(app, raise_server_exceptions=False)

    yield _build
    app.dependency_overrides.clear()
