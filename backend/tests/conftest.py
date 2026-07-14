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

# Fixed UUIDs for test data
UID_OWNER = "00000000-0000-0000-0000-000000000001"
UID_TENANT_USER = "00000000-0000-0000-0000-000000000002"
UID_ADMIN = "00000000-0000-0000-0000-000000000003"
PID_PROP = "00000000-0000-0000-0000-000000000010"
PID_TENANT = "00000000-0000-0000-0000-000000000020"
PID_LEASE = "00000000-0000-0000-0000-000000000030"
PID_PAYMENT = "00000000-0000-0000-0000-000000000040"
PID_MAINT = "00000000-0000-0000-0000-000000000050"
PID_PROFILE = "00000000-0000-0000-0000-000000000060"
PID_BOOST = "00000000-0000-0000-0000-000000000070"
PID_SUB = "00000000-0000-0000-0000-000000000080"
PID_PROP_2 = "00000000-0000-0000-0000-000000000011"


class MockResponse:
    def __init__(self, data=None, count=None):
        self.data = data or []
        self.count = count


class MockTableBuilder:
    def __init__(self, name):
        self._name = name
        self._filters = {}
        self._inserted = None
        self._updated = None
        self._deleted = False
        self._order_col = None
        self._order_desc = False
        self._range_start = 0
        self._range_end = 0
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

    def insert(self, payload):
        self._inserted = payload
        return self

    def update(self, payload):
        self._updated = payload
        return self

    def delete(self):
        self._deleted = True
        return self

    def gt(self, column, value):
        self._filters[column] = ("gt", value)
        return self

    def lt(self, column, value):
        self._filters[column] = ("lt", value)
        return self

    def gte(self, column, value):
        self._filters[column] = ("gte", value)
        return self

    def lte(self, column, value):
        self._filters[column] = ("lte", value)
        return self

    def ilike(self, column, value):
        self._filters[column] = ("ilike", value)
        return self

    def maybe_single(self):
        self._maybe_single = True
        return self

    def in_(self, column, values):
        self._filters[column] = ("in", values)
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

        if self._maybe_single:
            data = seed[:]
            for col, val in self._filters.items():
                if isinstance(val, tuple):
                    op, arg = val
                    if op == "eq":
                        data = [d for d in data if d.get(col) == arg]
                else:
                    data = [d for d in data if d.get(col) == val]
            return MockResponse(data=data[0] if data else None, count=len(data))

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
        return MockResponse(data=data, count=count)

    def _seed_data(self):
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
        if self._name == "manager_subscriptions":
            return [
                {
                    "id": PID_SUB,
                    "manager_id": UID_OWNER,
                    "plan_type": "12mo",
                    "status": "active",
                    "start_date": "2026-01-01T00:00:00Z",
                    "expiry_date": "2126-12-31T00:00:00Z",
                    "amount_paid": 111000,
                    "payment_method": "nylonpay",
                    "transaction_id": "sub-txn-001",
                    "auto_renew": False,
                    "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-01T00:00:00Z",
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
                    "expires_at": "2126-07-08T00:00:00Z",  # far future so test never expires
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
                    "status": "active",
                    "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-01T00:00:00Z",
                }
            ]
        return []


class MockSupabaseClient:
    def table(self, name):
        return MockTableBuilder(name)

    def rpc(self, name, params=None):
        mock = MagicMock()
        if name == "get_user_role":
            mock.execute.return_value = MockResponse(data=["super_admin"])
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


@pytest.fixture
def test_user() -> CurrentUser:
    return CurrentUser(id=UID_OWNER, email="test@test.com", role="authenticated")


@pytest.fixture
def admin_user() -> CurrentUser:
    return CurrentUser(id=UID_ADMIN, email="admin@test.com", role="super_admin", status="active")


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
