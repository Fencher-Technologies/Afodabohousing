"""Leases bind to a unit, and unit occupancy follows.

leases.unit_label was free text that nothing validated or joined on, so there
was no reliable way to tell which units were occupied. Leases now carry
unit_id, and a unit's status is derived from whether it has an active lease.
"""

from unittest.mock import MagicMock

from services.crud import LeaseService


def _service(current_status="available", has_active_lease=False):
    sb = MagicMock()
    updates = {}

    def table(name):
        t = MagicMock()
        t.select.return_value = t
        t.eq.return_value = t
        t.limit.return_value = t
        if name == "rental_units":
            t.execute.return_value = MagicMock(data=[{"status": current_status}])
            def update(payload):
                updates.update(payload)
                u = MagicMock()
                u.eq.return_value = MagicMock(execute=MagicMock())
                return u
            t.update.side_effect = update
        elif name == "leases":
            t.execute.return_value = MagicMock(data=[{"id": "l1"}] if has_active_lease else [])
        return t

    sb.table.side_effect = table
    return LeaseService(sb), updates


def test_unit_becomes_occupied_when_it_has_an_active_lease():
    svc, updates = _service(has_active_lease=True)
    svc._sync_unit_status("unit-1")
    assert updates["status"] == "occupied"


def test_unit_frees_up_when_no_active_lease_remains():
    svc, updates = _service(current_status="occupied", has_active_lease=False)
    svc._sync_unit_status("unit-1")
    assert updates["status"] == "available"


def test_a_unit_under_maintenance_is_left_alone():
    """Taking a unit out of service must not be undone by lease changes."""
    svc, updates = _service(current_status="maintenance", has_active_lease=False)
    svc._sync_unit_status("unit-1")
    assert updates == {}


def test_missing_unit_id_is_a_no_op():
    svc, updates = _service()
    svc._sync_unit_status(None)
    assert updates == {}
