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
    balance_due: float | None = None
    total_paid: float | None = None
    expected_rent: float | None = None
    tenant_credit: float | None = None
    effective_status: str | None = None
    is_overdue: bool | None = None
    last_payment_date: date | None = None
    last_payment_amount: float | None = None
    last_payment_method: str | None = None
    # Manager / owner contact — resolved from profiles via owner_id
    manager_name: str | None = None
    manager_phone: str | None = None
    manager_email: str | None = None
