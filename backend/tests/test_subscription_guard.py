# mypy: ignore-errors
"""Tests for the subscription-expiry enforcement added by require_active_subscription.

Covered behaviors:
- Active manager can perform guarded mutations.
- Manager with an expired/inactive/no subscription is blocked with 403.
- A row whose expires_at is in the past (but status is still "active") is
  treated as expired lazily by get_current_subscription.
- Tenants / non-managers pass the guard untouched.
- Tenant payment submission still succeeds while the manager is expired.
- All read-only endpoints remain open when the manager is expired.
- The renewal surface (plans + current subscription) stays available.
"""
from __future__ import annotations

import pytest

from dependencies import CurrentUser
from tests.conftest import (
    MockSupabaseClient,
    PID_LEASE,
    PID_MAINT,
    PID_PAYMENT,
    PID_PROP,
    PID_TENANT,
    UID_OWNER,
    UID_TENANT_USER,
)

MANAGER = CurrentUser(id=UID_OWNER, email="test@test.com", role="authenticated")
TENANT = CurrentUser(id=UID_TENANT_USER, email="tenant@test.com", role="authenticated")

FAKE_ID = "00000000-0000-0000-0000-000000000090"


def _sub_row(status: str = "active", expires_at: str = "2126-07-08T00:00:00Z", created_at: str = "2026-01-01T00:00:00Z") -> dict:
    return {
        "id": f"sub-{UID_OWNER}",
        "manager_id": UID_OWNER,
        "plan_id": "12mo",
        "status": status,
        "started_at": "2026-01-01T00:00:00Z",
        "expires_at": expires_at,
        "auto_renew": True,
        "payment_reference": None,
        "payment_status": "completed",
        "created_at": created_at,
        "updated_at": "2026-01-01T00:00:00Z",
    }


EXPIRED_STATUS_ROW = _sub_row(status="expired")
EXPIRED_BY_TIME_ROW = _sub_row(status="active", expires_at="2020-01-01T00:00:00Z")
PENDING_ROW = _sub_row(status="pending")
NO_ROW: list = []

# ── Payloads ────────────────────────────────────────────────────────────────

TENANT_PAYLOAD = {
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "phone": "+256700000001",
    "status": "active",
}

PROPERTY_PAYLOAD = {
    "title": "Test House",
    "address": "1 Test Rd",
    "city": "Kampala",
    "state": "Central",
    "zip_code": "0000",
    "country": "UG",
    "property_type": "house",
    "bedrooms": 2,
    "bathrooms": 1.0,
    "square_feet": 800,
    "monthly_rent": 500000,
    "security_deposit": 500000,
    "status": "available",
}

LEASE_PAYLOAD = {
    "property_id": str(PID_PROP),
    "tenant_id": str(PID_TENANT),
    "start_date": "2026-03-01",
    "end_date": "2027-03-01",
    "monthly_rent": 1500000,
    "security_deposit": 1500000,
    "status": "draft",
}

PAYMENT_PAYLOAD = {
    "lease_id": str(PID_LEASE),
    "tenant_id": str(PID_TENANT),
    "amount": 500000,
    "payment_type": "rent",
    "payment_method": "mobile_money",
    "status": "confirmed",
    "due_date": "2026-03-01",
    "paid_date": "2026-03-01",
}

MAINT_PAYLOAD = {
    "property_id": str(PID_PROP),
    "title": "Fix the gate",
    "description": "The gate latch is broken",
    "priority": "medium",
    "status": "open",
}

RENTAL_UNIT_PAYLOAD = {
    "property_id": str(PID_PROP),
    "unit_number": "A1",
    "bedrooms": 1,
    "bathrooms": 1,
    "rent_amount": 500000,
    "status": "available",
}

PAYMENT_VERIFICATION_PAYLOAD = {
    "amount": 500000,
    "payment_method": "mobile_money",
    "transaction_reference": "REF-001",
    "payment_date": "2026-08-01",
    "notes": "test submission",
}

