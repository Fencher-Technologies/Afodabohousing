"""Maintenance workflow rules.

status was an unconstrained string, cost and notes were returned to whoever
could read the request, and nothing told either party when a request moved.
"""

from models.maintenance_request import (
    ALLOWED_STATUS_TRANSITIONS,
    MaintenanceRequestCreate,
    MaintenanceRequestUpdate,
)
from routers.maintenance_requests import _visible_to

import pytest
from pydantic import ValidationError


class TestStatusSet:
    def test_open_can_be_scheduled_or_completed(self):
        assert ALLOWED_STATUS_TRANSITIONS["open"] == {"scheduled", "completed", "cancelled"}

    def test_completed_is_terminal(self):
        assert ALLOWED_STATUS_TRANSITIONS["completed"] == set()

    def test_unknown_status_rejected(self):
        with pytest.raises(ValidationError):
            MaintenanceRequestUpdate(status="in progress")

    def test_requests_always_start_open(self):
        """A tenant cannot file a request that is already completed."""
        with pytest.raises(ValidationError):
            MaintenanceRequestCreate(
                property_id="00000000-0000-0000-0000-000000000001",
                title="Leak", description="Kitchen tap", status="completed",
            )

    def test_unknown_priority_rejected(self):
        with pytest.raises(ValidationError):
            MaintenanceRequestUpdate(priority="whenever")


class TestFieldVisibility:
    ROW = {"id": "r1", "title": "Leak", "status": "scheduled", "cost": 250000, "notes": "Plumber booked"}

    def test_manager_sees_cost_and_notes(self):
        seen = _visible_to(self.ROW, is_manager=True)
        assert seen["cost"] == 250000
        assert seen["notes"] == "Plumber booked"

    def test_tenant_does_not(self):
        seen = _visible_to(self.ROW, is_manager=False)
        assert seen["cost"] is None
        assert seen["notes"] is None
        # but still sees their own request and its progress
        assert seen["title"] == "Leak"
        assert seen["status"] == "scheduled"

    def test_redaction_does_not_mutate_the_source(self):
        _visible_to(self.ROW, is_manager=False)
        assert self.ROW["cost"] == 250000
