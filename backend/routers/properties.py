from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import (
    CurrentUser,
    get_current_user,
    get_service_client,
    get_supabase_client,
    require_super_admin_or_manager,
)
from models.property import PropertyCreate, PropertyResponse, PropertyUpdate
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


@router.get("/public")
def list_public_properties(
    state: str | None = Query(None),
    property_type: str | None = Query(None),
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    svc = PropertyService(get_service_client())
    properties_data, total = svc.get_public_listings(
        skip=skip, limit=limit, state=state,
        property_type=property_type,
        min_price=min_price, max_price=max_price,
    )

    # Normalize field names for frontend compatibility
    items = []
    for p in (properties_data or []):
        p["rent_amount"] = p.pop("monthly_rent", None)
        items.append(p)

    return {"items": items, "total": total, "skip": skip, "limit": limit}


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


@router.get("/public/{property_id}")
def get_public_property(
    property_id: UUID,
) -> dict:
    svc = PropertyService(get_service_client())
    property_data = svc.get_by_id_public(property_id)
    if not property_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found or inactive",
        )
    property_data["rent_amount"] = property_data.pop("monthly_rent", None)
    return property_data


@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
def create_property(
    data: PropertyCreate,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    service: PropertyService = Depends(get_property_svc),
) -> PropertyResponse:
    property_data = service.create(data, current_user.id)
    return PropertyResponse(**property_data)


@router.patch("/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: UUID,
    data: PropertyUpdate,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
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
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    service: PropertyService = Depends(get_property_svc),
) -> None:
    success = service.delete(property_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )
