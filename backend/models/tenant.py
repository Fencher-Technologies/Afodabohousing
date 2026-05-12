from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class Tenant(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    owner_id: UUID
    user_id: UUID | None = None
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    employer: str | None = None
    monthly_income: float | None = None
    credit_score: int | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    notes: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class TenantCreate(BaseModel):
    user_id: UUID | None = None
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    employer: str | None = None
    monthly_income: float | None = None
    credit_score: int | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    notes: str | None = None
    status: str = "active"


class TenantUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    employer: str | None = None
    monthly_income: float | None = None
    credit_score: int | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    notes: str | None = None
    status: str | None = None


class TenantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    owner_id: UUID
    user_id: UUID | None = None
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None = None
    employer: str | None = None
    monthly_income: float | None = None
    credit_score: int | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    notes: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
