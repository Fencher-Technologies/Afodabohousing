# mypy: ignore-errors
from datetime import date
from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from dependencies import get_current_user
from main import app
from models import PaymentCreate
from services.crud import (
    LeaseService,
    PaymentService,
    _compute_rent_financials,
    _rent_coverage_days,
)

UID_OWNER = "00000000-0000-0000-0000-000000000001"
PID_LEASE = "00000000-0000-0000-0000-000000000030"
PID_TENANT = "00000000-0000-0000-0000-000000000020"


@pytest.fixture
def owner_client(client):
    from dependencies import CurrentUser
    owner = CurrentUser(id=UID_OWNER, email="owner@test.com", role="house_manager", status="active")
    app.dependency_overrides[get_current_user] = lambda: owner
    return client


@pytest.fixture
def tenant_client(client):
    from dependencies import CurrentUser
    tenant = CurrentUser(
        id="00000000-0000-0000-0000-000000000002",
        email="tenant@test.com",
        role="tenant",
        status="active",
    )
    app.dependency_overrides[get_current_user] = lambda: tenant
    return client


class TestRentCoverageDays:
    def test_full_month(self):
        assert _rent_coverage_days(1500000, 1500000) == 30

    def test_partial_payment(self):
        assert _rent_coverage_days(500000, 1500000) == 10
        assert _rent_coverage_days(250000, 1500000) == 5

    def test_advance_payment_stacks(self):
        assert _rent_coverage_days(2250000, 1500000) == 45

    def test_floor_rounding(self):
        assert _rent_coverage_days(200000, 1500000) == 4

    def test_zero_or_negative_rent(self):
        assert _rent_coverage_days(1500000, 0) == 0
        assert _rent_coverage_days(1500000, -100) == 0
        assert _rent_coverage_days(0, 1500000) == 0

    def test_string_inputs(self):
        assert _rent_coverage_days("500000", "1500000") == 10

    def test_invalid_inputs(self):
        assert _rent_coverage_days(None, 1500000) == 0
        assert _rent_coverage_days(1500000, None) == 0


class TestComputeRentPosition:
    """Day-field derivations under the money ledger (display only)."""

    def _payments(self, *coverage_days):
        # Money-ledger: days shown derive from amounts paid; each day of
        # coverage here is bought at the 500k/month rate used by these tests.
        return [
            {
                "coverage_days": c,
                "amount": round(c * 500000 / 30, 2),
                "payment_type": "rent",
                "status": "confirmed",
            }
            for c in coverage_days
        ]

    def test_no_anchor_returns_nulls(self):
        fin = _compute_rent_financials(None, self._payments(30), 500000)
        assert fin["rent_effective_date"] is None
        assert fin["paid_until_date"] is None
        assert fin["rent_days_remaining"] is None
        assert fin["rent_days_in_arrears"] is None
        assert fin["next_payment_due_date"] is None
        assert fin["is_overdue"] is None

    def test_anchor_without_payments(self):
        fin = _compute_rent_financials(
            "2026-01-01", [], 500000, today=date(2026, 1, 20)
        )
        # 19 elapsed days accrue money; no payments -> full arrears.
        assert fin["paid_until_date"] == "2026-01-01"
        assert fin["rent_days_remaining"] == 0
        assert fin["rent_days_in_arrears"] == 19
        assert round(fin["rent_accrued"], 2) == 316666.67
        assert round(fin["arrears_amount"], 2) == 316666.67
        assert fin["is_overdue"] is True

    def test_full_month_paid_covered(self):
        fin = _compute_rent_financials(
            "2026-01-01", self._payments(30), 500000, today=date(2026, 1, 20)
        )
        assert fin["paid_until_date"] == "2026-01-31"
        assert fin["rent_days_remaining"] == 11
        assert fin["rent_days_in_arrears"] == 0
        # Money ledger: a full month paid with only 19 days elapsed -> credit.
        assert round(fin["advance_amount"], 2) == 183333.33
        assert fin["arrears_amount"] == 0.0
        assert not fin["is_overdue"]

    def test_days_in_arrears_after_coverage_exhausted(self):
        fin = _compute_rent_financials(
            "2026-01-01", self._payments(30), 500000, today=date(2026, 2, 10)
        )
        assert fin["rent_days_remaining"] == 0
        assert fin["rent_days_in_arrears"] == 10

    def test_advance_payments_show_covered_until(self):
        fin = _compute_rent_financials(
            "2026-01-01", self._payments(30, 15), 500000, today=date(2026, 2, 10)
        )
        # money display: covered days = floor(paid / daily)
        assert fin["paid_until_date"] == "2026-02-15"
        assert fin["rent_days_remaining"] == 5
        assert fin["rent_days_in_arrears"] == 0

    def test_next_due_follows_billing_calendar(self):
        # Anchor 10 Aug; today 25 Sep (46 elapsed) -> next boundary +60 days.
        fin = _compute_rent_financials(
            "2026-08-10", self._payments(30), 1000000, today=date(2026, 9, 25)
        )
        assert fin["next_payment_due_date"] == "2026-10-09"
        # On a boundary day, that day is the due date.
        fin = _compute_rent_financials(
            "2026-01-01", self._payments(60), 500000, today=date(2026, 3, 2)
        )
        assert fin["next_payment_due_date"] == "2026-03-02"
        # Before any elapsed days the first period is due at the anchor.
        fin = _compute_rent_financials(
            "2026-01-01", self._payments(0), 500000, today=date(2026, 1, 1)
        )
        assert fin["next_payment_due_date"] == "2026-01-01"

    def test_invalid_anchor(self):
        fin = _compute_rent_financials("not-a-date", self._payments(30), 500000)
        assert fin["rent_effective_date"] is None
        assert fin["paid_until_date"] is None
        assert fin["rent_days_remaining"] is None


