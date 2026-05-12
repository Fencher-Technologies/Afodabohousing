from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_supabase_client
from models import PropertyCreate, PropertyResponse, PropertyUpdate
from services import PropertyService, get_property_service

router = APIRouter(prefix="/properties", tags=["properties"])


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


def get_property_svc(supabase: Client = Depends(get_supabase_client)) -> PropertyService:
    return get_property_service(supabase)


@router.get("", response_model=PaginatedResponse)
def list_properties(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    service: PropertyService = Depends(get_property_svc),
) -> PaginatedResponse:
    properties, total = service.get_all(current_user.id, skip, limit)
    return PaginatedResponse(
        items=[PropertyResponse(**p) for p in properties],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/public", response_model=PaginatedResponse)
def list_public_properties(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    service: PropertyService = Depends(get_property_svc),
) -> PaginatedResponse:
    properties, total = service.get_public_listings(skip, limit)
    return PaginatedResponse(
        items=[PropertyResponse(**p) for p in properties],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{property_id}", response_model=PropertyResponse)
def get_property(
    property_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: PropertyService = Depends(get_property_svc),
) -> PropertyResponse:
    property_data = service.get_by_id(property_id, current_user.id)
    if not property_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )
    return PropertyResponse(**property_data)


@router.get("/public/{property_id}", response_model=PropertyResponse)
def get_public_property(
    property_id: UUID,
    service: PropertyService = Depends(get_property_svc),
) -> PropertyResponse:
    property_data = service.get_by_id_public(property_id)
    if not property_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found or inactive",
        )
    return PropertyResponse(**property_data)


@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
def create_property(
    data: PropertyCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: PropertyService = Depends(get_property_svc),
) -> PropertyResponse:
    property_data = service.create(data, current_user.id)
    return PropertyResponse(**property_data)


@router.patch("/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: UUID,
    data: PropertyUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    service: PropertyService = Depends(get_property_svc),
) -> PropertyResponse:
    property_data = service.update(property_id, data, current_user.id)
    if not property_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )
    return PropertyResponse(**property_data)


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: PropertyService = Depends(get_property_svc),
) -> None:
    success = service.delete(property_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )
