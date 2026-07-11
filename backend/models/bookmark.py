from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class Bookmark(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    property_id: UUID
    created_at: datetime

class BookmarkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    property_id: UUID
    created_at: datetime