class TestSetRentEffectiveDate:
    def test_set_success(self, mock_supabase):
        svc = LeaseService(mock_supabase)
        with patch.object(svc, "get_by_id", return_value={"rent_effective_date": None}):
            lease = svc.set_rent_effective_date(UUID(PID_LEASE), UUID(UID_OWNER), date(2026, 2, 1))
        assert lease["rent_effective_date"] == "2026-02-01"

    def test_raises_when_already_set(self, mock_supabase):
        svc = LeaseService(mock_supabase)
        with patch.object(svc, "get_by_id", return_value={"rent_effective_date": "2026-01-01"}):
            with pytest.raises(ValueError):
                svc.set_rent_effective_date(UUID(PID_LEASE), UUID(UID_OWNER), date(2026, 2, 1))

    def test_sets_even_when_rent_payments_exist(self, mock_supabase):
        # The anchor is a billing date that may be established at any time;
        # confirmed rent payments do not block setting it (set-once only).
        svc = LeaseService(mock_supabase)
        with patch.object(svc, "get_by_id", return_value={"rent_effective_date": None}):
            lease = svc.set_rent_effective_date(UUID(PID_LEASE), UUID(UID_OWNER), date(2026, 2, 1))
        assert lease["rent_effective_date"] == "2026-02-01"

    def test_raises_permission_when_not_owner(self, mock_supabase):
        svc = LeaseService(mock_supabase)
        with patch.object(svc, "get_by_id", return_value=None):
            with pytest.raises(PermissionError):
                svc.set_rent_effective_date(UUID(PID_LEASE), UUID(UID_OWNER), date(2026, 2, 1))


