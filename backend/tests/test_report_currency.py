# mypy: ignore-errors
"""Dashboard totals are converted into the manager's reporting currency."""
import routers.reports as reports


def test_totals_convert_each_lease_from_its_own_currency(monkeypatch):
    monkeypatch.setattr(
        "services.forex.convert",
        lambda amount, frm, to: amount * 4000 if (frm, to) == ("USD", "UGX") else amount,
    )
    leases = [
        {"currency": "UGX", "expected_rent": 500000, "total_paid": 200000},
        {"currency": "USD", "expected_rent": 100, "total_paid": 50},
    ]
    totals, mixed = reports._totals_in(leases, ("expected_rent", "total_paid"), "UGX")
    assert totals["expected_rent"] == 900000   # 500,000 + (100 USD x 4,000)
    assert totals["total_paid"] == 400000      # 200,000 + (50 USD x 4,000)
    assert mixed is True


def test_single_currency_portfolio_is_not_flagged_as_mixed(monkeypatch):
    monkeypatch.setattr("services.forex.convert", lambda amount, frm, to: amount)
    leases = [{"currency": "KES", "expected_rent": 30000}, {"currency": "KES", "expected_rent": 20000}]
    totals, mixed = reports._totals_in(leases, ("expected_rent",), "KES")
    assert totals["expected_rent"] == 50000
    assert mixed is False


def test_lease_without_a_currency_is_treated_as_the_reporting_currency(monkeypatch):
    monkeypatch.setattr("services.forex.convert", lambda amount, frm, to: 0)
    totals, mixed = reports._totals_in([{"expected_rent": 750}], ("expected_rent",), "UGX")
    assert totals["expected_rent"] == 750
    assert mixed is False
