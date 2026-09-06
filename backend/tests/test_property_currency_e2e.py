"""End-to-end: does POST /properties actually persist a non-UGX currency?

This is the test that would have caught rent_currency being missing from the
Pydantic models: the request succeeded, returned 201, and silently dropped the
currency on the way to the database.
"""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from dependencies import get_current_user, get_service_client, require_active_subscription
from dependencies.database import get_supabase_client
from main import app


CAPTURED = {}


class _Tbl:
    def __init__(self, name):
        self.name = name
        self._payload = None

    def insert(self, payload):
        self._payload = payload
        CAPTURED[self.name] = payload
        return self

    def select(self, *a, **k): return self
    def eq(self, *a, **k): return self
    def limit(self, *a, **k): return self

    def execute(self):
        r = MagicMock()
        if self._payload is not None:
            row = dict(self._payload)
            row.setdefault("id", "11111111-1111-1111-1111-111111111111")
            row.setdefault("created_at", "2026-09-06T00:00:00Z")
            row.setdefault("updated_at", "2026-09-06T00:00:00Z")
            row.setdefault("status", "available")
            r.data = [row]
        else:
            r.data = []
        return r


@pytest.fixture
def client(test_user):
    sb = MagicMock()
    sb.table.side_effect = lambda n: _Tbl(n)
    app.dependency_overrides[get_service_client] = lambda: sb
    app.dependency_overrides[get_supabase_client] = lambda: sb
    app.dependency_overrides[get_current_user] = lambda: test_user
    app.dependency_overrides[require_active_subscription] = lambda: test_user
    yield TestClient(app)
    app.dependency_overrides.clear()
    CAPTURED.clear()


def _body(**over):
    b = dict(
        title="Buziga home", description="Three bedroom",
        property_type="Residential", address="Buziga", city="Kampala",
        district="Kampala", state="Central", zip_code="", country="UG",
        bedrooms=3, bathrooms=2, monthly_rent=1500, security_deposit=1500,
    )
    b.update(over)
    return b


def test_usd_property_is_persisted_as_usd(client):
    resp = client.post("/properties", json=_body(rent_currency="USD"))
    assert resp.status_code == 201, resp.text
    assert CAPTURED["properties"]["rent_currency"] == "USD"
    assert resp.json()["rent_currency"] == "USD"


def test_kes_property(client):
    resp = client.post("/properties", json=_body(rent_currency="KES", city="Nairobi"))
    assert resp.status_code == 201, resp.text
    assert CAPTURED["properties"]["rent_currency"] == "KES"


def test_defaults_to_ugx_when_omitted(client):
    resp = client.post("/properties", json=_body())
    assert resp.status_code == 201, resp.text
    assert CAPTURED["properties"]["rent_currency"] == "UGX"
