from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class Message(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sender_id: UUID
    receiver_id: UUID
    property_id: UUID | None = None
    content: str | None = None
    voice_note_url: str | None = None
    is_read: bool = False
    created_at: datetime


class MessageCreate(BaseModel):
    receiver_id: UUID
    property_id: UUID | None = None
    content: str | None = None
    voice_note_url: str | None = None


class MessageUpdate(BaseModel):
    is_read: bool | None = None


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sender_id: UUID
    receiver_id: UUID
    property_id: UUID | None = None
    content: str | None = None
    voice_note_url: str | None = None
    is_read: bool
    created_at: datetime
    sender_name: str | None = None
    receiver_name: str | None = None
