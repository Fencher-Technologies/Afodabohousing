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
    created_at: datetime
    updated_at: datetime


class PaymentCreate(BaseModel):
    lease_id: UUID
    tenant_id: UUID
    amount: Decimal
    payment_type: str
    payment_method: str | None = None
    status: str = "pending"
    due_date: date
    paid_date: date | None = None
    transaction_id: str | None = None
    notes: str | None = None


class PaymentUpdate(BaseModel):
    amount: Decimal | None = None
    payment_type: str | None = None
    payment_method: str | None = None
    status: str | None = None
    due_date: date | None = None
    paid_date: date | None = None
    transaction_id: str | None = None
    notes: str | None = None


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
    created_at: datetime
    updated_at: datetime
