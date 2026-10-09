# mypy: ignore-errors
"""Boost packages carry a price in each currency.

US$ is the platform's standard price, which is what the business asked for,
but Ugandan mobile money cannot settle dollars, so the shilling price stays
alongside it. The danger this guards against is charging a shilling figure as
though it were dollars: UGX 4,000 billed as $4,000.
"""

from decimal import Decimal
from types import SimpleNamespace

import pytest

import services.boost as boost


PACKAGES = [
    {"id": "14d", "days": 14, "label": "Basic (2 weeks)", "price_ugx": 4000, "price_usd": 1.00, "is_active": True},
    {"id": "30d", "days": 30, "label": "Standard (1 month)", "price_ugx": 8000, "price_usd": 2.00, "is_active": True},
    {"id": "90d", "days": 90, "label": "Premium (3 months)", "price_ugx": 20000, "price_usd": 5.00, "is_active": True},
    # A package whose dollar price was never filled in.
    {"id": "60d", "days": 60, "label": "Unpriced", "price_ugx": 15000, "price_usd": None, "is_active": True},
    {"id": "off", "days": 5, "label": "Retired", "price_ugx": 1000, "price_usd": 0.25, "is_active": False},
]


@pytest.fixture(autouse=True)
def _packages(monkeypatch):
    monkeypatch.setattr(boost, "_all_packages", lambda _sb: PACKAGES)


SB = SimpleNamespace()


@pytest.mark.parametrize(
    ("days", "expected"),
    [(14, Decimal("1.00")), (30, Decimal("2.00")), (90, Decimal("5.00"))],
)
def test_usd_prices_match_the_published_rate_card(days, expected):
    assert boost.calculate_boost_price(SB, days, "USD") == expected


@pytest.mark.parametrize(
    ("days", "expected"),
    [(14, Decimal("4000")), (30, Decimal("8000")), (90, Decimal("20000"))],
)
def test_ugx_prices_are_unchanged_for_mobile_money(days, expected):
    assert boost.calculate_boost_price(SB, days, "UGX") == expected


def test_currency_defaults_to_ugx_for_existing_callers():
    assert boost.calculate_boost_price(SB, 14) == Decimal("4000")


def test_currency_is_case_insensitive():
    assert boost.calculate_boost_price(SB, 14, "usd") == Decimal("1.00")


def test_a_package_with_no_usd_price_refuses_rather_than_charging_shillings():
    """Falling back to price_ugx here would bill UGX 15,000 as $15,000."""
    with pytest.raises(ValueError, match="price_usd"):
        boost.calculate_boost_price(SB, 60, "USD")
    # The shilling price still works for that package.
    assert boost.calculate_boost_price(SB, 60, "UGX") == Decimal("15000")


def test_an_unknown_duration_is_rejected():
    with pytest.raises(ValueError, match="Invalid boost duration"):
        boost.calculate_boost_price(SB, 999, "USD")


def test_an_inactive_package_is_not_sold():
    with pytest.raises(ValueError, match="Invalid boost duration"):
        boost.calculate_boost_price(SB, 5, "USD")
