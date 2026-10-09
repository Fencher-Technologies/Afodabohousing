# mypy: ignore-errors
"""Subscriptions and boosts are priced in US$ and converted at the till.

Ugandan mobile money cannot settle dollars, so a shilling payer is charged the
converted equivalent. The thing worth pinning is that the figure tracks the
CURRENT rate rather than a shilling price fixed when the plan was created,
because a fixed figure silently stops being the dollar price as the rate moves.
"""

import pytest

import services.forex as forex


@pytest.fixture(autouse=True)
def _rates(monkeypatch):
    """A rate well away from the 4,000 fallback, so drift is visible."""
    monkeypatch.setattr(
        forex, "_fetch_rates", lambda: {"USD": 1.0, "UGX": 3800.0, "KES": 129.0, "EUR": 0.92}
    )


class TestChargeAmount:
    def test_a_dollar_payer_is_charged_the_dollar_price(self):
        assert forex.charge_amount(10, "USD") == 10.00

    def test_a_shilling_payer_is_charged_at_the_current_rate(self):
        """$10 at 3,800 is 38,000, not the 40,000 stored at 4,000."""
        assert forex.charge_amount(10, "UGX") == 38000.0

    def test_boost_prices_convert_too(self):
        assert forex.charge_amount(1, "UGX") == 3800.0
        assert forex.charge_amount(5, "UGX") == 19000.0

    def test_the_charge_is_rounded_up_to_a_payable_figure(self):
        """Nobody can pay UGX 9,386.00, and rounding down would short Axis."""
        charged = forex.charge_amount(2.47, "UGX")  # 9,386 exactly
        assert charged % 100 == 0
        assert charged >= 2.47 * 3800

    def test_a_currency_with_no_rounding_rule_keeps_its_cents(self):
        assert forex.charge_amount(10, "EUR") == 9.20

    def test_an_unknown_currency_is_left_alone_rather_than_guessed(self):
        """convert() refuses to invent a rate, so the amount passes through."""
        assert forex.charge_amount(10, "XYZ") == 10.0


class TestFallback:
    def test_an_unreachable_rate_service_falls_back_to_the_quoted_rate(self, monkeypatch):
        """Axis quotes 1 USD = 4,000 UGX, which is what the stored prices use,
        so a checkout during an outage charges exactly what it always did."""
        monkeypatch.setattr(forex, "_fetch_rates", lambda: forex.FALLBACK_RATES)
        assert forex.charge_amount(10, "UGX") == 40000.0
        assert forex.charge_amount(25, "UGX") == 100000.0
        assert forex.charge_amount(250, "UGX") == 1000000.0
        assert forex.charge_amount(1, "UGX") == 4000.0
        assert forex.charge_amount(2, "UGX") == 8000.0
        assert forex.charge_amount(5, "UGX") == 20000.0


class TestCheckoutFailureMessage:
    """A Pesapal account settles only the currencies it is enabled for.

    If the account is shillings-only, every US$ checkout fails at submit time.
    A generic "please try again" would send everyone retrying something that
    cannot succeed, so the message names the cause.
    """

    def test_a_currency_rejection_says_so(self):
        from routers.subscriptions import _checkout_failure_detail

        detail = _checkout_failure_detail(
            RuntimeError("invalid_currency: USD is not supported for this merchant"), "USD"
        )
        assert "USD" in detail
        assert "not be set up to accept" in detail

    def test_any_other_failure_keeps_the_generic_retry_message(self):
        from routers.subscriptions import _checkout_failure_detail

        detail = _checkout_failure_detail(TimeoutError("connection timed out"), "USD")
        assert detail == "Payment initiation failed. Please try again."

    def test_boosts_use_the_same_rule(self):
        from routers.boosts import _checkout_failure_detail

        detail = _checkout_failure_detail(RuntimeError("Currency not supported"), "USD")
        assert "USD" in detail
