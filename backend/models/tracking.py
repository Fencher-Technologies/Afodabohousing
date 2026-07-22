from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class PageViewCreate(BaseModel):
    path: str
    referrer: str | None = None
    session_id: str | None = None
    metadata: dict | None = None


class PageViewResponse(BaseModel):
    id: UUID
    path: str
    user_id: UUID | None
    created_at: datetime


class PageViewStats(BaseModel):
    total_views: int
    unique_visitors: int
    views_by_path: list[dict]
    views_by_day: list[dict]
