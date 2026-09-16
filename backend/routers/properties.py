from uuid import UUID

import re

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from postgrest.exceptions import APIError
from supabase import Client

from dependencies import (
    CurrentUser,
    get_current_user,
    get_optional_user,
    get_service_client,
    get_supabase_client,
    require_active_subscription,
)
from models import PropertyCreate, PropertyResponse, PropertyUpdate
from services import PropertyService, get_property_service
from services.unit_summary import attach_unit_summaries

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


def _quota_or_403(supabase: Client, user_id: str) -> dict:
    """Return the quota or raise the structured 403 for it.

    Shared by the POST guard and the PATCH reactivation check so both
    refuse with the same code and message shape.
    """
    from services.subscriptions import get_subscription_service

    quota = get_subscription_service(supabase).get_property_quota(user_id)
    if quota["can_add_property"]:
        return quota
    if not quota["has_active_subscription"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "no_active_subscription",
                "message": "An active subscription is required to list properties.",
                "properties_used": quota["properties_used"],
                "max_properties": quota["max_properties"],
                "plan_id": quota["plan_id"],
                "plan_name": quota["plan_name"],
            },
        )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "code": "property_limit_reached",
            "message": (
                f"Your {quota['plan_name']} plan allows "
                f"{quota['max_properties']} properties and you have "
                f"{quota['properties_used']}. Upgrade your subscription to list more properties."
            ),
            "properties_used": quota["properties_used"],
            "max_properties": quota["max_properties"],
            "plan_id": quota["plan_id"],
            "plan_name": quota["plan_name"],
        },
    )


def require_property_quota(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> None:
    """Block creating a listing the manager's plan does not cover.

    Declared BEFORE require_active_subscription on POST /properties so a
    manager with no subscription gets the structured no_active_subscription
    error (with usage fields) instead of the guard's plain string.
    Grandfathered over-limit rows are never touched — only new creates.
    """
    _quota_or_403(supabase, current_user.id)


@router.get("", response_model=PaginatedResponse)
def list_properties(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    service: PropertyService = Depends(get_property_svc),
) -> PaginatedResponse:
    properties, total = service.get_all(current_user.id, skip, limit)
    attach_unit_summaries(service.supabase, properties)
    return PaginatedResponse(
        items=[PropertyResponse(**p) for p in properties],
        total=total,
        skip=skip,
        limit=limit,
    )


def _strip_manager_contacts(rows: list[dict]) -> None:
    """Remove direct manager contact details for anonymous visitors.

    Contacts stay visible to signed-in users only — the UI gates them behind
    sign-in, so the API must not hand them out to guests either.
    """
    for row in rows:
        row.pop("manager_phone", None)
        row.pop("manager_email", None)


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
    current_user: CurrentUser | None = Depends(get_optional_user),
) -> PaginatedResponse:
    # Authenticated responses include manager contacts — do not publicly cache them.
    response.headers["Cache-Control"] = (
        "private, no-cache" if current_user else "public, max-age=30, stale-while-revalidate=60"
    )
    svc = PropertyService(get_service_client())
    try:
        properties_data, total = svc.get_public_listings(
            skip=skip, limit=limit, state=state,
            country=country, region_id=region_id,
            property_type=property_type,
            property_type_slug=property_type_slug,
            min_price=min_price, max_price=max_price,
            include_manager_contacts=current_user is not None,
        )
    except Exception as e:
        msg = str(e)
        if "Temporary failure in name resolution" in msg or "ConnectError" in type(e).__name__ or "ReadError" in type(e).__name__:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database temporarily unavailable, please retry")
        raise
    if current_user is None:
        _strip_manager_contacts(properties_data)
    attach_unit_summaries(svc.supabase, properties_data)
    return PaginatedResponse(
        items=[PropertyResponse(**p) for p in properties_data],
        total=total,
        skip=skip,
        limit=limit,
    )


class PublicStatsResponse(BaseModel):
    properties: int
    tenancies: int
    users: int
    locations: int


@router.get("/public-stats", response_model=PublicStatsResponse)
def get_public_stats(response: Response) -> PublicStatsResponse:
    """Platform-wide counters for the public homepage.

    Uses the service role so the numbers are real totals regardless of
    row-level security (anonymous visitors cannot count leases/profiles).
    NOTE: must stay declared before /{property_id} so "public-stats" is not
    parsed as a UUID path parameter.
    """
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=600"
    sb = get_service_client()
    try:
        p_res = sb.table("properties").select("id", count="exact").eq("is_active", True).limit(1).execute()
        l_res = sb.table("leases").select("id", count="exact").eq("status", "active").limit(1).execute()
        u_res = sb.table("profiles").select("id", count="exact").limit(1).execute()
        city_res = (
            sb.table("properties")
            .select("city")
            .eq("is_active", True)
            .not_.is_("city", "null")
            .limit(2000)
            .execute()
        )
    except Exception as e:
        msg = str(e)
        if "Temporary failure in name resolution" in msg or "ConnectError" in type(e).__name__ or "ReadError" in type(e).__name__:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database temporarily unavailable, please retry")
        raise
    locations = len({
        (row.get("city") or "").strip()
        for row in (city_res.data or [])
        if (row.get("city") or "").strip()
    })
    return PublicStatsResponse(
        properties=p_res.count or 0,
        tenancies=l_res.count or 0,
        users=u_res.count or 0,
        locations=locations,
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
    response: Response,
    current_user: CurrentUser | None = Depends(get_optional_user),
) -> PropertyResponse:
    response.headers["Cache-Control"] = (
        "private, no-cache" if current_user else "public, max-age=30, stale-while-revalidate=60"
    )
    svc = PropertyService(get_service_client())
    property_data = svc.get_by_id_public(property_id, include_manager_contacts=current_user is not None)
    if not property_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found or inactive",
        )
    if current_user is None:
        _strip_manager_contacts([property_data])
    return PropertyResponse(**property_data)


@router.post("", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
def create_property(
    data: PropertyCreate,
    current_user: CurrentUser = Depends(get_current_user),
    _quota_guard: None = Depends(require_property_quota),
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
    admin: Client = Depends(get_service_client),
) -> PropertyResponse:
    # Reactivation consumes a slot: without this check, deactivate-two /
    # create-two / reactivate-two walks straight over the limit. Deactivation
    # and edits that leave is_active untouched are always allowed.
    if data.is_active is True:
        current = (
            admin.table("properties").select("is_active")
            .eq("id", str(property_id)).eq("owner_id", current_user.id)
            .execute()
        )
        if current.data and not current.data[0].get("is_active"):
            _quota_or_403(admin, current_user.id)
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
