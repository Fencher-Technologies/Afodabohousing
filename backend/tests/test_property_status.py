# mypy: ignore-errors
"""The properties.status vocabulary must match the DB CHECK constraint.

properties_status_check permits exactly available/occupied/maintenance/
unlisted. The deactivate toggle once wrote 'inactive', which Postgres
rejected — silently failing the whole PATCH including is_active. The
mock-Supabase suite never exercises CHECK constraints, so this file
pins the contract at the model layer instead.
"""
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from models.property import PropertyStatus, PropertyUpdate
from routers.properties import _clean_db_error

ALLOWED = ["available", "occupied", "maintenance", "unlisted"]


def test_literal_matches_db_constraint():
    assert list(PropertyStatus.__args__) == ALLOWED


@pytest.mark.parametrize("status", ALLOWED)
def test_update_accepts_every_allowed_status(status):
    assert PropertyUpdate(status=status).status == status


def test_update_rejects_inactive():
    with pytest.raises(ValidationError):
        PropertyUpdate(status="inactive")


def test_check_constraint_error_names_constraint_in_dev():
    err = SimpleNamespace(
        message='new row for relation "properties" violates check constraint "properties_status_check"'
    )
    assert "properties_status_check" in _clean_db_error(err)
