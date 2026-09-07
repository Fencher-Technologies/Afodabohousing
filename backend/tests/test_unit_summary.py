"""Unit price ranges on property listings.

A property can hold several units at different rents. Listing cards need that
range without one request per card, so the summary is folded into the property
rows server-side.
"""

from decimal import Decimal
from unittest.mock import MagicMock

from services.unit_summary import attach_unit_summaries


def _supabase(units):
    sb = MagicMock()
    tbl = MagicMock()
    tbl.select.return_value = tbl
    tbl.in_.return_value = tbl
    tbl.execute.return_value = MagicMock(data=units)
    sb.table.return_value = tbl
    return sb


def test_range_across_units():
    props = [{"id": "p1"}]
    sb = _supabase([
        {"property_id": "p1", "rent_amount": "300000", "status": "available"},
        {"property_id": "p1", "rent_amount": "800000", "status": "occupied"},
        {"property_id": "p1", "rent_amount": "500000", "status": "available"},
    ])
    attach_unit_summaries(sb, props)
    assert props[0]["unit_count"] == 3
    assert props[0]["unit_rent_min"] == Decimal("300000")
    assert props[0]["unit_rent_max"] == Decimal("800000")


def test_archived_units_excluded():
    props = [{"id": "p1"}]
    sb = _supabase([
        {"property_id": "p1", "rent_amount": "300000", "status": "available"},
        {"property_id": "p1", "rent_amount": "9000000", "status": "archived"},
    ])
    attach_unit_summaries(sb, props)
    assert props[0]["unit_count"] == 1
    assert props[0]["unit_rent_max"] == Decimal("300000")


def test_property_without_units_reports_zero():
    props = [{"id": "p1"}]
    attach_unit_summaries(_supabase([]), props)
    assert props[0]["unit_count"] == 0
    assert props[0]["unit_rent_min"] is None


def test_failure_leaves_rows_usable():
    """A summary lookup must never break a listing page."""
    sb = MagicMock()
    sb.table.side_effect = RuntimeError("db down")
    props = [{"id": "p1"}]
    attach_unit_summaries(sb, props)
    assert props[0]["unit_count"] == 0
