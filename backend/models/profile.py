from datetime import datetime
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
    created_at: datetime
    updated_at: datetime


class ProfileCreate(BaseModel):
    email: str
    full_name: str | None = None
    phone: str | None = None
    role: str | None = None


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
    created_at: datetime