class TestEffectiveDateEndpoint:
    def test_set_successfully(self, owner_client: TestClient, mock_supabase):
        from routers.leases import get_lease_svc
        svc = LeaseService(mock_supabase)
        with patch.object(svc, "get_by_id", return_value={"rent_effective_date": None}):
            app.dependency_overrides[get_lease_svc] = lambda: svc
            try:
                resp = owner_client.patch(
                    f"/leases/{PID_LEASE}/effective-date", json={"rent_effective_date": "2026-01-01"}
                )
            finally:
                app.dependency_overrides.pop(get_lease_svc, None)
        assert resp.status_code == 200
        body = resp.json()
        assert body["rent_effective_date"] == "2026-01-01"
        assert "paid_until_date" in body
        assert "rent_days_remaining" in body
        assert "rent_days_in_arrears" in body
        assert "next_payment_due_date" in body
        assert "arrears_amount" in body
        assert "advance_amount" in body
        assert "rent_accrued" in body
        assert "contract_rent" in body

    def test_second_set_rejected(self, owner_client: TestClient, mock_supabase):
        from routers.leases import get_lease_svc
        svc = LeaseService(mock_supabase)
        with patch.object(svc, "get_by_id", return_value={"rent_effective_date": "2026-01-01"}):
            app.dependency_overrides[get_lease_svc] = lambda: svc
            try:
                resp = owner_client.patch(
                    f"/leases/{PID_LEASE}/effective-date",
                    json={"rent_effective_date": "2026-02-01"},
                )
            finally:
                app.dependency_overrides.pop(get_lease_svc, None)
        assert resp.status_code == 400

    def test_tenant_forbidden(self, tenant_client: TestClient):
        resp = tenant_client.patch(
            f"/leases/{PID_LEASE}/effective-date", json={"rent_effective_date": "2026-01-01"}
        )
        assert resp.status_code == 403

    def test_lease_not_found(self, owner_client: TestClient):
        resp = owner_client.patch(
            "/leases/00000000-0000-0000-0000-00000000ffff/effective-date",
            json={"rent_effective_date": "2026-01-01"},
        )
        assert resp.status_code == 404

    def test_missing_body_rejected(self, owner_client: TestClient):
        resp = owner_client.patch(f"/leases/{PID_LEASE}/effective-date", json={})
        assert resp.status_code == 422


class TestPaymentCoverageCreation:
    def test_confirmed_payment_gets_coverage(self, owner_client: TestClient):
        resp = owner_client.post("/payments", json={
            "lease_id": PID_LEASE,
            "tenant_id": PID_TENANT,
            "amount": 1500000,
            "payment_type": "rent",
            "due_date": "2026-04-01",
        })
        assert resp.status_code == 201
        assert resp.json()["coverage_days"] == 30

    def test_partial_payment_coverage(self, owner_client: TestClient):
        resp = owner_client.post("/payments", json={
            "lease_id": PID_LEASE,
            "tenant_id": PID_TENANT,
            "amount": 500000,
            "payment_type": "rent",
            "due_date": "2026-04-01",
        })
        assert resp.status_code == 201
        assert resp.json()["coverage_days"] == 10

    def test_pending_payment_no_coverage(self, owner_client: TestClient):
        resp = owner_client.post("/payments", json={
            "lease_id": PID_LEASE,
            "tenant_id": PID_TENANT,
            "amount": 1500000,
            "payment_type": "rent",
            "status": "pending",
            "due_date": "2026-04-01",
        })
        assert resp.status_code == 201
        assert resp.json().get("coverage_days") is None


def _p(days, amount, rent, frozen=None, ptype="rent", status="confirmed", paid_date="2026-01-01"):
    return {
        "coverage_days": days,
        "amount": amount,
        "payment_type": ptype,
        "status": status,
        "frozen_monthly_rent": frozen,
        "paid_date": paid_date,
    }


