from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class Lease(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    owner_id: UUID
    property_id: UUID
    tenant_id: UUID
    start_date: date
    end_date: date
    monthly_rent: Decimal
    security_deposit: Decimal
    status: str
    terms: str | None = None
    termination_date: date | None = None
    termination_reason: str | None = None


class RenewLease(BaseModel):
    new_end_date: date
    monthly_rent: Decimal | None = None
    notes: str | None = None

    unit_label: str | None = None
    created_at: datetime
    updated_at: datetime


class RenewalHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    previous_end_date: date | None = None
    new_end_date: date
    monthly_rent: Decimal | None = None
    notes: str | None = None
    renewed_by: UUID | None = None
    renewed_by_name: str | None = None
    renewed_at: datetime | None = None


class LeaseCreate(BaseModel):
    property_id: UUID
    tenant_id: UUID
    start_date: date
    end_date: date
    monthly_rent: Decimal
    security_deposit: Decimal
    status: str = "draft"
    terms: str | None = None
    unit_label: str | None = None


class LeaseUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    monthly_rent: Decimal | None = None
    security_deposit: Decimal | None = None
    status: str | None = None
    terms: str | None = None
    termination_date: date | None = None
    termination_reason: str | None = None


class SetRentEffectiveDate(BaseModel):
    rent_effective_date: date


class LeaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    owner_id: UUID
    property_id: UUID
    tenant_id: UUID
    start_date: date
    end_date: date
    monthly_rent: Decimal
    security_deposit: Decimal
    status: str
    terms: str | None = None
    termination_date: date | None = None
    termination_reason: str | None = None
    unit_label: str | None = None
    created_at: datetime
    updated_at: datetime
    # Enriched (server-side) fields — populated by LeaseService, not stored on the row
    tenant_name: str | None = None
    tenant_phone: str | None = None
    tenant_email: str | None = None
    property_title: str | None = None
    property_image: str | None = None
    # Money-ledger canonical money fields (source of truth). Computed in
    # _enrich_leases from the permanent billing anchor (rent_effective_date):
    #   rent_accrued   = daily rate * days elapsed since the anchor
    #   arrears_amount = max(0, rent_accrued - total_paid)
    #   advance_amount = max(0, total_paid - rent_accrued)
    # `expected_rent`/`balance_due`/`tenant_credit` are deprecated aliases for
    # one release only: expected_rent -> rent_accrued, balance_due ->
    # arrears_amount, tenant_credit -> advance_amount.
    balance_due: float | None = None
    total_paid: float | None = None
    expected_rent: float | None = None
    tenant_credit: float | None = None
    rent_accrued: float | None = None
    arrears_amount: float | None = None
    advance_amount: float | None = None
    contract_rent: float | None = None
    effective_status: str | None = None
    is_overdue: bool | None = None
    last_payment_date: date | None = None
    last_payment_amount: float | None = None
    last_payment_method: str | None = None
    # Rent coverage tracking — computed in _enrich_leases. rent_effective_date
    # is the permanent 30-day billing anchor (set once, never changed). The
    # day fields below (paid_until_date/rent_days_*) are DERIVED DISPLAY
    # values from the money position — never a second source of truth.
    # next_payment_due_date is the next 30-day billing boundary, independent
    # of payments. coverage_days per payment remains stored/displayed but
    # never drives arrears/advance/overdue.
    rent_effective_date: date | None = None
    paid_until_date: date | None = None
    rent_days_remaining: int | None = None
    rent_days_in_arrears: int | None = None
    next_payment_due_date: date | None = None
    # Tenancy progress — computed in _enrich_leases
    tenancy_total_days: int = 1
    tenancy_elapsed_days: int = 0
    tenancy_remaining_days: int = 0
    tenancy_progress_pct: float = 0.0
    # Manager / owner contact — resolved from profiles via owner_id
    manager_name: str | None = None
    manager_phone: str | None = None
    manager_email: str | None = None
