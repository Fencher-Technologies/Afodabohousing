import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import (
    CurrentUser,
    get_service_client,
    require_super_admin,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


class StatusUpdateRequest(BaseModel):
    status: str  # "active" | "suspended"


class UserResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str | None = None
    role: str
    status: str
    created_at: str | None = None
    property_count: int = 0


class DashboardStats(BaseModel):
    total_managers: int
    total_tenants: int
    total_properties: int
    active_leases: int


@router.get("/users", response_model=list[UserResponse])
def list_users(
    role: str | None = Query(None, description="Filter by role"),
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> list[UserResponse]:
    query = supabase.table("profiles").select("user_id, full_name, role, status, created_at, email")

    if role:
        query = query.eq("role", role)

    result = query.order("created_at", desc=True).execute()
    users = result.data or []

    responses = []
    for u in users:
        prop_count = 0
        if u.get("role") == "house_manager":
            try:
                cnt = supabase.table("properties").select("id", count="exact").eq("owner_id", u["user_id"]).execute()
                prop_count = cnt.count if hasattr(cnt, "count") else 0
            except Exception:
                pass

        responses.append(UserResponse(
            id=str(u.get("user_id", "")),
            user_id=str(u.get("user_id", "")),
            email=u.get("email", ""),
            full_name=u.get("full_name"),
            role=u.get("role", ""),
            status=u.get("status", "active"),
            created_at=str(u.get("created_at")) if u.get("created_at") else None,
            property_count=prop_count,
        ))

    return responses


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    data: StatusUpdateRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> dict:
    if data.status not in ("active", "suspended"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'active' or 'suspended'",
        )

    result = supabase.table("profiles").update({"status": data.status}).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    logger.info("User %s status updated to %s by super admin %s", user_id, data.status, current_user.id)

    return {"message": f"User status updated to {data.status}", "user_id": user_id, "status": data.status}


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> DashboardStats:
    managers = supabase.table("profiles").select("user_id", count="exact").eq("role", "house_manager").execute()
    tenants_count = supabase.table("profiles").select("user_id", count="exact").eq("role", "tenant").execute()
    properties = supabase.table("properties").select("id", count="exact").execute()
    leases = supabase.table("leases").select("id", count="exact").eq("status", "active").execute()

    return DashboardStats(
        total_managers=managers.count if hasattr(managers, "count") else 0,
        total_tenants=tenants_count.count if hasattr(tenants_count, "count") else 0,
        total_properties=properties.count if hasattr(properties, "count") else 0,
        active_leases=leases.count if hasattr(leases, "count") else 0,
    )