class TestComputeRentFinancials:
    def test_clean_prepay(self):
        fin = _compute_rent_financials(
            "2026-01-01", [_p(60, 1000000, 500000)], 500000,
            start_date="2026-01-01", end_date="2026-12-31", today=date(2026, 2, 14),
        )
        # elapsed 44 days -> accrued 733333.33; paid 1,000,000 -> 266666.67 credit
        assert fin["paid_until_date"] == "2026-03-02"
        assert fin["rent_days_remaining"] == 16
        assert fin["rent_days_in_arrears"] == 0
        assert fin["arrears_amount"] == 0.0
        assert round(fin["advance_amount"], 2) == 266666.67
        assert round(fin["rent_accrued"], 2) == 733333.33
        assert fin["total_paid"] == 1000000.0
        assert fin["contract_rent"] == 6000000.0
        assert not fin["is_overdue"]

    def test_arrears_identity(self):
        fin = _compute_rent_financials(
            "2026-01-01", [_p(15, 250000, 500000)], 500000, today=date(2026, 1, 20)
        )
        assert fin["rent_days_in_arrears"] == 4
        assert round(fin["arrears_amount"], 2) == 66666.67
        assert fin["advance_amount"] == 0.0
        assert fin["is_overdue"] is True
        # identity: arrears>0 iff days>0 iff overdue (money drives the days)
        assert (fin["arrears_amount"] > 0) == (fin["rent_days_in_arrears"] > 0) == fin["is_overdue"]

    def test_rent_change_uses_current_rate(self):
        # Money ledger: a rate change affects future accrual from the anchor;
        # historical frozen rates never revalue arrears/advance.
        fin = _compute_rent_financials(
            "2026-01-01", [_p(90, 1500000, 500000, frozen=500000)], 1000000,
            today=date(2026, 3, 1),
        )
        assert round(fin["rent_accrued"], 2) == 1966666.67
        assert fin["arrears_amount"] > 0
        assert round(fin["arrears_amount"], 2) == 466666.67
        assert fin["advance_amount"] == 0.0
        assert fin["is_overdue"] is True
        assert fin["rent_days_in_arrears"] == 14

    def test_rent_change_never_revalues_money(self):
        fin = _compute_rent_financials(
            "2026-01-01", [_p(60, 1000000, 500000, frozen=500000)], 300000,
            today=date(2026, 1, 20),
        )
        # 1,000,000 paid vs 190,000 accrued -> 810,000 advance credit.
        assert round(fin["advance_amount"], 2) == 810000.0
        assert round(fin["rent_accrued"], 2) == 190000.0
        assert fin["arrears_amount"] == 0.0
        assert fin["paid_until_date"] == "2026-04-11"
        assert fin["rent_days_remaining"] == 81

    def test_partial_payment_credit_carried(self):
        fin = _compute_rent_financials(
            "2026-01-01", [_p(10, 350000, 1000000, frozen=1000000)], 1000000,
            today=date(2026, 1, 11),
        )
        assert fin["rent_days_remaining"] == 0
        assert fin["rent_days_in_arrears"] == 0
        assert round(fin["advance_amount"], 2) == 16666.67
        assert fin["arrears_amount"] == 0.0

    def test_deposit_never_affects_coverage(self):
        fin = _compute_rent_financials(
            "2026-01-01",
            [_p(30, 500000, 500000, ptype="deposit"), _p(30, 500000, 500000)],
            500000,
            today=date(2026, 1, 20),
        )
        assert fin["total_paid"] == 500000.0
        assert fin["paid_until_date"] == "2026-01-31"
        assert fin["rent_days_remaining"] == 11
        assert round(fin["advance_amount"], 2) == 183333.33

    def test_pending_and_rejected_never_affect_coverage(self):
        fin = _compute_rent_financials(
            "2026-01-01",
            [
                _p(30, 500000, 500000, status="pending"),
                _p(30, 500000, 500000, status="rejected"),
            ],
            500000,
            today=date(2026, 1, 20),
        )
        assert fin["total_paid"] == 0.0
        assert fin["paid_until_date"] == "2026-01-01"
        assert fin["rent_days_in_arrears"] == 19
        assert round(fin["arrears_amount"], 2) == 316666.67

    def test_no_anchor_keeps_total_paid(self):
        fin = _compute_rent_financials(None, [_p(30, 500000, 500000)], 500000)
        assert fin["total_paid"] == 500000.0
        assert fin["paid_until_date"] is None
        assert fin["arrears_amount"] is None
        assert fin["advance_amount"] is None
        assert fin["is_overdue"] is None

    def test_zero_rent_guards(self):
        fin = _compute_rent_financials(
            "2026-01-01", [_p(0, 500000, 0, frozen=0)], 0, today=date(2026, 1, 20)
        )
        # No rate -> nothing accrues -> the payment is pure credit, not overdue.
        assert fin["arrears_amount"] == 0.0
        assert fin["advance_amount"] == 500000.0
        assert fin["is_overdue"] is False
        assert fin["rent_days_in_arrears"] == 0

    def test_client_arrears_example(self):
        # Monthly rent 1M, effective 10 Aug, today 25 Sep (46 days elapsed),
        # only 1M paid (30 coverage days): 16 days / 533333.33 in arrears.
        fin = _compute_rent_financials(
            "2026-08-10", [_p(30, 1000000, 1000000)], 1000000, today=date(2026, 9, 25)
        )
        assert round(fin["rent_accrued"], 2) == 1533333.33
        assert fin["rent_days_in_arrears"] == 16
        assert round(fin["arrears_amount"], 2) == 533333.33
        assert fin["is_overdue"] is True

    def test_client_advance_example(self):
        # 3M paid (90 coverage days) vs 46 elapsed days: 44 days remain.
        fin = _compute_rent_financials(
            "2026-08-10", [_p(90, 3000000, 1000000)], 1000000, today=date(2026, 9, 25)
        )
        assert fin["paid_until_date"] == "2026-11-08"
        assert fin["rent_days_remaining"] == 44
        assert fin["rent_days_in_arrears"] == 0
        assert round(fin["advance_amount"], 2) == 1466666.67
        assert not fin["is_overdue"]


