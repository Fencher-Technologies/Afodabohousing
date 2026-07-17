from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RenewalRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    lease_id: UUID
    tenant_id: UUID
    status: str  # pending, approved, rejected
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

class RenewalRequestCreate(BaseModel):
    notes: str | None = None

class RenewalRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    lease_id: UUID
    tenant_id: UUID
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
