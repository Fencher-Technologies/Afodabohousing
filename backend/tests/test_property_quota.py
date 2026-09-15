# mypy: ignore-errors
"""Subscription property-limit enforcement (POST /properties + GET /subscriptions/quota)."""
from dependencies import CurrentUser
from tests.conftest import UID_OWNER

MANAGER = CurrentUser(id=UID_OWNER, email="owner@test.com", role="house_manager", status="active")


def _plan(plan_id="1mo", max_properties=3, max_tenants=10):
    return {
        "id": plan_id,
        "name": "1 Month",
        "duration_days": 30,
        "price_usd": 5.0,
        "price_ugx": 20000.0,
        "benefits": [],
        "is_active": True,
        "sort_order": 0,
        "popular": False,
        "max_properties": max_properties,
        "max_tenants": max_tenants,
        "created_at": "2026-01-01T00:00:00Z",
    }


def _sub(plan_id="1mo", status="active", expires_at="2126-01-01T00:00:00Z"):
    return {
        "id": "sub-1",
        "manager_id": UID_OWNER,
        "plan_id": plan_id,
        "status": status,
        "started_at": "2026-01-01T00:00:00Z",
        "expires_at": expires_at,
        "auto_renew": True,
        "payment_reference": "ref-1",
        "payment_status": "completed",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


def _prop(pid, active=True):
    return {
        "id": pid,
        "owner_id": UID_OWNER,
        "title": f"Place {pid[-2:]}",
        "address": "123 Main St",
        "city": "Kampala",
        "state": "Central",
        "zip_code": "12345",
        "country": "UG",
        "property_type": "house",
        "bedrooms": 2,
        "bathrooms": 1.0,
        "monthly_rent": 500000,
        "security_deposit": 500000,
        "status": "available",
        "is_active": active,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }


def _payload():
    return {
        "title": "New Place",
        "address": "1 New Rd",
        "city": "Kampala",
        "state": "Central",
        "property_type": "house",
        "monthly_rent": 500000,
        "security_deposit": 500000,
    }


def _seeds(n_active, plan=None, sub=None, n_inactive=0):
    plans = [plan or _plan()]
    subs = [sub] if sub is not None else [_sub()]
    props = [_prop(f"00000000-0000-0000-0000-0000000001{i:02d}") for i in range(n_active)]
    props += [_prop(f"00000000-0000-0000-0000-0000000002{i:02d}", active=False) for i in range(n_inactive)]
    return {"subscription_plans": plans, "manager_subscriptions": subs, "properties": props}


def test_under_limit_create_succeeds(seeded_client):
    client = seeded_client(user=MANAGER, seeds=_seeds(2))
    resp = client.post("/properties", json=_payload())
    assert resp.status_code == 201, resp.text


def test_at_limit_refused_with_code(seeded_client):
    client = seeded_client(user=MANAGER, seeds=_seeds(3))
    resp = client.post("/properties", json=_payload())
    assert resp.status_code == 403, resp.text
    detail = resp.json()["detail"]
    assert detail["code"] == "property_limit_reached"
    assert detail["properties_used"] == 3
    assert detail["max_properties"] == 3
    assert detail["plan_name"] == "1 Month"
    assert "Upgrade your subscription" in detail["message"]


def test_over_limit_grandfathered_readable_but_create_refused(seeded_client):
    client = seeded_client(user=MANAGER, seeds=_seeds(6))
    listed = client.get("/properties")
    assert listed.status_code == 200
    assert listed.json()["total"] == 6
    resp = client.post("/properties", json=_payload())
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "property_limit_reached"


def test_inactive_listings_do_not_consume_slots(seeded_client):
    # 3 active + 2 inactive on a limit-3 plan: used must be 3 (not 5),
    # so the create is still refused — but for the right count.
    client = seeded_client(user=MANAGER, seeds=_seeds(3, n_inactive=2))
    quota = client.get("/subscriptions/quota").json()
    assert quota["properties_used"] == 3
    assert client.post("/properties", json=_payload()).status_code == 403
    # 2 active + 2 inactive: one free slot remains.
    client2 = seeded_client(user=MANAGER, seeds=_seeds(2, n_inactive=2))
    assert client2.get("/subscriptions/quota").json()["properties_used"] == 2
    assert client2.post("/properties", json=_payload()).status_code == 201


def test_deactivating_frees_a_slot(seeded_client):
    seeds = _seeds(3)
    client = seeded_client(user=MANAGER, seeds=seeds)
    assert client.post("/properties", json=_payload()).status_code == 403
    pid = seeds["properties"][0]["id"]
    patch = client.patch(f"/properties/{pid}", json={"is_active": False})
    assert patch.status_code == 200, patch.text
    assert client.post("/properties", json=_payload()).status_code == 201


def test_unlimited_plan_create_succeeds(seeded_client):
    plan = _plan(plan_id="12mo", max_properties=None, max_tenants=None)
    client = seeded_client(user=MANAGER, seeds=_seeds(30, plan=plan, sub=_sub(plan_id="12mo")))
    resp = client.post("/properties", json=_payload())
    assert resp.status_code == 201, resp.text


def test_no_active_subscription_refused(seeded_client):
    client = seeded_client(user=MANAGER, seeds={"subscription_plans": [_plan()], "manager_subscriptions": [], "properties": []})
    resp = client.post("/properties", json=_payload())
    assert resp.status_code == 403, resp.text
    assert resp.json()["detail"]["code"] == "no_active_subscription"


def test_expired_subscription_refused(seeded_client):
    sub = _sub(status="active", expires_at="2020-01-01T00:00:00Z")
    client = seeded_client(user=MANAGER, seeds=_seeds(0, sub=sub))
    resp = client.post("/properties", json=_payload())
    assert resp.status_code == 403, resp.text
    assert resp.json()["detail"]["code"] == "no_active_subscription"


def test_quota_endpoint_reports_usage(seeded_client):
    client = seeded_client(user=MANAGER, seeds=_seeds(2))
    resp = client.get("/subscriptions/quota")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body == {
        "properties_used": 2,
        "max_properties": 3,
        "can_add_property": True,
        "plan_id": "1mo",
        "plan_name": "1 Month",
        "has_active_subscription": True,
    }


def test_quota_endpoint_unlimited(seeded_client):
    plan = _plan(plan_id="12mo", max_properties=None, max_tenants=None)
    client = seeded_client(user=MANAGER, seeds=_seeds(9, plan=plan, sub=_sub(plan_id="12mo")))
    body = client.get("/subscriptions/quota").json()
    assert body["max_properties"] is None
    assert body["can_add_property"] is True
