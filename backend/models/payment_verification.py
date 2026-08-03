from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PaymentVerification(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    lease_id: UUID
    tenant_id: UUID
    owner_id: UUID
    property_id: UUID
    amount: Decimal
    payment_method: str
    transaction_reference: str | None = None
    payment_date: date
    screenshot_url: str | None = None
    notes: str | None = None
    status: str = "pending"
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    rejection_reason: str | None = None
    created_at: datetime
    updated_at: datetime


class PaymentVerificationTenant(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    email: str | None = None


class PaymentVerificationProperty(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    title: str | None = None


class PaymentVerificationCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    payment_method: str
    transaction_reference: str | None = None
    payment_date: date
    screenshot_url: str | None = None
    notes: str | None = None


class PaymentVerificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    lease_id: UUID
    tenant_id: UUID
    owner_id: UUID
    property_id: UUID
    amount: Decimal
    payment_method: str
    transaction_reference: str | None = None
    payment_date: date
    screenshot_url: str | None = None
    notes: str | None = None
    status: str
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    rejection_reason: str | None = None
    created_at: datetime
    updated_at: datetime
    tenants: PaymentVerificationTenant | None = None
    properties: PaymentVerificationProperty | None = None


class PaymentVerificationReject(BaseModel):
    rejection_reason: str = Field(..., min_length=1)
