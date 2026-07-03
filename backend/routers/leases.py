# mypy: ignore-errors
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_supabase_client
from models import LeaseCreate, LeaseResponse, LeaseUpdate
from services import LeaseService, get_lease_service

router = APIRouter(prefix="/leases", tags=["leases"])


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


def get_lease_svc(supabase: Client = Depends(get_supabase_client)) -> LeaseService:
    return get_lease_service(supabase)


@router.get("", response_model=PaginatedResponse)
def list_leases(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    service: LeaseService = Depends(get_lease_svc),
) -> PaginatedResponse:
    tenant = (
        supabase.table("tenants")
        .select("id")
        .eq("user_id", current_user.id)
        .execute()
    )
    if tenant.data:
        leases, total = service.get_all_for_tenant(tenant.data[0]["id"], skip, limit)
    else:
        leases, total = service.get_all(current_user.id, skip, limit)
    return PaginatedResponse(
        items=[LeaseResponse(**lease) for lease in leases],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{lease_id}", response_model=LeaseResponse)
def get_lease(
    lease_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: LeaseService = Depends(get_lease_svc),
) -> LeaseResponse:
    lease = service.get_by_id(lease_id, current_user.id)
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    return LeaseResponse(**lease)


@router.post("", response_model=LeaseResponse, status_code=status.HTTP_201_CREATED)
def create_lease(
    data: LeaseCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: LeaseService = Depends(get_lease_svc),
) -> LeaseResponse:
    lease = service.create(data, current_user.id)
    return LeaseResponse(**lease)


@router.patch("/{lease_id}", response_model=LeaseResponse)
def update_lease(
    lease_id: UUID,
    data: LeaseUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    service: LeaseService = Depends(get_lease_svc),
) -> LeaseResponse:
    lease = service.update(lease_id, data, current_user.id)
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    return LeaseResponse(**lease)


@router.delete("/{lease_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lease(
    lease_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: LeaseService = Depends(get_lease_svc),
) -> None:
    success = service.delete(lease_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Lease not found")
