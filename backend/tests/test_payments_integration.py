# mypy: ignore-errors
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from dependencies import get_current_user
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

    def test_payment_pagination(self, owner_client: TestClient):
        resp = owner_client.get("/payments?skip=0&limit=5")
        assert resp.status_code == 200
        data = resp.json()
        assert data["skip"] == 0
        assert data["limit"] == 5
        assert len(data["items"]) <= 5

    def test_create_missing_required_fields(self, owner_client: TestClient):
        resp = owner_client.post("/payments", json={"amount": 500000})
        assert resp.status_code == 422

    def test_delete_payment(self, owner_client: TestClient):
        resp = owner_client.delete(f"/payments/{PID_PAYMENT}")
        assert resp.status_code == 204

    def test_delete_payment_not_found(self, owner_client: TestClient):
        resp = owner_client.delete("/payments/00000000-0000-0000-0000-00000000ffff")
        assert resp.status_code == 404


class TestPesapalInitiation:
    def test_rejects_missing_required_fields(self, owner_client: TestClient):
        resp = owner_client.post("/payments/initiate-pesapal", json={
            "amount": 1500000,
        })
        assert resp.status_code == 422

    def test_returns_503_when_credentials_missing(self, owner_client: TestClient):
        with patch("services.pesapal._check_credentials", side_effect=RuntimeError("credentials not configured")):
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
            assert resp.status_code == 503

    @pytest.mark.skip(reason="Requires live Pesapal credentials — run manually to test full flow")
    def test_e2e_initiate_pesapal(self, owner_client: TestClient):
        resp = owner_client.post("/payments/initiate-pesapal", json={
            "amount": 1000,
            "callback_url": "https://example.com/callback",
            "description": "Test payment",
            "email": "test@test.com",
            "first_name": "Test",
            "last_name": "User",
            "payment_id": str(PID_PAYMENT),
            "phone": "+256700000000",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True or data["success"] is False
