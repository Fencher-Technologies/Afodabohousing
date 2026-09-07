"""A property is its units.

Pricing used to live on the property while rental_units sat unused, so the two
competed with nothing saying which was authoritative. Every property now has at
least one unit carrying its specs and price, and the listing price is the range
across them.
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


def test_single_unit_property_shows_one_price():
    """The common case: one unit, so the listing reads as a single price."""
    props = [{"id": "p1", "monthly_rent": 500000}]
    attach_unit_summaries(_supabase([
        {"property_id": "p1", "rent_amount": "500000", "status": "available"},
    ]), props)
    assert props[0]["unit_count"] == 1
    assert props[0]["unit_rent_min"] == props[0]["unit_rent_max"] == Decimal("500000")


def test_multi_unit_property_shows_a_range():
    props = [{"id": "p1"}]
    attach_unit_summaries(_supabase([
        {"property_id": "p1", "rent_amount": "300000", "status": "available"},
        {"property_id": "p1", "rent_amount": "800000", "status": "occupied"},
    ]), props)
    assert props[0]["unit_count"] == 2
    assert props[0]["unit_rent_min"] == Decimal("300000")
    assert props[0]["unit_rent_max"] == Decimal("800000")


def test_property_without_units_still_renders():
    """Defensive: a property should always have a unit, but if one is missing
    the card falls back to the property rent rather than showing nothing."""
    props = [{"id": "p1", "monthly_rent": 400000}]
    attach_unit_summaries(_supabase([]), props)
    assert props[0]["unit_count"] == 0
    assert props[0]["unit_rent_min"] is None
