import pytest
from fastapi.testclient import TestClient

from dependencies import get_current_user, get_supabase_client
from main import app

UID_OWNER = "00000000-0000-0000-0000-000000000001"
PID_LEASE = "00000000-0000-0000-0000-000000000030"
PID_TENANT = "00000000-0000-0000-0000-000000000020"
PID_PAYMENT = "00000000-0000-0000-0000-000000000040"


@pytest.fixture
def owner_client(client):
    from dependencies import CurrentUser
    owner = CurrentUser(id=UID_OWNER, email="owner@test.com", role="house_manager", status="active")
    app.dependency_overrides[get_current_user] = lambda: owner
    return client


class TestPaymentLifecycle:
    def test_full_create_and_retrieve(self, owner_client: TestClient):
        resp = owner_client.post("/payments", json={
            "lease_id": PID_LEASE,
            "tenant_id": PID_TENANT,
            "amount": 1500000,
            "payment_type": "rent",
            "due_date": "2026-04-01",
        })
        assert resp.status_code == 201
        created = resp.json()
        assert float(created["amount"]) == 1500000
        assert created["status"] == "pending"
        assert created["payment_type"] == "rent"

    def test_list_payments(self, owner_client: TestClient):
        resp = owner_client.get("/payments")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 0

    def test_update_payment_status(self, owner_client: TestClient):
        resp = owner_client.patch(f"/payments/{PID_PAYMENT}", json={"status": "completed"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    def test_get_payment_not_found(self, owner_client: TestClient):
        resp = owner_client.get("/payments/00000000-0000-0000-0000-00000000ffff")
        assert resp.status_code == 404

    def test_update_payment_not_found(self, owner_client: TestClient):
        resp = owner_client.patch(
            "/payments/00000000-0000-0000-0000-00000000ffff",
            json={"status": "completed"},
        )
        assert resp.status_code == 404

    def test_tenant_cannot_access_payments(self, client):
        from dependencies import CurrentUser
        tenant_user = CurrentUser(id="00000000-0000-0000-0000-000000000002", email="tenant@test.com", role="tenant")
        app.dependency_overrides[get_current_user] = lambda: tenant_user

        resp = client.get("/payments")
        assert resp.status_code == 403

    def test_payment_pagination(self, owner_client: TestClient):
        resp = owner_client.get("/payments?skip=0&limit=5")
        assert resp.status_code == 200
        data = resp.json()
        assert data["skip"] == 0
        assert data["limit"] == 5
        assert len(data["items"]) <= 5


class TestPesapalInitiation:
    def test_initiate_pesapal_removed(self, owner_client: TestClient):
        """Pesapal rent payment endpoint removed — now only for subscriptions."""
        resp = owner_client.post("/payments/initiate-pesapal", json={
            "amount": 1500000,
            "callback_url": "https://example.com/callback",
            "description": "Rent payment",
            "email": "test@test.com",
            "first_name": "Test",
            "last_name": "User",
            "payment_id": str(PID_PAYMENT),
            "phone": "+256700000000",
        })
        assert resp.status_code == 405


class TestNylonPayInitiation:
    def test_initiate_nylonpay_removed(self, owner_client: TestClient):
        """NylonPay rent payment endpoint removed — now only for subscriptions."""
        resp = owner_client.post("/payments/initiate-nylonpay", json={
            "amount": 1500000,
            "phone_number": "+256700000000",
            "description": "Rent payment",
            "payment_id": str(PID_PAYMENT),
            "first_name": "Test",
            "last_name": "User",
        })
        assert resp.status_code == 405
