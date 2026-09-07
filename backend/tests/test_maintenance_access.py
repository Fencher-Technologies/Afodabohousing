"""Maintenance request scoping.

list_requests_by_property and get_request had no ownership checks: any signed-in
user could read any property's maintenance history by id. create_request was
likewise unscoped, so requests could be filed against any property.
"""

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from routers.maintenance_requests import _assert_can_access


class _User:
    def __init__(self, uid, role="house_manager"):
        self.id = uid
        self.role = role


def _supabase(owned_property_ids=(), tenant_ids=()):
    sb = MagicMock()

    def table(name):
        t = MagicMock()
        t.select.return_value = t
        t.eq.return_value = t
        if name == "properties":
            t.execute.return_value = MagicMock(data=[{"id": p} for p in owned_property_ids])
        elif name == "tenants":
            t.execute.return_value = MagicMock(data=[{"id": i} for i in tenant_ids])
        else:
            t.execute.return_value = MagicMock(data=[])
        return t

    sb.table.side_effect = table
    return sb


def test_owning_manager_may_access():
    sb = _supabase(owned_property_ids=["prop-1"])
    _assert_can_access(sb, {"property_id": "prop-1", "tenant_id": None}, _User("mgr"))


def test_raising_tenant_may_access():
    sb = _supabase(tenant_ids=["tenant-1"])
    _assert_can_access(sb, {"property_id": "prop-9", "tenant_id": "tenant-1"}, _User("u", "tenant"))


def test_unrelated_user_is_denied():
    sb = _supabase(owned_property_ids=["prop-other"], tenant_ids=["tenant-other"])
    with pytest.raises(HTTPException) as exc:
        _assert_can_access(sb, {"property_id": "prop-1", "tenant_id": "tenant-1"}, _User("stranger"))
    assert exc.value.status_code == 403


def test_super_admin_may_access_anything():
    _assert_can_access(_supabase(), {"property_id": "p", "tenant_id": "t"}, _User("admin", "super_admin"))
