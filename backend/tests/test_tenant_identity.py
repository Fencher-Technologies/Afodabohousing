# mypy: ignore-errors
"""A tenant may hold several ``tenants`` rows, one per house manager.

That happens whenever someone moves from one manager to another and the new
one re-adds them, and whenever someone rents two places at once. The code
originally assumed a single row and read it with ``maybe_single()`` or
``data[0]``, so the tenant's own dashboard broke the moment a second row
appeared. These tests pin the behaviour that fixed it.
"""

from types import SimpleNamespace

from services.tenant_identity import (
    owns_tenant_record,
    primary_tenant_id_for_user,
    tenant_ids_for_user,
)


class Query:
    def __init__(self, rows, raises=False):
        self._rows, self._raises, self._filters = rows, raises, {}

    def select(self, *_a, **_k):
        return self

    def eq(self, col, val):
        self._filters[col] = val
        return self

    def execute(self):
        if self._raises:
            raise RuntimeError("database unavailable")
        user_id = self._filters.get("user_id")
        return SimpleNamespace(
            data=[r for r in self._rows if str(r["user_id"]) == str(user_id)]
        )


class FakeSupabase:
    def __init__(self, rows, raises=False):
        self._rows, self._raises = rows, raises

    def table(self, _name):
        return Query(self._rows, self._raises)


ROWS = [
    # Susan's original tenancy, with the manager who terminated it.
    {"id": "tenant-old", "user_id": "user-susan", "created_at": "2026-01-10T00:00:00Z"},
    # The same person, re-added by a second manager after she moved.
    {"id": "tenant-new", "user_id": "user-susan", "created_at": "2026-06-02T00:00:00Z"},
    {"id": "tenant-other", "user_id": "user-someone-else", "created_at": "2026-03-01T00:00:00Z"},
]


def test_all_tenant_records_are_returned_for_one_user():
    sb = FakeSupabase(ROWS)
    assert set(tenant_ids_for_user(sb, "user-susan")) == {"tenant-old", "tenant-new"}


def test_records_are_newest_first_so_the_current_tenancy_leads():
    sb = FakeSupabase(ROWS)
    assert tenant_ids_for_user(sb, "user-susan")[0] == "tenant-new"
    assert primary_tenant_id_for_user(sb, "user-susan") == "tenant-new"


def test_a_user_with_no_tenancies_resolves_to_nothing():
    sb = FakeSupabase(ROWS)
    assert tenant_ids_for_user(sb, "user-nobody") == []
    assert primary_tenant_id_for_user(sb, "user-nobody") is None
    assert owns_tenant_record(sb, "user-nobody", "tenant-new") is False


def test_ownership_covers_every_record_not_just_the_latest():
    """The previous tenancy must stay reachable after a move."""
    sb = FakeSupabase(ROWS)
    assert owns_tenant_record(sb, "user-susan", "tenant-new") is True
    assert owns_tenant_record(sb, "user-susan", "tenant-old") is True
    assert owns_tenant_record(sb, "user-susan", "tenant-other") is False


def test_a_failed_lookup_denies_access_rather_than_raising():
    sb = FakeSupabase(ROWS, raises=True)
    assert tenant_ids_for_user(sb, "user-susan") == []
    assert owns_tenant_record(sb, "user-susan", "tenant-new") is False


def test_missing_user_id_is_not_sent_to_the_database():
    sb = FakeSupabase(ROWS, raises=True)  # would raise if it queried
    assert tenant_ids_for_user(sb, None) == []
    assert owns_tenant_record(sb, "user-susan", None) is False
