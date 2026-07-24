import pytest
from fastapi.testclient import TestClient

from dependencies import get_current_user, get_service_client
from main import app
from models.subscription import SUBSCRIPTION_PRICES, calculate_subscription_price

UID_ADMIN = "00000000-0000-0000-0000-000000000003"
UID_OWNER = "00000000-0000-0000-0000-000000000001"
PID_SUB = "00000000-0000-0000-0000-000000000080"


@pytest.fixture
def admin_client(client):
    from dependencies import CurrentUser
    admin = CurrentUser(id=UID_ADMIN, email="admin@test.com", role="super_admin", status="active")
    app.dependency_overrides[get_current_user] = lambda: admin
    return client


@pytest.fixture
def manager_client(client):
    from dependencies import CurrentUser
    manager = CurrentUser(id=UID_OWNER, email="manager@test.com", role="super_admin", status="active")
    app.dependency_overrides[get_current_user] = lambda: manager
    return client


class TestSubscriptionPriceCalculation:
    def test_3mo_price(self):
        assert calculate_subscription_price("3mo") == SUBSCRIPTION_PRICES["3mo"]

    def test_6mo_price(self):
        assert calculate_subscription_price("6mo") == SUBSCRIPTION_PRICES["6mo"]

    def test_12mo_price(self):
        assert calculate_subscription_price("12mo") == SUBSCRIPTION_PRICES["12mo"]

    def test_invalid_plan(self):
        assert calculate_subscription_price("invalid") == 0


class TestSubscriptionInitiate:
    def test_initiate_subscription_success(self, manager_client):
        from unittest.mock import patch
        with patch("services.nylonpay.initiate_boost_payment") as mock_init:
            mock_init.return_value = None
            resp = manager_client.post("/subscriptions/initiate", json={
                "plan_type": "3mo",
                "phone_number": "+256700000000",
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "pending"
        assert data["reference"] is not None
        assert "Check your phone" in data["message"]

    def test_initiate_invalid_plan(self, manager_client):
        resp = manager_client.post("/subscriptions/initiate", json={
            "plan_type": "invalid",
            "phone_number": "+256700000000",
        })
        assert resp.status_code == 400

    def test_initiate_payment_failure_rolls_back(self, manager_client):
        from unittest.mock import patch
        with patch("routers.subscriptions.initiate_boost_payment", side_effect=Exception("Payment gateway timeout")):
            resp = manager_client.post("/subscriptions/initiate", json={
                "plan_type": "6mo",
                "phone_number": "+256700000000",
            })
        assert resp.status_code == 502
        assert "Payment initiation failed" in resp.json()["detail"]


class TestSubscriptionMy:
    def test_get_my_subscription(self, manager_client):
        resp = manager_client.get("/subscriptions/my")
        assert resp.status_code == 200
        data = resp.json()
        assert data["plan_type"] == "12mo"
        assert data["status"] == "active"
        assert data["manager_id"] == UID_OWNER

    def test_get_my_subscription_not_found(self, client):
        from dependencies import CurrentUser
        other = CurrentUser(id="00000000-0000-0000-0000-000000000099", email="other@test.com", role="house_manager", status="active")
        app.dependency_overrides[get_current_user] = lambda: other
        resp = client.get("/subscriptions/my")
        assert resp.status_code == 404


class TestSubscriptionAdminEndpoints:
    def test_list_subscriptions(self, admin_client):
        resp = admin_client.get("/subscriptions")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    def test_get_subscription_by_id(self, admin_client):
        resp = admin_client.get(f"/subscriptions/{PID_SUB}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == PID_SUB

    def test_get_subscription_not_found(self, admin_client):
        resp = admin_client.get("/subscriptions/00000000-0000-0000-0000-00000000ffff")
        assert resp.status_code == 404

    def test_subscription_stats(self, admin_client):
        resp = admin_client.get("/subscriptions/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "active_subscriptions" in data
        assert "total_revenue" in data
        assert "plan_breakdown" in data

    def test_expire_old_subscriptions(self, admin_client):
        resp = admin_client.post("/subscriptions/expire-old")
        assert resp.status_code == 200
        assert "expired_count" in resp.json()

    def test_cancel_nonexistent_subscription(self, admin_client):
        resp = admin_client.patch("/subscriptions/00000000-0000-0000-0000-00000000ffff/cancel")
        assert resp.status_code == 404


class TestSubscriptionAccessControl:
    def test_tenant_cannot_list(self, client):
        from dependencies import CurrentUser
        tenant = CurrentUser(id="00000000-0000-0000-0000-000000000002", email="tenant@test.com", role="tenant", status="active")
        app.dependency_overrides[get_current_user] = lambda: tenant
        resp = client.get("/subscriptions")
        assert resp.status_code == 403

    def test_tenant_cannot_initiate(self, client):
        from dependencies import CurrentUser
        tenant = CurrentUser(id="00000000-0000-0000-0000-000000000002", email="tenant@test.com", role="tenant", status="active")
        app.dependency_overrides[get_current_user] = lambda: tenant
        resp = client.post("/subscriptions/initiate", json={
            "plan_type": "3mo",
            "phone_number": "+256700000000",
        })
        assert resp.status_code == 403
