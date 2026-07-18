# mypy: ignore-errors
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from dependencies import CurrentUser, require_manager
from models import ProfileResponse

router = APIRouter(prefix="/managers", tags=["managers"])


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


@router.get("", response_model=PaginatedResponse)
def list_managers(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    user_id: UUID | None = None,
    email: str | None = None,
    phone: str | None = None,
    current_user: CurrentUser = Depends(require_manager),
) -> PaginatedResponse:
    # TODO: Replace with Supabase query or Joel’s new data access pattern
    managers = []  # placeholder
    total = 0
    return PaginatedResponse(
        items=[ProfileResponse(**manager) for manager in managers],
        total=total,
        skip=skip,
        limit=limit,
    )
