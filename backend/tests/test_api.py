import pytest
from fastapi.testclient import TestClient

from dependencies import CurrentUser, get_current_user
from main import app

UID_OWNER = "00000000-0000-0000-0000-000000000001"
UID_ADMIN = "00000000-0000-0000-0000-000000000003"
PID_PROP = "00000000-0000-0000-0000-000000000010"
PID_PROP_2 = "00000000-0000-0000-0000-000000000011"
PID_TENANT = "00000000-0000-0000-0000-000000000020"
PID_LEASE = "00000000-0000-0000-0000-000000000030"
PID_PAYMENT = "00000000-0000-0000-0000-000000000040"
PID_MAINT = "00000000-0000-0000-0000-000000000050"
PID_BOOST = "00000000-0000-0000-0000-000000000070"


# Admin-authenticated test client for super-admin-only endpoints
@pytest.fixture
def admin_client(client):
    from dependencies import CurrentUser
    admin = CurrentUser(id=UID_ADMIN, email="admin@test.com", role="super_admin", status="active")
    app.dependency_overrides[get_current_user] = lambda: admin
    return client


class TestHealth:
    def test_root(self, client: TestClient):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "Afodabo Housing API"
        assert "version" in data

    def test_health(self, client: TestClient):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

    def test_metrics(self, client: TestClient):
        resp = client.get("/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert "requests_total" in data

    def test_endpoints(self, client: TestClient):
        resp = client.get("/api/endpoints")
        assert resp.status_code == 200
        assert "endpoints" in resp.json()


class TestProperties:
    def test_list_properties(self, client: TestClient):
        resp = client.get("/properties")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert data["items"][0]["address"] == "123 Main St"

    def test_list_public_properties(self, client: TestClient):
        resp = client.get("/properties/public")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_get_property(self, client: TestClient):
        resp = client.get(f"/properties/{PID_PROP}")
        assert resp.status_code == 200
        assert resp.json()["id"] == PID_PROP

    def test_get_property_not_found(self, client: TestClient):
        resp = client.get("/properties/00000000-0000-0000-0000-00000000ffff")
        assert resp.status_code == 404

    def test_get_public_property(self, client: TestClient):
        resp = client.get(f"/properties/public/{PID_PROP}")
        assert resp.status_code == 200
        assert resp.json()["city"] == "Kampala"

    def test_create_property(self, client: TestClient):
        payload = {
            "address": "456 Oak Ave",
            "city": "Jinja",
            "state": "Eastern",
            "zip_code": "67890",
            "property_type": "apartment",
            "bedrooms": 2,
            "bathrooms": 1,
            "monthly_rent": 800000,
            "security_deposit": 800000,
            "status": "available",
        }
        resp = client.post("/properties", json=payload)
        assert resp.status_code == 201

    def test_update_property(self, client: TestClient):
        resp = client.patch(f"/properties/{PID_PROP}", json={"monthly_rent": 2000000})
        assert resp.status_code == 200

    def test_update_property_not_found(self, client: TestClient):
        resp = client.patch("/properties/00000000-0000-0000-0000-00000000ffff", json={"monthly_rent": 1000})
        assert resp.status_code == 404

    def test_delete_property(self, client: TestClient):
        resp = client.delete(f"/properties/{PID_PROP}")
        assert resp.status_code == 204

    def test_delete_property_not_found(self, client: TestClient):
        resp = client.delete("/properties/00000000-0000-0000-0000-00000000ffff")
        assert resp.status_code == 404


class TestTenants:
    def test_list_tenants(self, client: TestClient):
        resp = client.get("/tenants")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1
        assert resp.json()["items"][0]["first_name"] == "John"

    def test_get_tenant(self, client: TestClient):
        resp = client.get(f"/tenants/{PID_TENANT}")
        assert resp.status_code == 200
        assert resp.json()["email"] == "john@example.com"

    def test_get_tenant_not_found(self, client: TestClient):
        resp = client.get("/tenants/00000000-0000-0000-0000-00000000ffff")
        assert resp.status_code == 404

    def test_create_tenant(self, client: TestClient):
        payload = {
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane@example.com",
            "phone": "+256711111111",
            "status": "active",
        }
        resp = client.post("/tenants", json=payload)
        assert resp.status_code == 201

    def test_update_tenant(self, client: TestClient):
        resp = client.patch(f"/tenants/{PID_TENANT}", json={"phone": "+256722222222"})
        assert resp.status_code == 200

    def test_update_tenant_not_found(self, client: TestClient):
        resp = client.patch("/tenants/00000000-0000-0000-0000-00000000ffff", json={"phone": "+256700000000"})
        assert resp.status_code == 404

    def test_delete_tenant(self, client: TestClient):
        resp = client.delete(f"/tenants/{PID_TENANT}")
        assert resp.status_code == 204

    def test_delete_tenant_not_found(self, client: TestClient):
        resp = client.delete("/tenants/00000000-0000-0000-0000-00000000ffff")
        assert resp.status_code == 404


class TestLeases:
    def test_list_leases(self, client: TestClient):
        resp = client.get("/leases")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_get_lease(self, client: TestClient):
        resp = client.get(f"/leases/{PID_LEASE}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "active"

    def test_get_lease_not_found(self, client: TestClient):
        resp = client.get("/leases/00000000-0000-0000-0000-00000000ffff")
        assert resp.status_code == 404

    def test_create_lease(self, client: TestClient):
        payload = {
            "property_id": PID_PROP,
            "tenant_id": PID_TENANT,
            "start_date": "2026-03-01",
            "end_date": "2027-02-28",
            "monthly_rent": 1500000,
            "security_deposit": 1500000,
        }
        resp = client.post("/leases", json=payload)
        assert resp.status_code == 201

    def test_update_lease(self, client: TestClient):
        resp = client.patch(f"/leases/{PID_LEASE}", json={"monthly_rent": 2000000})
        assert resp.status_code == 200

    def test_delete_lease(self, client: TestClient):
        resp = client.delete(f"/leases/{PID_LEASE}")
        assert resp.status_code == 204


class TestPayments:
    def test_list_payments(self, client: TestClient):
        from dependencies import CurrentUser
        owner = CurrentUser(id=UID_OWNER, email="owner@test.com", role="house_manager", status="active")
        app.dependency_overrides[get_current_user] = lambda: owner
        resp = client.get("/payments")
        assert resp.status_code == 200

    def test_get_payment(self, admin_client: TestClient):
        resp = admin_client.get(f"/payments/{PID_PAYMENT}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    def test_get_payment_not_found(self, admin_client: TestClient):
        resp = admin_client.get("/payments/00000000-0000-0000-0000-00000000ffff")
        assert resp.status_code == 404

    def test_create_payment(self, admin_client: TestClient):
        payload = {
            "lease_id": PID_LEASE,
            "tenant_id": PID_TENANT,
            "amount": 1500000,
            "payment_type": "rent",
            "due_date": "2026-03-01",
        }
        resp = admin_client.post("/payments", json=payload)
        assert resp.status_code == 201

    def test_update_payment(self, admin_client: TestClient):
        resp = admin_client.patch(f"/payments/{PID_PAYMENT}", json={"status": "completed"})
        assert resp.status_code == 200


class TestMaintenance:
    def test_list_by_property(self, client: TestClient):
        resp = client.get(f"/maintenance/property/{PID_PROP}")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_get_request(self, client: TestClient):
        resp = client.get(f"/maintenance/{PID_MAINT}")
        assert resp.status_code == 200
        assert resp.json()["title"] == "Leaky faucet"

    def test_get_request_not_found(self, client: TestClient):
        resp = client.get("/maintenance/00000000-0000-0000-0000-00000000ffff")
        assert resp.status_code == 404

    def test_create_request(self, client: TestClient):
        payload = {
            "property_id": PID_PROP,
            "title": "Broken window",
            "description": "Window in bedroom is cracked",
            "priority": "high",
        }
        resp = client.post("/maintenance", json=payload)
        assert resp.status_code == 201

    def test_update_request(self, client: TestClient):
        resp = client.patch(f"/maintenance/{PID_MAINT}", json={"status": "in_progress"})
        assert resp.status_code == 200

    def test_delete_request(self, client: TestClient):
        resp = client.delete(f"/maintenance/{PID_MAINT}")
        assert resp.status_code == 204


class TestAuth:
    def test_get_profile(self, client: TestClient):
        resp = client.get("/auth/profile")
        assert resp.status_code == 200
        assert resp.json()["role"] == "super_admin"

    def test_update_profile(self, client: TestClient):
        resp = client.patch("/auth/profile", json={"full_name": "Updated Name"})
        assert resp.status_code == 200

    def test_get_me(self, client: TestClient):
        resp = client.get("/auth/me")
        assert resp.status_code == 200
        assert "id" in resp.json()

    def test_get_roles(self, client: TestClient):
        resp = client.get("/auth/roles")
        assert resp.status_code == 200
        assert "role" in resp.json()


class TestBoosts:
    """Property boost system — super admin only, ranking verified."""

    def test_default_price(self, client: TestClient):
        resp = client.get("/boosts/price/default")
        assert resp.status_code == 200
        data = resp.json()
        assert data["duration_days"] == 7
        assert data["amount"] > 0
        assert data["currency"] == "UGX"

    def test_list_boosts(self, admin_client: TestClient):
        resp = admin_client.get("/boosts")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1

    def test_get_boost(self, admin_client: TestClient):
        resp = admin_client.get(f"/boosts/{PID_BOOST}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == PID_BOOST
        assert data["status"] == "active"
        # property_title may be None in mock since properties query may not resolve
        # but we check it exists in response
        assert "property_title" in data

    def test_get_boost_not_found(self, admin_client: TestClient):
        resp = admin_client.get("/boosts/00000000-0000-0000-0000-00000000ffff")
        assert resp.status_code == 404

    def test_create_boost(self, admin_client: TestClient):
        resp = admin_client.post("/boosts", json={
            "property_id": PID_PROP,
            "duration_days": 14,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "active"
        assert data["duration_days"] == 14
        # Price = 10000 * 14 = 140000
        assert float(data["amount_paid"]) == 140000.0

    def test_create_boost_property_not_found(self, admin_client: TestClient):
        resp = admin_client.post("/boosts", json={
            "property_id": "00000000-0000-0000-0000-00000000ffff",
            "duration_days": 7,
        })
        assert resp.status_code == 404

    def test_cancel_boost(self, admin_client: TestClient):
        resp = admin_client.patch(f"/boosts/{PID_BOOST}/cancel")
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    def test_cancel_boost_not_found(self, admin_client: TestClient):
        resp = admin_client.patch("/boosts/00000000-0000-0000-0000-00000000ffff/cancel")
        assert resp.status_code == 404

    def test_expire_old_boosts(self, admin_client: TestClient):
        resp = admin_client.post("/boosts/expire-old")
        assert resp.status_code == 200
        assert "expired_count" in resp.json()

    def test_boost_stats(self, admin_client: TestClient):
        resp = admin_client.get("/boosts/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "active_boosts" in data
        assert "total_revenue" in data

    def test_boosted_property_ranked_first(self, client: TestClient):
        """Boosted property (PID_PROP_2) must appear before non-boosted (PID_PROP)."""
        resp = client.get("/properties/public")
        assert resp.status_code == 200
        items = resp.json()["items"]
        # Both properties are available and should appear
        prop_ids = [p["id"] for p in items]
        assert PID_PROP_2 in prop_ids, "Boosted property must be in results"
        assert PID_PROP in prop_ids, "Non-boosted property must be in results"
        # Boosted property must come first
        idx_boosted = prop_ids.index(PID_PROP_2)
        idx_normal = prop_ids.index(PID_PROP)
        assert idx_boosted < idx_normal, (
            f"Boosted property {PID_PROP_2} at index {idx_boosted} must come "
            f"before non-boosted {PID_PROP} at index {idx_normal}"
        )