class TestPaymentCoverageFrozen:
    def test_confirmed_rent_gets_frozen_rate(self, owner_client: TestClient):
        resp = owner_client.post("/payments", json={
            "lease_id": PID_LEASE,
            "tenant_id": PID_TENANT,
            "amount": 1500000,
            "payment_type": "rent",
            "due_date": "2026-04-01",
        })
        assert resp.status_code == 201
        body = resp.json()
        assert body["coverage_days"] == 30
        assert body["frozen_monthly_rent"] == 1500000

    def test_deposit_gets_no_coverage(self, owner_client: TestClient):
        resp = owner_client.post("/payments", json={
            "lease_id": PID_LEASE,
            "tenant_id": PID_TENANT,
            "amount": 1500000,
            "payment_type": "deposit",
            "due_date": "2026-04-01",
        })
        assert resp.status_code == 201
        body = resp.json()
        assert body.get("coverage_days") is None
        assert body.get("frozen_monthly_rent") is None


def _lease_with_anchor(mock_supabase, anchor):
    """Patch the leases table to return one row with the given anchor (or none)."""
    builder = MagicMock()
    resp = MagicMock()
    if anchor:
        resp.data = [{"rent_effective_date": anchor, "monthly_rent": 1500000}]
    else:
        resp.data = []
    builder.select.return_value.eq.return_value.execute.return_value = resp
    orig_table = mock_supabase.table
    return patch.object(
        mock_supabase,
        "table",
        side_effect=lambda name: builder if name == "leases" else orig_table(name),
    )


def _lease_unanchored(mock_supabase, start):
    """Leases table with no billing anchor but a known start_date.

    Reads for rent_effective_date return empty (unanchored lease); other
    reads return the lease row; the update write is captured so tests can
    assert the auto-anchor value that would be persisted.
    """
    builder = MagicMock()
    no_anchor = MagicMock()
    no_anchor.data = []
    lease_row = MagicMock()
    lease_row.data = [{"start_date": start, "monthly_rent": 1500000}]

    def _select(cols="*", *args, **kwargs):
        q = MagicMock()
        q.eq.return_value.execute.return_value = (
            no_anchor if "rent_effective_date" in cols else lease_row
        )
        return q

    builder.select.side_effect = _select
    update_resp = MagicMock()
    update_resp.data = [{"id": PID_LEASE}]
    builder.update.return_value.eq.return_value.is_.return_value.execute.return_value = (
        update_resp
    )
    orig_table = mock_supabase.table
    ctx = patch.object(
        mock_supabase,
        "table",
        side_effect=lambda name: builder if name == "leases" else orig_table(name),
    )
    return builder, ctx


