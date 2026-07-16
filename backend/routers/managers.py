# mypy: ignore-errors
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_supabase_client
from models import ProfileResponse
from services import ManagerService, get_manager_service

router = APIRouter(prefix="/managers", tags=["managers"])


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


def get_manager_svc(supabase: Client = Depends(get_supabase_client)) -> ManagerService:
    return get_manager_service(supabase)


@router.get("", response_model=PaginatedResponse)
def list_managers(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    user_id: UUID | None = None,
    email: str | None = None,
    phone: str | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    service: ManagerService = Depends(get_manager_svc),
) -> PaginatedResponse:
    _ = current_user
    managers, total = service.get_all(
        skip,
        limit,
        search=search,
        user_id=user_id,
        email=email,
        phone=phone,
    )
    return PaginatedResponse(
        items=[ProfileResponse(**manager) for manager in managers],
        total=total,
        skip=skip,
        limit=limit,
    )
