"""GET /managers: a real query, scoped by role, that never selects secrets."""

import pytest
from fastapi.testclient import TestClient

from dependencies import CurrentUser, get_current_user, get_service_client
from main import app

ADMIN_ID = "00000000-0000-0000-0000-0000000000a1"
MANAGER_ID = "00000000-0000-0000-0000-0000000000b1"
OTHER_ID = "00000000-0000-0000-0000-0000000000b2"
TENANT_ID = "00000000-0000-0000-0000-0000000000c1"


def _row(user_id, name, email="m@example.com", phone=None):
    return {
        "id": "11111111-1111-1111-1111-" + user_id[-12:], "user_id": user_id, "email": email, "full_name": name, "phone": phone,
        "avatar_url": None, "role": "house_manager", "status": "active", "created_by": None,
        "manager_id": None, "created_at": "2026-01-01T00:00:00+00:00", "accepted_terms": True,
        "accepted_terms_at": None, "terms_version": None, "privacy_version": None,
    }


class Recorder:
    """Records the query the endpoint builds, and returns canned rows."""

    def __init__(self, rows):
        self.rows = rows
        self.calls = []
        self.selected = None

    def table(self, name):
        assert name == "profiles"
        return self

    def select(self, columns, count=None):
        self.selected = columns
        return self

    def __getattr__(self, method):
        def record(*args, **kwargs):
            self.calls.append((method, args))
            return self
        return record

    def execute(self):
        class R:
            data = self.rows
            count = len(self.rows)
        return R()


def _client(role, user_id, rows):
    rec = Recorder(rows)
    user = CurrentUser(id=user_id, email="x@example.com", role=role)
    app.dependency_overrides[get_service_client] = lambda: rec
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app, raise_server_exceptions=False), rec


@pytest.fixture(autouse=True)
def _clear():
    yield
    app.dependency_overrides.clear()


def _has(rec, method, *args):
    return (method, args) in rec.calls


def test_super_admin_lists_managers_with_paging_and_total():
    client, rec = _client("super_admin", ADMIN_ID, [_row(MANAGER_ID, "Ann"), _row(OTHER_ID, "Bo")])
    r = client.get("/managers?skip=0&limit=10")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 2 and [i["full_name"] for i in body["items"]] == ["Ann", "Bo"]
    assert _has(rec, "eq", "role", "house_manager")
    assert _has(rec, "range", 0, 9)
    # Not scoped to one user.
    assert not any(c[0] == "eq" and c[1][0] == "user_id" for c in rec.calls)


def test_a_manager_sees_only_their_own_record():
    client, rec = _client("house_manager", MANAGER_ID, [_row(MANAGER_ID, "Ann")])
    assert client.get("/managers").status_code == 200
    assert _has(rec, "eq", "user_id", MANAGER_ID)


def test_a_manager_cannot_widen_the_scope_with_a_user_id_filter():
    client, rec = _client("house_manager", MANAGER_ID, [])
    client.get(f"/managers?user_id={OTHER_ID}")
    # Both filters are applied (AND): asking for someone else yields nothing.
    assert _has(rec, "eq", "user_id", MANAGER_ID)
    assert _has(rec, "eq", "user_id", OTHER_ID)


def test_tenants_are_refused():
    client, _ = _client("tenant", TENANT_ID, [])
    assert client.get("/managers").status_code == 403


def test_secrets_are_never_selected():
    client, rec = _client("super_admin", ADMIN_ID, [])
    client.get("/managers")
    assert "pin_hash" not in rec.selected and "auth_password_enc" not in rec.selected
    assert rec.selected != "*"


def test_search_strips_filter_syntax_so_it_cannot_inject_conditions():
    client, rec = _client("super_admin", ADMIN_ID, [])
    client.get("/managers", params={"search": "ann),role.eq.super_admin,(x"})
    (_, (expr,)) = next(c for c in rec.calls if c[0] == "or_")
    # Exactly three ilike clauses; the attacker's commas and parentheses are gone.
    assert expr.count(",") == 2 and "(" not in expr and ")" not in expr


def test_blank_search_adds_no_filter_and_email_is_normalised():
    client, rec = _client("super_admin", ADMIN_ID, [])
    client.get("/managers", params={"search": "  ", "email": " Ann@Example.COM "})
    assert not any(c[0] == "or_" for c in rec.calls)
    assert _has(rec, "eq", "email", "ann@example.com")


def test_a_phone_registered_manager_without_an_email_does_not_break_the_response():
    row = _row(MANAGER_ID, "Phone Only")
    row["email"] = None
    client, _ = _client("super_admin", ADMIN_ID, [row])
    r = client.get("/managers")
    assert r.status_code == 200 and r.json()["items"][0]["email"] == ""


def test_limit_is_capped():
    client, _ = _client("super_admin", ADMIN_ID, [])
    assert client.get("/managers?limit=101").status_code == 422
