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


class MockResponse:
    def __init__(self, data=None, count=None):
        self.data = data or []
        self.count = count


class MockTableBuilder:
    def __init__(self, name):
        self._name = name
        self._filters = {}
        self._filter_ops = []
        self._inserted = None
        self._updated = None
        self._deleted = False
        self._order_col = None
        self._order_desc = False
        self._range_start = 0
        self._range_end = 0
        self._select_cols = "*"
        self._count = None
        self.not_ = MockNotFilter(self)

    def select(self, columns="*", count=None):
        self._select_cols = columns
        self._count = count
        return self

    def eq(self, column, value):
        self._filters[column] = value
        self._filter_ops.append(("eq", column, value))
        return self

    def gte(self, column, value):
        self._filter_ops.append(("gte", column, value))
        return self

    def lte(self, column, value):
        self._filter_ops.append(("lte", column, value))
        return self

    def ilike(self, column, pattern):
        self._filter_ops.append(("ilike", column, pattern))
        return self

    def is_(self, column, value):
        self._filter_ops.append(("is", column, value))
        return self

    def or_(self, expression):
        self._filter_ops.append(("or", None, expression))
        return self

    def limit(self, count):
        self._range_start = 0
        self._range_end = count - 1
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

    def in_(self, column, values):
        self._filters[column] = ("in", values)
        self._filter_ops.append(("in", column, values))
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
                return MockResponse(data=[updated], count=1)

        data = seed[:]
        for op, col, val in self._filter_ops:
            if op == "eq":
                data = [d for d in data if d.get(col) == val]
            elif op == "in":
                data = [d for d in data if d.get(col) in val]
            elif op == "gte":
                data = [d for d in data if d.get(col) is not None and d.get(col) >= val]
            elif op == "lte":
                data = [d for d in data if d.get(col) is not None and d.get(col) <= val]
            elif op == "ilike":
                needle = str(val).strip("%").lower()
                data = [d for d in data if needle in str(d.get(col) or "").lower()]
            elif op == "is":
                if val == "null":
                    data = [d for d in data if d.get(col) is None]
            elif op == "not_is":
                if val == "null":
                    data = [d for d in data if d.get(col) is not None]
            elif op == "or":
                parsed = []
                for part in val.split(","):
                    pieces = part.split(".ilike.", 1)
                    if len(pieces) == 2:
                        parsed.append((pieces[0], pieces[1].strip("%").lower()))
                data = [
                    d for d in data
                    if any(needle in str(d.get(field) or "").lower() for field, needle in parsed)
                ]

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
                    "title": "Sample Property",
                    "address": "123 Main St",
                    "city": "Kampala",
                    "state": "Central",
                    "zip_code": "12345",
                    "country": "UG",
                    "property_type": "Residential",
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
                    "id": "00000000-0000-0000-0000-000000000011",
                    "owner_id": UID_OWNER,
                    "title": "Kololo Office Suite",
                    "address": "1 Corporate Rd",
                    "city": "Kampala",
                    "state": "Central",
                    "zip_code": "00000",
                    "country": "UG",
                    "property_type": "Office Space",
                    "bedrooms": 0,
                    "bathrooms": 1.0,
                    "square_feet": 900,
                    "monthly_rent": 2500000,
                    "security_deposit": 2500000,
                    "status": "available",
                    "description": "Office near Kololo",
                    "amenities": ["parking"],
                    "images": [],
                    "is_active": True,
                    "created_at": "2026-02-01T00:00:00Z",
                    "updated_at": "2026-02-01T00:00:00Z",
                },
                {
                    "id": "00000000-0000-0000-0000-000000000012",
                    "owner_id": UID_OWNER,
                    "title": "Inactive Entebbe Home",
                    "address": "2 Lake Rd",
                    "city": "Entebbe",
                    "state": "Central",
                    "zip_code": "00000",
                    "country": "UG",
                    "property_type": "Residential",
                    "bedrooms": 2,
                    "bathrooms": 1.0,
                    "square_feet": 800,
                    "monthly_rent": 900000,
                    "security_deposit": 900000,
                    "status": "inactive",
                    "description": "Hidden listing",
                    "amenities": [],
                    "images": [],
                    "is_active": False,
                    "created_at": "2026-03-01T00:00:00Z",
                    "updated_at": "2026-03-01T00:00:00Z",
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
                },
                {
                    "id": "00000000-0000-0000-0000-000000000021",
                    "owner_id": UID_OWNER,
                    "user_id": None,
                    "first_name": "Jane",
                    "last_name": "Inactive",
                    "email": "jane@example.com",
                    "phone": "+256711111111",
                    "status": "inactive",
                    "created_at": "2026-02-01T00:00:00Z",
                    "updated_at": "2026-02-01T00:00:00Z",
                },
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
                },
                {
                    "id": "00000000-0000-0000-0000-000000000031",
                    "owner_id": UID_OWNER,
                    "property_id": "00000000-0000-0000-0000-000000000011",
                    "tenant_id": PID_TENANT,
                    "start_date": "2026-02-01",
                    "end_date": "2026-08-31",
                    "monthly_rent": 2500000,
                    "security_deposit": 2500000,
                    "status": "active",
                    "terms": None,
                    "created_at": "2026-02-01T00:00:00Z",
                    "updated_at": "2026-02-01T00:00:00Z",
                },
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
                },
                {
                    "id": "00000000-0000-0000-0000-000000000041",
                    "lease_id": "00000000-0000-0000-0000-000000000031",
                    "tenant_id": PID_TENANT,
                    "amount": 2500000,
                    "payment_type": "rent",
                    "payment_method": "bank",
                    "status": "pending",
                    "due_date": "2026-03-10",
                    "paid_date": None,
                    "transaction_id": "txn-002",
                    "notes": None,
                    "created_at": "2026-03-01T00:00:00Z",
                    "updated_at": "2026-03-01T00:00:00Z",
                },
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
                    "role": "admin",
                    "full_name": "Test User",
                    "created_at": "2026-01-01T00:00:00Z",
                    "updated_at": "2026-01-01T00:00:00Z",
                },
                {
                    "id": "00000000-0000-0000-0000-000000000061",
                    "user_id": "00000000-0000-0000-0000-000000000004",
                    "email": "manager@example.com",
                    "role": "house_manager",
                    "full_name": "Mary Manager",
                    "phone": "+256755555555",
                    "avatar_url": None,
                    "created_at": "2026-02-01T00:00:00Z",
                    "updated_at": "2026-02-01T00:00:00Z",
                },
            ]
        return []


class MockNotFilter:
    def __init__(self, builder):
        self._builder = builder

    def is_(self, column, value):
        self._builder._filter_ops.append(("not_is", column, value))
        return self._builder


class MockSupabaseClient:
    def table(self, name):
        return MockTableBuilder(name)

    def rpc(self, name, params=None):
        mock = MagicMock()
        if name == "get_user_role":
            mock.execute.return_value = MockResponse(data=["admin"])
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
