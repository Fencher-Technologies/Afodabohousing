from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_supabase_client
from models import (
    MaintenanceRequestCreate,
    MaintenanceRequestResponse,
    MaintenanceRequestUpdate,
)
from services import MaintenanceRequestService, get_maintenance_request_service

router = APIRouter(prefix="/maintenance-requests", tags=["maintenance_requests"])


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


def get_request_svc(
    supabase: Client = Depends(get_supabase_client),
) -> MaintenanceRequestService:
    return get_maintenance_request_service(supabase)


@router.get("/property/{property_id}", response_model=PaginatedResponse)
def list_requests_by_property(
    property_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    service: MaintenanceRequestService = Depends(get_request_svc),
) -> PaginatedResponse:
    requests, total = service.get_by_property(property_id, skip, limit)
    return PaginatedResponse(
        items=[MaintenanceRequestResponse(**r) for r in requests],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{request_id}", response_model=MaintenanceRequestResponse)
def get_request(
    request_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: MaintenanceRequestService = Depends(get_request_svc),
) -> MaintenanceRequestResponse:
    req = service.get_by_id(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return MaintenanceRequestResponse(**req)


@router.post("", response_model=MaintenanceRequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    data: MaintenanceRequestCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: MaintenanceRequestService = Depends(get_request_svc),
) -> MaintenanceRequestResponse:
    req = service.create(data)
    return MaintenanceRequestResponse(**req)


@router.patch("/{request_id}", response_model=MaintenanceRequestResponse)
def update_request(
    request_id: UUID,
    data: MaintenanceRequestUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    service: MaintenanceRequestService = Depends(get_request_svc),
) -> MaintenanceRequestResponse:
    req = service.update(request_id, data)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return MaintenanceRequestResponse(**req)


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(
    request_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: MaintenanceRequestService = Depends(get_request_svc),
) -> None:
    success = service.delete(request_id)
    if not success:
        raise HTTPException(status_code=404, detail="Request not found")
