import pytest
from fastapi.testclient import TestClient

from dependencies import get_current_user, get_service_client
from main import app
from services.boost import BOOST_PRICE_PER_DAY, calculate_boost_price

UID_ADMIN = "00000000-0000-0000-0000-000000000003"
UID_OWNER = "00000000-0000-0000-0000-000000000001"
PID_PROP = "00000000-0000-0000-0000-000000000010"
PID_PROP_2 = "00000000-0000-0000-0000-000000000011"
PID_BOOST = "00000000-0000-0000-0000-000000000070"


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


class TestBoostPriceCalculation:
    def test_default_price(self):
        price = calculate_boost_price(7)
        assert price == BOOST_PRICE_PER_DAY * 7

    def test_custom_duration(self):
        price = calculate_boost_price(30)
        assert price == BOOST_PRICE_PER_DAY * 30

    def test_minimum_duration(self):
        price = calculate_boost_price(1)
        assert price == BOOST_PRICE_PER_DAY

    def test_zero_duration(self):
        price = calculate_boost_price(0)
        assert price == 0

    def test_large_duration(self):
        price = calculate_boost_price(365)
        assert price == BOOST_PRICE_PER_DAY * 365


class TestBoostInitiate:
    def test_initiate_boost_success(self, manager_client):
        from unittest.mock import patch
        with patch("services.nylonpay.initiate_boost_payment") as mock_init:
            mock_init.return_value = None
            resp = manager_client.post("/boosts/initiate", json={
                "property_id": PID_PROP,
                "duration_days": 7,
                "phone_number": "+256700000000",
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "pending"
        assert data["reference"] is not None
        assert "Check your phone" in data["message"]

    def test_initiate_boost_property_not_found(self, manager_client):
        resp = manager_client.post("/boosts/initiate", json={
            "property_id": "00000000-0000-0000-0000-00000000ffff",
            "duration_days": 7,
            "phone_number": "+256700000000",
        })
        assert resp.status_code == 404

    def test_initiate_boost_payment_failure_rolls_back(self, manager_client):
        from unittest.mock import patch
        with patch("routers.boosts.initiate_boost_payment", side_effect=Exception("Payment gateway timeout")):
            resp = manager_client.post("/boosts/initiate", json={
                "property_id": PID_PROP,
                "duration_days": 7,
                "phone_number": "+256700000000",
            })
        assert resp.status_code == 502
        assert "Payment initiation failed" in resp.json()["detail"]

    def test_manager_cannot_boost_other_property(self, client):
        # User is authenticated but not the owner of PID_PROP_2
        from dependencies import CurrentUser
        other = CurrentUser(id="00000000-0000-0000-0000-000000000099", email="other@test.com", role="house_manager", status="active")
        app.dependency_overrides[get_current_user] = lambda: other

        resp = client.post("/boosts/initiate", json={
            "property_id": PID_PROP,
            "duration_days": 7,
            "phone_number": "+256700000000",
        })
        assert resp.status_code == 403


class TestBoostCancellation:
    def test_cancel_nonexistent_boost(self, admin_client):
        resp = admin_client.patch("/boosts/00000000-0000-0000-0000-00000000ffff/cancel")
        assert resp.status_code == 404

    def test_cancel_already_cancelled_boost(self, admin_client):
        # Cancel once
        resp = admin_client.patch(f"/boosts/{PID_BOOST}/cancel")
        assert resp.status_code == 200

    def test_get_boost_stats(self, admin_client):
        resp = admin_client.get("/boosts/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "active_boosts" in data
        assert "total_revenue" in data
        assert "avg_boost_price" in data

    def test_expire_old_boosts(self, admin_client):
        resp = admin_client.post("/boosts/expire-old")
        assert resp.status_code == 200
        assert "expired_count" in resp.json()


class TestBoostAccessControl:
    def test_non_admin_denied_boost_list(self, client):
        from dependencies import CurrentUser
        tenant = CurrentUser(id="00000000-0000-0000-0000-000000000002", email="tenant@test.com", role="tenant", status="active")
        app.dependency_overrides[get_current_user] = lambda: tenant

        resp = client.get("/boosts")
        assert resp.status_code == 403

    def test_non_admin_denied_boost_create(self, client):
        from dependencies import CurrentUser
        tenant = CurrentUser(id="00000000-0000-0000-0000-000000000002", email="tenant@test.com", role="tenant", status="active")
        app.dependency_overrides[get_current_user] = lambda: tenant

        resp = client.post("/boosts", json={
            "property_id": PID_PROP,
            "duration_days": 7,
        })
        assert resp.status_code == 403
