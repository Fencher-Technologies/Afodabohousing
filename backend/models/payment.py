from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class Payment(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    lease_id: UUID
    tenant_id: UUID
    amount: Decimal
    payment_type: str
    payment_method: str | None = None
    status: str
    due_date: date
    paid_date: date | None = None
    transaction_id: str | None = None
    notes: str | None = None
    proof_url: str | None = None
    created_at: datetime
    updated_at: datetime


class PaymentCreate(BaseModel):
    lease_id: UUID
    tenant_id: UUID | None = None
    amount: Decimal
    payment_type: str
    payment_method: str | None = None
    status: str = "confirmed"
    due_date: date | None = None
    paid_date: date | None = None
    transaction_id: str | None = None
    notes: str | None = None
    proof_url: str | None = None


class PaymentUpdate(BaseModel):
    amount: Decimal | None = None
    payment_type: str | None = None
    payment_method: str | None = None
    status: str | None = None
    due_date: date | None = None
    paid_date: date | None = None
    transaction_id: str | None = None
    notes: str | None = None
    proof_url: str | None = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    lease_id: UUID
    tenant_id: UUID
    amount: Decimal
    payment_type: str
    payment_method: str | None = None
    status: str
    due_date: date
    paid_date: date | None = None
    transaction_id: str | None = None
    notes: str | None = None
    proof_url: str | None = None
    created_at: datetime
    updated_at: datetime
    coverage_days: int | None = None
    frozen_monthly_rent: int | None = None
    # The period this payment covers. Derived from paid_date + coverage_days
    # so the Payment Record screen can show an end date rather than only a
    # day count.
    coverage_start_date: date | None = None
    coverage_end_date: date | None = None
    currency: str = "UGX"
    tenant_name: str | None = None
    property_title: str | None = None
    method: str | None = None
