from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from typing import Literal

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
    photo_url: str | None = None


# A request moves open -> scheduled -> completed. "cancelled" is a terminal
# exit from any state. Nothing previously constrained this field, so any
# string was accepted and the UIs had no set to render.
MaintenanceStatus = Literal["open", "scheduled", "completed", "cancelled"]
MaintenancePriority = Literal["low", "medium", "high", "urgent"]

# Which state may follow which. Enforced on update.
ALLOWED_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "open": {"scheduled", "completed", "cancelled"},
    "scheduled": {"completed", "cancelled", "open"},
    "completed": set(),
    "cancelled": set(),
}


class MaintenanceRequestCreate(BaseModel):
    property_id: UUID
    tenant_id: UUID | None = None
    title: str
    description: str
    priority: MaintenancePriority = "medium"
    # A photo of the problem is the most useful thing a tenant can attach.
    photo_url: str | None = None
    # A request always starts open; scheduling and completion are manager
    # actions taken afterwards, so those fields are not accepted at creation.
    status: Literal["open"] = "open"


class MaintenanceRequestUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: MaintenancePriority | None = None
    status: MaintenanceStatus | None = None
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
    photo_url: str | None = None
