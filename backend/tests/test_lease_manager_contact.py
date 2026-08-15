# mypy: ignore-errors
import pytest
from fastapi.testclient import TestClient

from dependencies import get_current_user
from main import app
from services.crud import _clean_contact

PID_TENANT = "00000000-0000-0000-0000-000000000020"
UID_TENANT_USER = "00000000-0000-0000-0000-000000000002"
UID_OWNER = "00000000-0000-0000-0000-000000000001"


@pytest.fixture
def tenant_client(client: TestClient):
    from dependencies import CurrentUser

    tenant = CurrentUser(
        id=UID_TENANT_USER,
        email="tenant@test.com",
        role="tenant",
        status="active",
    )
    app.dependency_overrides[get_current_user] = lambda: tenant
    return client


class TestCleanContact:
    def test_normalizes_blank_values(self):
        assert _clean_contact(None) is None
        assert _clean_contact("") is None
        assert _clean_contact("   ") is None
        assert _clean_contact("\t \n") is None

    def test_strips_surrounding_whitespace(self):
        assert _clean_contact("  manager@axis.app  ") == "manager@axis.app"
        assert _clean_contact("+256700000000") == "+256700000000"


class TestManagerContactOnTenantLeases:
    def test_surfaces_manager_email_from_profile(self, tenant_client: TestClient):
        resp = tenant_client.get("/leases")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1
        lease = resp.json()["items"][0]
        assert lease["manager_name"] == "Test User"
        assert lease["manager_email"] == "test@test.com"

    def test_manager_phone_falls_back_to_none_not_blank(self, tenant_client: TestClient):
        resp = tenant_client.get("/leases")
        assert resp.status_code == 200
        lease = resp.json()["items"][0]
        assert lease["manager_phone"] is None
