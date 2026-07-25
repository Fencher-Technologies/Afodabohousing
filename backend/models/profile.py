from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class Profile(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    email: str
    full_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    role: str | None = None
    status: Literal["active", "suspended", "pending"] = "active"
    created_by: UUID | None = None
    manager_id: UUID | None = None
    created_at: datetime
    updated_at: datetime
    accepted_terms: bool = False
    accepted_terms_at: datetime | None = None
    terms_version: str | None = None
    privacy_version: str | None = None


class ProfileCreate(BaseModel):
    email: str
    full_name: str | None = None
    phone: str | None = None
    role: str | None = None
    status: Literal["active", "suspended", "pending"] = "active"
    created_by: UUID | None = None
    manager_id: UUID | None = None
    accepted_terms: bool = False
    accepted_terms_at: datetime | None = None
    terms_version: str | None = None
    privacy_version: str | None = None


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    email: str
    full_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    role: str | None = None
    status: str | None = None
    created_by: str | None = None
    manager_id: str | None = None
    created_at: datetime
    accepted_terms: bool = False
    accepted_terms_at: datetime | None = None
    terms_version: str | None = None
    privacy_version: str | None = None