class TestPaymentAnchorGate:
    def test_confirmed_rent_auto_anchors_from_start_date(self, mock_supabase):
        # New contract: a confirmed rent payment on an unanchored lease no
        # longer raises; it writes the billing anchor, sourced from the lease
        # start_date, then computes coverage as usual.
        svc = PaymentService(mock_supabase)
        leases_mock, ctx = _lease_unanchored(mock_supabase, "2026-01-01")
        with ctx:
            payment = svc.create(PaymentCreate(
                lease_id=PID_LEASE, tenant_id=PID_TENANT, amount=1500000,
                payment_type="rent",
            ))
        leases_mock.update.assert_called_once_with(
            {"rent_effective_date": "2026-01-01"}
        )
        assert payment["coverage_days"] == 30
        assert payment["frozen_monthly_rent"] == 1500000

    def test_confirmed_rent_writes_coverage_with_anchor(self, mock_supabase):
        svc = PaymentService(mock_supabase)
        with _lease_with_anchor(mock_supabase, "2026-01-01"):
            payment = svc.create(PaymentCreate(
                lease_id=PID_LEASE, tenant_id=PID_TENANT, amount=1500000,
                payment_type="rent",
            ))
        assert payment["coverage_days"] == 30
        assert payment["frozen_monthly_rent"] == 1500000

    def test_deposit_without_anchor_allowed(self, mock_supabase):
        svc = PaymentService(mock_supabase)
        with _lease_with_anchor(mock_supabase, None):
            payment = svc.create(PaymentCreate(
                lease_id=PID_LEASE, tenant_id=PID_TENANT, amount=1500000,
                payment_type="deposit",
            ))
        assert payment.get("coverage_days") is None

    def test_pending_rent_without_anchor_allowed(self, mock_supabase):
        svc = PaymentService(mock_supabase)
        with _lease_with_anchor(mock_supabase, None):
            payment = svc.create(PaymentCreate(
                lease_id=PID_LEASE, tenant_id=PID_TENANT, amount=1500000,
                payment_type="rent", status="pending",
            ))
        assert payment.get("coverage_days") is None

    def test_endpoint_accepts_confirmed_rent_and_sets_anchor(
        self, tenant_client: TestClient, mock_supabase
    ):
        # New contract: the endpoint accepts the payment (201) and the lease
        # gains a rent_effective_date, anchored to its start_date.
        leases_mock, ctx = _lease_unanchored(mock_supabase, "2026-01-01")
        with ctx:
            resp = tenant_client.post("/payments", json={
                "lease_id": PID_LEASE,
                "amount": 1500000,
                "payment_type": "rent",
                "due_date": "2026-04-01",
            })
        assert resp.status_code == 201
        leases_mock.update.assert_called_once_with(
            {"rent_effective_date": "2026-01-01"}
        )

    def test_endpoint_allows_confirmed_rent_with_anchor(
        self, tenant_client: TestClient, mock_supabase
    ):
        with _lease_with_anchor(mock_supabase, "2026-01-01"):
            resp = tenant_client.post("/payments", json={
                "lease_id": PID_LEASE,
                "amount": 1500000,
                "payment_type": "rent",
                "due_date": "2026-04-01",
            })
        assert resp.status_code == 201
        assert resp.json()["coverage_days"] == 30


class TestGetOverdueExcludesTerminated:
    def test_terminated_excluded_active_included(self, mock_supabase):
        svc = PaymentService(mock_supabase)
        terminated = {"is_overdue": True, "effective_status": "terminated", "arrears_amount": 500000.0}
        active = {"is_overdue": True, "effective_status": "active", "arrears_amount": 300000.0}
        with patch("services.crud._enrich_leases", return_value=[terminated, active]):
            overdue, total = svc.get_overdue(UUID(UID_OWNER))
        assert total == 1
        assert len(overdue) == 1
        assert overdue[0] is active

    def test_terminated_arrears_still_reportable(self):
        # The coverage model keeps arrears for terminated leases so reports and
        # historical views can still surface what was owed at termination.
        term = _compute_rent_financials(
            "2026-01-01", [_p(10, 250000, 500000)], 500000, today=date(2026, 1, 20)
        )
        assert term["is_overdue"] is True
        assert term["arrears_amount"] > 0