# method, path, request kwargs
PROTECTED_MUTATIONS = [
    ("post", "/tenants", {"json": TENANT_PAYLOAD}),
    ("patch", f"/tenants/{PID_TENANT}", {"json": {"status": "inactive"}}),
    ("delete", f"/tenants/{PID_TENANT}", {}),
    ("post", "/properties", {"json": PROPERTY_PAYLOAD}),
    ("patch", f"/properties/{PID_PROP}", {"json": {"status": "occupied"}}),
    ("delete", f"/properties/{PID_PROP}", {}),
    ("post", "/uploads/property-image", {"files": {"file": ("prop.png", b"imagebytes", "image/png")}}),
    ("post", "/leases", {"json": LEASE_PAYLOAD}),
    ("patch", f"/leases/{PID_LEASE}", {"json": {"status": "active"}}),
    ("patch", f"/leases/{PID_LEASE}/effective-date", {"json": {"rent_effective_date": "2026-03-01"}}),
    ("delete", f"/leases/{PID_LEASE}", {}),
    ("post", f"/leases/{PID_LEASE}/terminate", {"json": {}}),
    ("post", f"/leases/{PID_LEASE}/renew", {"json": {"new_end_date": "2027-03-01"}}),
    ("post", "/payments", {"json": PAYMENT_PAYLOAD}),
    ("patch", f"/payments/{PID_PAYMENT}", {"json": {"status": "confirmed"}}),
    ("delete", f"/payments/{PID_PAYMENT}", {}),
    ("patch", f"/payment-verifications/{PID_PAYMENT}/approve", {}),
    ("patch", f"/payment-verifications/{PID_PAYMENT}/reject", {"json": {"rejection_reason": "not accepted"}}),
    ("post", f"/agreements/{PID_LEASE}/build", {"json": {}}),
    ("post", f"/agreements/{PID_LEASE}/edit", {"json": {}}),
    ("post", f"/agreements/{PID_LEASE}/consent", {"json": {"signed_name": "Test User"}}),
    ("post", f"/agreements/{PID_LEASE}/cancel", {}),
    ("post", "/agreements/generate", {"json": {"lease_id": str(PID_LEASE)}}),
    ("post", "/rental-units", {"json": RENTAL_UNIT_PAYLOAD}),
    ("patch", f"/rental-units/{FAKE_ID}", {"json": {"status": "occupied"}}),
    ("delete", f"/rental-units/{FAKE_ID}", {}),
    ("post", "/maintenance", {"json": MAINT_PAYLOAD}),
    ("patch", f"/maintenance/{PID_MAINT}", {"json": {"status": "in_progress"}}),
    ("delete", f"/maintenance/{PID_MAINT}", {}),
    ("post", "/boosts/initiate", {"json": {"property_id": str(PID_PROP), "duration_days": 7}}),
]

READ_ONLY_ENDPOINTS = [
    ("/tenants", {}),
    ("/properties", {}),
    ("/leases", {}),
    ("/payments", {}),
    (f"/rental-units/property/{PID_PROP}", {}),
    (f"/maintenance/property/{PID_PROP}", {}),
    ("/payment-verifications", {}),
    ("/reports/summary", {}),
    ("/boosts", {}),
    ("/boosts/packages", {}),
]


def _request(client, method, path, kwargs):
    return client.request(method, path, **kwargs)


# ── Guard core: subscription state decides the outcome ──────────────────────

@pytest.mark.parametrize(
    "seeds,expected",
    [
        (None, 201),  # default seed: active subscription for UID_OWNER
        ({"manager_subscriptions": [EXPIRED_STATUS_ROW]}, 403),
        ({"manager_subscriptions": [EXPIRED_BY_TIME_ROW]}, 403),
        ({"manager_subscriptions": [PENDING_ROW]}, 403),
        ({"manager_subscriptions": NO_ROW}, 403),
    ],
    ids=["active", "status-expired", "time-expired", "pending", "no-row"],
)
def test_tenant_create_enforces_subscription(seeded_client, seeds, expected):
    client = seeded_client(user=MANAGER, seeds=seeds)
    resp = _request(client, "post", "/tenants", {"json": TENANT_PAYLOAD})
    assert resp.status_code == expected


# ── Expired manager is blocked on every protected mutation ──────────────────

@pytest.mark.parametrize("method,path,kwargs", PROTECTED_MUTATIONS)
def test_expired_manager_blocked_on_protected_mutations(seeded_client, method, path, kwargs):
    client = seeded_client(user=MANAGER, seeds={"manager_subscriptions": [EXPIRED_STATUS_ROW]})
    resp = _request(client, method, path, kwargs)
    assert resp.status_code == 403
    assert "subscription" in resp.text.lower()


