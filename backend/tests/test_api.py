from fastapi.testclient import TestClient

PID_PROP = "00000000-0000-0000-0000-000000000010"
PID_TENANT = "00000000-0000-0000-0000-000000000020"
PID_LEASE = "00000000-0000-0000-0000-000000000030"
PID_PAYMENT = "00000000-0000-0000-0000-000000000040"
PID_MAINT = "00000000-0000-0000-0000-000000000050"


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

    def test_http_errors_are_standardized(self, client: TestClient):
        resp = client.post(
            "/auth/signup",
            json={"email": "new@example.com", "password": "secret123", "role": "invalid"},
        )
        assert resp.status_code == 400
        data = resp.json()
        assert data["detail"] == "Invalid role"
        assert data["status_code"] == 400
        assert data["error"] == "http_exception"
        assert data["request_id"]

    def test_validation_errors_are_standardized(self, client: TestClient):
        resp = client.post(
            "/auth/signup",
            json={"email": "not-an-email", "password": "secret123", "role": "tenant"},
        )
        assert resp.status_code == 422
        data = resp.json()
        assert data["detail"] == "Request validation failed"
        assert data["status_code"] == 422
        assert data["error"] == "validation_error"
        assert data["request_id"]
        assert isinstance(data["errors"], list)


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
            "property_type": "Residential",
            "bedrooms": 2,
            "bathrooms": 1,
            "monthly_rent": 800000,
            "security_deposit": 800000,
            "status": "available",
        }
        resp = client.post("/properties", json=payload)
        assert resp.status_code == 201

    def test_create_property_rejects_invalid_property_type(self, client: TestClient):
        payload = {
            "address": "789 Market Rd",
            "city": "Kampala",
            "state": "Central",
            "zip_code": "00000",
            "property_type": "warehouse",
            "bedrooms": 2,
            "bathrooms": 1,
            "monthly_rent": 1200000,
            "security_deposit": 1200000,
            "status": "available",
        }
        resp = client.post("/properties", json=payload)
        assert resp.status_code == 422

    def test_update_property(self, client: TestClient):
        resp = client.patch(f"/properties/{PID_PROP}", json={"monthly_rent": 2000000})
        assert resp.status_code == 200

    def test_update_property_rejects_invalid_property_type(self, client: TestClient):
        resp = client.patch(f"/properties/{PID_PROP}", json={"property_type": "studio"})
        assert resp.status_code == 422

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
        resp = client.get("/payments")
        assert resp.status_code == 200

    def test_get_payment(self, client: TestClient):
        resp = client.get(f"/payments/{PID_PAYMENT}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    def test_get_payment_not_found(self, client: TestClient):
        resp = client.get("/payments/00000000-0000-0000-0000-00000000ffff")
        assert resp.status_code == 404

    def test_create_payment(self, client: TestClient):
        payload = {
            "lease_id": PID_LEASE,
            "tenant_id": PID_TENANT,
            "amount": 1500000,
            "payment_type": "rent",
            "due_date": "2026-03-01",
        }
        resp = client.post("/payments", json=payload)
        assert resp.status_code == 201

    def test_update_payment(self, client: TestClient):
        resp = client.patch(f"/payments/{PID_PAYMENT}", json={"status": "completed"})
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
        assert resp.json()["role"] == "admin"

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
