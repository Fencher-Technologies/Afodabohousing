# mypy: ignore-errors
"""Receipts must follow the rent ledger, not the day money changed hands."""
from types import SimpleNamespace

from services.receipts import ReceiptService


class Q:
    def __init__(self, rows): self.rows = rows
    def select(self, *_a, **_k): return self
    def eq(self, col, val): self.rows = [r for r in self.rows if str(r.get(col)) == str(val)]; return self
    def limit(self, _): return self
    def execute(self): return SimpleNamespace(data=list(self.rows))


class SB:
    def __init__(self, leases, payments): self.tables = {"leases": leases, "payments": payments}
    def table(self, name): return Q(list(self.tables.get(name, [])))


LEASE = [{"id": "L1", "rent_effective_date": "2026-09-01", "start_date": "2026-08-15"}]


def test_first_payment_starts_at_the_effective_date_not_the_payment_date():
    # Tino Eve: rent effective 1 Sep, paid three months on 10 Sep.
    payment = {"id": "P1", "lease_id": "L1", "paid_date": "2026-09-10", "coverage_days": 90}
    svc = ReceiptService(SB(LEASE, [payment]))
    start, end = svc._coverage_period(payment, 90, "2026-09-10")
    assert (start, end) == ("2026-09-01", "2026-11-30")


def test_later_payment_continues_where_the_previous_one_ended():
    first = {"id": "P1", "lease_id": "L1", "paid_date": "2026-09-10", "coverage_days": 90,
             "status": "confirmed", "payment_type": "rent"}
    second = {"id": "P2", "lease_id": "L1", "paid_date": "2026-11-20", "coverage_days": 30}
    svc = ReceiptService(SB(LEASE, [first, second]))
    assert svc._coverage_period(second, 30, "2026-11-20") == ("2026-11-30", "2026-12-30")


def test_unconfirmed_and_later_payments_do_not_shift_the_start():
    pending = {"id": "P0", "lease_id": "L1", "paid_date": "2026-09-05", "coverage_days": 60,
               "status": "pending", "payment_type": "rent"}
    future = {"id": "P9", "lease_id": "L1", "paid_date": "2026-12-01", "coverage_days": 30,
              "status": "confirmed", "payment_type": "rent"}
    payment = {"id": "P1", "lease_id": "L1", "paid_date": "2026-09-10", "coverage_days": 90}
    svc = ReceiptService(SB(LEASE, [pending, future, payment]))
    assert svc._coverage_period(payment, 90, "2026-09-10")[0] == "2026-09-01"


def test_falls_back_to_the_payment_date_when_the_tenancy_has_no_dates():
    payment = {"id": "P1", "lease_id": "L2", "paid_date": "2026-09-10", "coverage_days": 30}
    svc = ReceiptService(SB([{"id": "L2", "rent_effective_date": None, "start_date": None}], [payment]))
    assert svc._coverage_period(payment, 30, "2026-09-10") == ("2026-09-10", "2026-10-10")
