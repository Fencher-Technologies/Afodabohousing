# mypy: ignore-errors
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_supabase_client
from models import RentalUnitCreate, RentalUnitResponse, RentalUnitUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rental-units", tags=["rental-units"])


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


@router.get("/property/{property_id}", response_model=PaginatedResponse)
def list_units_by_property(
    property_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    supabase: Client = Depends(get_supabase_client),
) -> PaginatedResponse:
    count_resp = (
        supabase.table("rental_units")
        .select("*", count="exact")
        .eq("property_id", str(property_id))
        .execute()
    )
    total = count_resp.count if hasattr(count_resp, "count") else 0
    response = (
        supabase.table("rental_units")
        .select("*")
        .eq("property_id", str(property_id))
        .order("unit_number")
        .range(skip, skip + limit - 1)
        .execute()
    )
    return PaginatedResponse(
        items=[RentalUnitResponse(**u) for u in (response.data or [])],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{unit_id}", response_model=RentalUnitResponse)
def get_unit(
    unit_id: UUID,
    supabase: Client = Depends(get_supabase_client),
) -> RentalUnitResponse:
    result = supabase.table("rental_units").select("*").eq("id", str(unit_id)).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Unit not found")
    return RentalUnitResponse(**result.data[0])


@router.post("", response_model=RentalUnitResponse, status_code=status.HTTP_201_CREATED)
def create_unit(
    data: RentalUnitCreate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> RentalUnitResponse:
    prop = supabase.table("properties").select("owner_id").eq("id", str(data.property_id)).execute()
    if not prop.data or str(prop.data[0]["owner_id"]) != current_user.id:
        raise HTTPException(status_code=403, detail="You don't own this property")

    payload = data.model_dump(exclude_none=True, mode="json")
    payload["owner_id"] = current_user.id
    result = supabase.table("rental_units").insert(payload).execute()
    return RentalUnitResponse(**result.data[0])


@router.patch("/{unit_id}", response_model=RentalUnitResponse)
def update_unit(
    unit_id: UUID,
    data: RentalUnitUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> RentalUnitResponse:
    existing = supabase.table("rental_units").select("*").eq("id", str(unit_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Unit not found")
    if str(existing.data[0]["owner_id"]) != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    payload = data.model_dump(exclude_none=True, mode="json")
    if not payload:
        return RentalUnitResponse(**existing.data[0])

    result = supabase.table("rental_units").update(payload).eq("id", str(unit_id)).execute()
    return RentalUnitResponse(**result.data[0])


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(
    unit_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> None:
    existing = supabase.table("rental_units").select("owner_id").eq("id", str(unit_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Unit not found")
    if str(existing.data[0]["owner_id"]) != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    supabase.table("rental_units").delete().eq("id", str(unit_id)).execute()
