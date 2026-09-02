from uuid import UUID

import re

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from postgrest.exceptions import APIError
from supabase import Client

from dependencies import (
    CurrentUser,
    get_current_user,
    get_service_client,
    get_supabase_client,
    require_active_subscription,
)
from models import PropertyCreate, PropertyResponse, PropertyUpdate
from services import PropertyService, get_property_service

router = APIRouter(prefix="/properties", tags=["properties"])


def _clean_db_error(err: APIError) -> str:
    """Turn a raw PostgREST/Postgres error into a specific, user-safe message."""
    msg = getattr(err, "message", "") or str(err)
    col = re.search(r'column "([^"]+)"', msg)
    if "not-null constraint" in msg or "null value in column" in msg:
        return f"Missing required value: {col.group(1) if col else 'a field'}."
    if "duplicate key" in msg:
        return "This record already exists."
    if "foreign key constraint" in msg:
        return "A related record could not be found."
    if "check constraint" in msg:
        return "One of the values provided is invalid."
    return "Could not save the property. Please check your input."


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
    response: Response,
    state: str | None = Query(None),
    country: str | None = Query(None),
    region_id: str | None = Query(None),
    property_type: str | None = Query(None),
    property_type_slug: str | None = Query(None),
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
) -> PaginatedResponse:
    response.headers["Cache-Control"] = "public, max-age=30, stale-while-revalidate=60"
    svc = PropertyService(get_service_client())
    try:
        properties_data, total = svc.get_public_listings(
            skip=skip, limit=limit, state=state,
            country=country, region_id=region_id,
            property_type=property_type,
            property_type_slug=property_type_slug,
            min_price=min_price, max_price=max_price,
        )
    except Exception as e:
        msg = str(e)
        if "Temporary failure in name resolution" in msg or "ConnectError" in type(e).__name__ or "ReadError" in type(e).__name__:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database temporarily unavailable, please retry")
        raise
    return PaginatedResponse(
        items=[PropertyResponse(**p) for p in properties_data],
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
) -> PropertyResponse:
    svc = PropertyService(get_service_client())
    property_data = svc.get_by_id_public(property_id)
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
    _subscription_guard: CurrentUser = Depends(require_active_subscription),
    service: PropertyService = Depends(get_property_svc),
) -> PropertyResponse:
    try:
        property_data = service.create(data, current_user.id)
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_clean_db_error(e))
    return PropertyResponse(**property_data)


@router.patch("/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: UUID,
    data: PropertyUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    _subscription_guard: CurrentUser = Depends(require_active_subscription),
    service: PropertyService = Depends(get_property_svc),
) -> PropertyResponse:
    try:
        property_data = service.update(property_id, data, current_user.id)
    except APIError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_clean_db_error(e))
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
    _subscription_guard: CurrentUser = Depends(require_active_subscription),
    service: PropertyService = Depends(get_property_svc),
) -> None:
    success = service.delete(property_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )
