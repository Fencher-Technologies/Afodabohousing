# mypy: ignore-errors
"""US$ is the platform's standard currency.

The business asked that dollars be used throughout: subscribing, listing a
property, recording a payment, the reports and the tenant's dashboard. These
tests pin two things that matter more than the headline:

  1. A record that carries no currency is read as US$, never as shillings.
  2. A record that DOES carry a currency keeps it. Existing tenancies are
     priced in UGX and their receipts have already been issued; re-reading
     those amounts as dollars would misstate real money.
"""

import importlib.util
import pathlib

import pytest

from currency import DEFAULT_CURRENCY, PAYMENT_CURRENCIES
from services import notification_copy as copy
from services.receipts import ReceiptService


def test_the_standard_currency_is_the_dollar():
    assert DEFAULT_CURRENCY == "USD"


def test_shillings_remain_payable_because_mobile_money_cannot_settle_dollars():
    assert set(PAYMENT_CURRENCIES) == {"USD", "UGX"}


class TestNotificationAmounts:
    def test_a_missing_currency_reads_as_dollars(self):
        assert copy.money(500000, None) == "USD 500,000"

    @pytest.mark.parametrize("code", ["UGX", "KES", "EUR"])
    def test_a_stated_currency_is_preserved(self, code):
        assert copy.money(500000, code) == f"{code} 500,000"

    def test_an_existing_shilling_tenancy_is_never_relabelled(self):
        """UGX 366,667 must not become USD 366,667."""
        _title, body = copy.rent_due_for_tenant("Yonah", 366666.67, "UGX")
        assert "UGX 366,667" in body
        assert "USD" not in body


class TestReceiptSnapshot:
    def test_a_payment_without_a_currency_is_receipted_in_dollars(self):
        snapshot = ReceiptService._payment_currency({"amount": 100})
        assert snapshot == "USD"

    def test_a_shilling_payment_is_receipted_in_shillings(self):
        assert ReceiptService._payment_currency({"currency": "UGX"}) == "UGX"


def _load_receipt_pdf():
    spec = importlib.util.spec_from_file_location(
        "receipt_pdf_standalone",
        pathlib.Path(__file__).resolve().parent.parent / "services" / "receipt_pdf.py",
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TestReceiptPdf:
    """The printed receipt is the artefact a tenant keeps, so its currency
    label has to follow the receipt row rather than any global default."""

    def test_a_receipt_without_a_currency_prints_dollars(self):
        pdf = _load_receipt_pdf()
        assert pdf._fmt_amount(1500, pdf.DEFAULT_CURRENCY) == "USD 1,500.00"

    def test_a_shilling_receipt_still_prints_shillings(self):
        pdf = _load_receipt_pdf()
        assert pdf._fmt_amount(500000, "UGX") == "UGX 500,000.00"