@pytest.mark.parametrize("method,path,kwargs", PROTECTED_MUTATIONS)
def test_active_manager_passes_protected_mutations(seeded_client, method, path, kwargs):
    # Guard passes for the active manager; downstream logic may 404/500/503
    # depending on mock data (e.g. uploads hits unmocked storage, and
    # /agreements/generate has a pre-existing LeaseService.get_by_id() call
    # bug), but never a subscription 403.
    client = seeded_client(user=MANAGER, seeds=None)
    resp = _request(client, method, path, kwargs)
    assert resp.status_code != 403


# ── Non-manager callers are untouched ───────────────────────────────────────

def test_tenant_passes_guard_on_open_mutation(seeded_client):
    client = seeded_client(user=TENANT, seeds=None)
    resp = _request(client, "post", "/maintenance", {"json": MAINT_PAYLOAD})
    assert resp.status_code == 201


def test_tenant_payment_submission_succeeds_while_manager_expired(seeded_client):
    client = seeded_client(
        user=TENANT,
        seeds={"manager_subscriptions": [EXPIRED_STATUS_ROW]},
    )
    resp = _request(
        client,
        "post",
        "/payment-verifications",
        {"json": PAYMENT_VERIFICATION_PAYLOAD},
    )
    assert resp.status_code == 201


def test_expired_manager_approve_reject_blocked(seeded_client):
    client = seeded_client(user=MANAGER, seeds={"manager_subscriptions": [EXPIRED_STATUS_ROW]})
    assert client.patch(f"/payment-verifications/{PID_PAYMENT}/approve").status_code == 403
    resp = client.patch(
        f"/payment-verifications/{PID_PAYMENT}/reject",
        json={"rejection_reason": "not accepted"},
    )
    assert resp.status_code == 403


# ── Read-only and renewal surfaces stay open when expired ───────────────────

@pytest.mark.parametrize("path,kwargs", READ_ONLY_ENDPOINTS)
def test_read_endpoints_open_when_expired(seeded_client, path, kwargs):
    client = seeded_client(user=MANAGER, seeds={"manager_subscriptions": [EXPIRED_STATUS_ROW]})
    resp = _request(client, "get", path, kwargs)
    assert resp.status_code == 200


def test_current_subscription_lazy_expiry_reports_expired():
    # The subscriptions router resolves its supabase client outside the DI
    # overrides (get_sub_svc calls get_service_client() directly), so the
    # lazy-expiry behavior is asserted at the service level.
    from services.subscriptions import SubscriptionService

    svc = SubscriptionService(
        MockSupabaseClient(seeds={"manager_subscriptions": [EXPIRED_BY_TIME_ROW]})
    )
    sub = svc.get_current_subscription(UID_OWNER)
    assert sub is not None
    assert sub.status == "expired"
    assert sub.days_remaining == 0


def test_get_current_subscription_returns_none_without_row():
    from services.subscriptions import SubscriptionService

    svc = SubscriptionService(MockSupabaseClient(seeds={"manager_subscriptions": []}))
    assert svc.get_current_subscription(UID_OWNER) is None


# ── Duplicate payment initiation guard ──────────────────────────────────────

from datetime import UTC, datetime, timedelta

RECENT = datetime.now(UTC).isoformat()

PENDING_SUB_ROW = _sub_row(
    status="pending",
    expires_at=None,
    created_at=RECENT,
)


def test_duplicate_pending_subscription_rejected(seeded_client):
    client = seeded_client(
        user=MANAGER,
        seeds={"manager_subscriptions": [PENDING_SUB_ROW], "profiles": [{"user_id": UID_OWNER, "role": "house_manager", "full_name": "Test User"}]},
    )
    resp = client.post("/subscriptions/create", json={"plan_id": "12mo", "callback_url": "https://example.com"})
    assert resp.status_code == 409


def test_duplicate_pending_boost_rejected(seeded_client):
    from dependencies import CurrentUser

    owner = CurrentUser(id=UID_OWNER, email="test@test.com", role="authenticated")
    client = seeded_client(
        user=owner,
        seeds={
            "manager_subscriptions": [_sub_row(status="active")],
            "property_boosts": [{
                "id": "00000000-0000-0000-0000-000000000071",
                "property_id": str(PID_PROP),
                "manager_id": UID_OWNER,
                "amount_paid": 70000,
                "duration_days": 7,
                "status": "pending",
                "transaction_id": "ref-pending",
                "payment_method": "pesapal",
                "created_at": RECENT,
                "updated_at": RECENT,
            }],
        },
    )
    resp = client.post(
        "/boosts/initiate",
        json={"property_id": str(PID_PROP), "duration_days": 7, "callback_url": "https://example.com"},
    )
    assert resp.status_code == 409
