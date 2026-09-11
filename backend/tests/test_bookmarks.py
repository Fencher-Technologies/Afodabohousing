# mypy: ignore-errors
from unittest.mock import MagicMock
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from dependencies import get_current_user, get_service_client, get_supabase_client
from main import app
from tests.conftest import UID_OWNER, PID_PROP, PID_PROFILE


class FakeBookmarkTable:
    def __init__(self, store, profiles_store):
        self._store = store
        self._profiles = profiles_store
        self._filters = {}
        self._op = None
        self._payload = None

    def select(self, *a, **kw):
        self._op = "select"
        return self

    def eq(self, col, val):
        self._filters[col] = val
        return self

    def order(self, *a, **kw):
        return self

    def maybe_single(self):
        return self

    def single(self):
        return self

    def insert(self, payload):
        self._op = "insert"
        self._payload = payload
        return self

    def delete(self):
        self._op = "delete"
        return self

    def execute(self):
        if self._op == "insert":
            # check duplicate via unique (user_id, property_id)
            for r in self._store:
                if r["user_id"] == self._payload["user_id"] and r["property_id"] == self._payload["property_id"]:
                    return MagicMock(data=[r])
            rec = {"id": "90000000-0000-0000-0000-000000000001", "created_at": "2026-01-01T00:00:00Z", **self._payload}
            self._store.append(rec)
            return MagicMock(data=[rec])
        if self._op == "delete":
            before = len(self._store)
            self._store[:] = [r for r in self._store if not (r.get("user_id") == self._filters.get("user_id") and r.get("property_id") == self._filters.get("property_id"))]
            deleted = before != len(self._store)
            return MagicMock(data=[{"id": "deleted"}] if deleted else [], count=int(deleted))
        # select
        # Handle profiles lookup
        # This table is for profiles when called via FakeBookmarkTable? No, separate
        data = [r for r in self._store if all(r.get(k) == v for k, v in self._filters.items())]
        # Handle count exact etc - simplified
        m = MagicMock()
        m.data = data
        m.count = len(data)
        return m


class FakeSupabase:
    def __init__(self):
        self._bookmarks = []
        self._profiles = [{"id": PID_PROFILE, "user_id": UID_OWNER}]

    def table(self, name):
        if name == "profiles":
            t = FakeBookmarkTable(self._profiles, None)
            # Override to handle profiles correctly
            orig_execute = t.execute
            def exec_profiles():
                # filter by user_id
                filtered = [r for r in self._profiles if all(r.get(k) == v for k, v in t._filters.items())]
                m = MagicMock()
                m.data = filtered[0] if filtered and t._op != "select" or t._filters.get("user_id") else (filtered[0] if filtered else None)
                # For maybe_single, return single object or None
                if t._op == "select":
                    if filtered:
                        m.data = filtered[0] if t._filters.get("user_id") else filtered
                        # For select with maybe_single, return single dict
                        if len(filtered) == 1 and t._filters.get("user_id"):
                            m.data = filtered[0]
                        else:
                            m.data = filtered
                    else:
                        m.data = None
                    # Handle .maybe_single() case where caller expects .data to be dict or None
                    # Our FakeBookmarkTable's execute for profiles should return data as dict for maybe_single
                    if t._filters.get("user_id") and filtered:
                        m.data = filtered[0]
                    elif t._filters.get("user_id"):
                        m.data = None
                return m
            t.execute = exec_profiles
            # need to handle maybe_single case where _profile_id does .maybe_single().execute() and expects .data.get("id")
            # So for profiles, if maybe_single and filtered, return data as dict
            return t
        if name in ("saved_properties", "property_bookmarks"):
            return FakeBookmarkTable(self._bookmarks, self._profiles)
        # fallback generic mock
        m = MagicMock()
        m.select.return_value = m
        m.eq.return_value = m
        m.order.return_value = m
        m.maybe_single.return_value = m
        m.single.return_value = m
        m.insert.return_value = m
        m.delete.return_value = m
        m.execute.return_value = MagicMock(data=[])
        return m

    def rpc(self, *a, **kw):
        m = MagicMock()
        m.execute.return_value = MagicMock(data=[])
        return m

    @property
    def auth(self):
        m = MagicMock()
        m.get_user.return_value = MagicMock(user=MagicMock(model_dump=lambda: {"id": UID_OWNER, "email": "test@test.com"}))
        return m

    @property
    def storage(self):
        m = MagicMock()
        m.from_.return_value = m
        return m


@pytest.fixture
def fake_supabase():
    return FakeSupabase()


@pytest.fixture
def bookmark_client(fake_supabase):
    from dependencies.database import _get_cached_client
    _get_cached_client.cache_clear()
    from dependencies import CurrentUser
    user = CurrentUser(id=UID_OWNER, email="test@test.com", role="authenticated")
    app.dependency_overrides[get_supabase_client] = lambda: fake_supabase
    app.dependency_overrides[get_service_client] = lambda: fake_supabase
    app.dependency_overrides[get_current_user] = lambda: user
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_add_list_check_remove_flow(bookmark_client):
    # add
    resp = bookmark_client.post(f"/bookmarks/{PID_PROP}")
    assert resp.status_code == 201, resp.text
    # list contains one
    resp = bookmark_client.get("/bookmarks")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["property_id"] == PID_PROP
    # check true
    resp = bookmark_client.get(f"/bookmarks/check/{PID_PROP}")
    assert resp.json()["bookmarked"] is True
    # duplicate add does not create second
    resp = bookmark_client.post(f"/bookmarks/{PID_PROP}")
    assert resp.status_code == 201
    resp = bookmark_client.get("/bookmarks")
    assert len(resp.json()) == 1
    # remove
    resp = bookmark_client.delete(f"/bookmarks/{PID_PROP}")
    assert resp.status_code == 204
    # check false
    resp = bookmark_client.get(f"/bookmarks/check/{PID_PROP}")
    assert resp.json()["bookmarked"] is False
    # list empty
    resp = bookmark_client.get("/bookmarks")
    assert resp.json() == []


def test_bookmark_table_is_saved_properties(fake_supabase):
    from services.crud import BookmarkService
    svc = BookmarkService(fake_supabase)
    assert svc._table == "saved_properties"

    # add via service directly uses profiles.id
    svc.add_bookmark(UUID(UID_OWNER), UUID(PID_PROP))
    assert fake_supabase._bookmarks[0]["user_id"] == PID_PROFILE
    assert fake_supabase._bookmarks[0]["property_id"] == PID_PROP
