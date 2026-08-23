"""_normalize_property must coalesce legacy/new price+size columns in both directions.

Live DBs hold rows written by old code (rent_amount only), new code
(monthly_rent only), or both with one column stale/NULL. Readers of either
column name must always see a value.
"""
from services.crud import _normalize_property


def test_legacy_row_rent_amount_only():
    p = _normalize_property({"id": "1", "rent_amount": 500000})
    assert p["monthly_rent"] == 500000
    assert p["rent_amount"] == 500000


def test_new_row_monthly_rent_only():
    p = _normalize_property({"id": "2", "monthly_rent": 700000})
    assert p["rent_amount"] == 700000
    assert p["monthly_rent"] == 700000


def test_both_columns_with_null_monthly():
    # The bug this guards: rent_amount holds the real price, monthly_rent is NULL
    p = _normalize_property({"id": "3", "monthly_rent": None, "rent_amount": 900000})
    assert p["monthly_rent"] == 900000
    assert p["rent_amount"] == 900000


def test_both_columns_with_stale_rent_amount():
    p = _normalize_property({"id": "4", "monthly_rent": 800000, "rent_amount": None})
    assert p["rent_amount"] == 800000


def test_area_square_feet_coalesce():
    p = _normalize_property({"id": "5", "square_feet": None, "area": 120})
    assert p["square_feet"] == 120
