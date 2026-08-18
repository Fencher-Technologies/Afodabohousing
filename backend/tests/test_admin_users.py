from dependencies import CurrentUser
from tests.conftest import UID_ADMIN

MANAGER_ID = "00000000-0000-0000-0000-000000000071"
PROP_ID = "00000000-0000-0000-0000-000000000072"
BOOST_ID = "00000000-0000-0000-0000-000000000073"

ADMIN = CurrentUser(id=UID_ADMIN, email="admin@test.com", role="authenticated")


def _seeds():
    return {
        "profiles": [
            {
                "id": UID_ADMIN,
                "user_id": UID_ADMIN,
                "email": "admin@test.com",
                "role": "super_admin",
                "full_name": "Admin User",
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            },
            {
                "id": MANAGER_ID,
                "user_id": MANAGER_ID,
                "email": "mgr@test.com",
                "role": "house_manager",
                "full_name": "Manager One",
                "created_at": "2026-02-01T00:00:00Z",
                "updated_at": "2026-02-01T00:00:00Z",
            },
        ],
        "manager_subscriptions": [
            {
                "id": "sub-mgr",
                "manager_id": MANAGER_ID,
                "plan_id": "12mo",
                "status": "pending",
                "started_at": None,
                "expires_at": None,
                "auto_renew": True,
                "payment_reference": "4cebc908-8a25-45e9-a147-7b6fbdb1aabb",
                "payment_status": "pending",
                "created_at": "2026-03-01T00:00:00Z",
                "updated_at": "2026-03-01T00:00:00Z",
            }
        ],
        "tenants": [
            {
                "id": "00000000-0000-0000-0000-000000000080",
                "owner_id": MANAGER_ID,
                "user_id": "00000000-0000-0000-0000-000000000081",
                "first_name": "Grace",
                "last_name": "Akello",
                "email": "grace@test.com",
                "phone": "+256700000001",
                "status": "active",
                "created_at": "2026-03-01T00:00:00Z",
                "updated_at": "2026-03-01T00:00:00Z",
            }
        ],
        "properties": [
            {
                "id": PROP_ID,
                "owner_id": MANAGER_ID,
                "title": "Manager Flat",
                "address": "1 Mgmt Rd",
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
                "description": "",
                "amenities": [],
                "images": [],
                "is_active": True,
                "is_boosted": True,
                "created_at": "2026-03-01T00:00:00Z",
                "updated_at": "2026-03-01T00:00:00Z",
            }
        ],
        "leases": [
            {
                "id": "00000000-0000-0000-0000-000000000075",
                "owner_id": MANAGER_ID,
                "property_id": PROP_ID,
                "tenant_id": "00000000-0000-0000-0000-000000000080",
                "monthly_rent": 0,
                "status": "active",
                "start_date": "2026-03-01",
                "end_date": "2026-12-31",
                "rent_effective_date": "2026-03-01",
                "created_at": "2026-03-01T00:00:00Z",
            }
        ],
        "payments": [
            {
                "id": "00000000-0000-0000-0000-000000000074",
                "lease_id": "00000000-0000-0000-0000-000000000075",
                "amount": 500000,
                "status": "confirmed",
                "paid_date": "2026-03-10T00:00:00Z",
                "created_at": "2026-03-10T00:00:00Z",
            }
        ],
        "property_boosts": [
            {
                "id": BOOST_ID,
                "property_id": PROP_ID,
                "manager_id": MANAGER_ID,
                "amount_paid": 20000,
                "duration_days": 30,
                "started_at": "2026-04-01T00:00:00Z",
                "expires_at": "2126-05-01T00:00:00Z",
                "status": "active",
                "transaction_id": None,
                "payment_method": None,
                "created_at": "2026-04-01T00:00:00Z",
                "updated_at": "2026-04-01T00:00:00Z",
            }
        ],
    }


def test_admin_users_list_is_lightweight(seeded_client):
    client = seeded_client(user=ADMIN, seeds=_seeds())
    resp = client.get("/admin/users?role=house_manager")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    m = data[0]
    assert m["subscription_plan"] == "1 Year"
    assert m["subscription_status"] == "pending"
    assert m["boosted_count"] == 1
    assert m["property_count"] == 0
    assert m["overdue_tenants"] == 0


def test_admin_users_list_keeps_other_roles(seeded_client):
    client = seeded_client(user=ADMIN, seeds=_seeds())
    resp = client.get("/admin/users")
    assert resp.status_code == 200
    data = resp.json()
    assert any(u["role"] == "house_manager" for u in data)
    assert any(u["role"] == "super_admin" for u in data)
    admin_row = next(u for u in data if u["role"] == "super_admin")
    assert admin_row["subscription_plan"] is None


def test_admin_users_list_forbidden_for_non_admin(seeded_client):
    from tests.test_subscription_guard import TENANT

    client = seeded_client(user=TENANT, seeds=None)
    resp = client.get("/admin/users")
    assert resp.status_code == 403


def test_admin_user_detail_full(seeded_client):
    client = seeded_client(user=ADMIN, seeds=_seeds())
    resp = client.get(f"/admin/users/{MANAGER_ID}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["property_count"] == 1
    assert data["boosted_count"] == 1
    assert data["tenants_count"] == 1
    assert data["subscription_plan"] == "1 Year"
    assert data["subscription_status"] == "pending"
    assert data["subscription_id"] == "sub-mgr"
    assert data["subscription_days_remaining"] == 0
    assert data["overdue_tenants"] == 0
    assert len(data["properties"]) == 1
    p = data["properties"][0]
    assert p["id"] == PROP_ID
    assert p["title"] == "Manager Flat"
    assert p["monthly_rent"] == 800000
    assert p["is_boosted"] is True
    kinds = [a["kind"] for a in data["activity"]]
    assert "property" in kinds
    assert "boost" in kinds
    assert "subscription" in kinds
    assert "payment" in kinds
    timestamps = [a["timestamp"] for a in data["activity"]]
    assert timestamps == sorted(timestamps, reverse=True)


def test_admin_confirm_subscription_activates(seeded_client):
    client = seeded_client(user=ADMIN, seeds=_seeds())
    resp = client.post("/admin/subscriptions/sub-mgr/confirm", json={"paid_amount": 100000})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert data["payment_status"] == "completed"
    assert data["days_remaining"] > 0


def test_admin_confirm_subscription_amount_mismatch(seeded_client):
    client = seeded_client(user=ADMIN, seeds=_seeds())
    resp = client.post("/admin/subscriptions/sub-mgr/confirm", json={"paid_amount": 5000})
    assert resp.status_code == 400


def test_admin_confirm_subscription_not_found(seeded_client):
    client = seeded_client(user=ADMIN, seeds=_seeds())
    resp = client.post("/admin/subscriptions/does-not-exist/confirm", json={"paid_amount": 100000})
    assert resp.status_code == 404


def test_admin_user_detail_not_found(seeded_client):
    client = seeded_client(user=ADMIN, seeds=_seeds())
    resp = client.get("/admin/users/00000000-0000-0000-0000-00000000ffff")
    assert resp.status_code == 404