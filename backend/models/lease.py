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
    created_at: datetime
    updated_at: datetime
