from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MaintenanceRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    property_id: UUID
    tenant_id: UUID | None = None
    title: str
    description: str
    priority: str
    status: str
    scheduled_date: date | None = None
    completed_date: date | None = None
    cost: Decimal | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class MaintenanceRequestCreate(BaseModel):
    property_id: UUID
    tenant_id: UUID | None = None
    title: str
    description: str
    priority: str = "medium"
    status: str = "open"
    scheduled_date: date | None = None
    completed_date: date | None = None
    cost: Decimal | None = None
    notes: str | None = None


class MaintenanceRequestUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    scheduled_date: date | None = None
    completed_date: date | None = None
    cost: Decimal | None = None
    notes: str | None = None


class MaintenanceRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    property_id: UUID
    tenant_id: UUID | None = None
    title: str
    description: str
    priority: str
    status: str
    scheduled_date: date | None = None
    completed_date: date | None = None
    cost: Decimal | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
