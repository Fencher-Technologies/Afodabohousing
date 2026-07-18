import logging
import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from supabase import Client

from dependencies import (
    CurrentUser,
    get_service_client,
    require_super_admin,
    require_super_admin_or_manager,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Models ──


class CreateManagerRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone: str | None = None


class CreateTenantRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone: str | None = None
    property_id: str | None = None
    rent_start_date: str | None = None
    rent_end_date: str | None = None
    rent_amount: float | None = None


class ResetTenantPasswordRequest(BaseModel):
    user_id: str


class StatusUpdateRequest(BaseModel):
    status: str  # "active" | "suspended"


class UserResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str | None = None
    photo_url: str | None = None
    role: str
    status: str
    created_at: str | None = None
    property_count: int = 0


class DashboardStats(BaseModel):
    # User stats
    total_managers: int = 0
    total_tenants: int = 0
    active_managers: int = 0
    active_tenants: int = 0
    new_this_month: int = 0
    # Property stats
    total_properties: int = 0
    occupied_properties: int = 0
    vacant_properties: int = 0
    occupancy_rate: float = 0
    # Financial stats
    total_collected: float = 0
    total_outstanding: float = 0
    avg_collection_rate: float = 0
    recent_payments_count: int = 0


# ── Helpers ──


def _count(supabase: Client, table: str, column: str = "id", **filters) -> int:
    try:
        q = supabase.table(table).select(column, count="exact")
        for k, v in filters.items():
            q = q.eq(k, v)
        r = q.execute()
        return r.count if hasattr(r, "count") else 0
    except Exception as e:
        logger.warning("Count query failed on %s: %s", table, e)
        return 0


# ── Endpoints ──


@router.post("/create-manager")
def create_manager(
    data: CreateManagerRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> dict:
    if not data.full_name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full name is required")

    # Check for existing user with this email
    existing = supabase.table("profiles").select("user_id").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    password = secrets.token_urlsafe(12)

    try:
        auth_result = supabase.auth.admin.create_user({
            "email": data.email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": data.full_name},
        })
    except Exception as e:
        msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                body = e.response.json()
                msg = body.get("msg", body.get("error_description", body.get("error", msg)))
            except Exception:
                msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create user: {msg}",
        )

    user = auth_result.user
    user_id = user.id

    supabase.table("profiles").upsert({
        "user_id": user_id,
        "email": data.email,
        "full_name": data.full_name,
        "phone": data.phone or "",
        "role": "house_manager",
        "status": "active",
        "created_by": current_user.id,
    }, on_conflict="user_id").execute()

    logger.info(
        "Manager created: email=%s user_id=%s by super_admin=%s",
        data.email, user_id, current_user.id,
    )

    return {
        "message": "Manager account created",
        "email": data.email,
        "user_id": user_id,
        "temporary_password": password,
    }


@router.post("/create-tenant")
def create_tenant(
    data: CreateTenantRequest,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
) -> dict:
    if not data.full_name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full name is required")

    existing = supabase.table("profiles").select("user_id").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    password = secrets.token_urlsafe(12)

    try:
        auth_result = supabase.auth.admin.create_user({
            "email": data.email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": data.full_name},
        })
    except Exception as e:
        msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                body = e.response.json()
                msg = body.get("msg", body.get("error_description", body.get("error", msg)))
            except Exception:
                msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create user: {msg}",
        )

    user = auth_result.user
    user_id = user.id

    supabase.table("profiles").upsert({
        "user_id": user_id,
        "email": data.email,
        "full_name": data.full_name,
        "phone": data.phone or "",
        "role": "tenant",
        "status": "active",
    }, on_conflict="user_id").execute()

    name_parts = data.full_name.strip().split(None, 1)
    tenant_result = supabase.table("tenants").insert({
        "owner_id": current_user.id,
        "user_id": user_id,
        "first_name": name_parts[0] if name_parts else data.full_name,
        "last_name": name_parts[1] if len(name_parts) > 1 else "",
        "email": data.email,
        "phone": data.phone or "",
        "status": "active",
    }).execute()
    tenant_id = tenant_result.data[0]["id"] if tenant_result.data else None

    if data.property_id and data.rent_start_date and tenant_id:
        supabase.table("leases").insert({
            "owner_id": current_user.id,
            "property_id": data.property_id,
            "tenant_id": tenant_id,
            "start_date": data.rent_start_date,
            "end_date": data.rent_end_date or data.rent_start_date,
            "monthly_rent": data.rent_amount or 0,
            "security_deposit": 0,
            "status": "active",
        }).execute()
        supabase.table("properties").update({"status": "occupied"}).eq("id", data.property_id).execute()

    logger.info(
        "Tenant created: email=%s user_id=%s by %s=%s",
        data.email, user_id, current_user.role, current_user.id,
    )

    return {
        "message": "Tenant account created",
        "email": data.email,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "full_name": data.full_name,
        "temporary_password": password,
    }


@router.post("/reset-tenant-password")
def reset_tenant_password(
    data: ResetTenantPasswordRequest,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
) -> dict:
    password = secrets.token_urlsafe(12)
    try:
        supabase.auth.admin.update_user_by_id(data.user_id, {"password": password})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to reset password: {e}",
        )
    logger.info("Password reset for user_id=%s by %s=%s", data.user_id, current_user.role, current_user.id)
    return {"temporary_password": password}


@router.get("/users", response_model=list[UserResponse])
def list_users(
    role: str | None = Query(None, description="Filter by role"),
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> list[UserResponse]:
    query = supabase.table("profiles").select("user_id, full_name, role, status, created_at, email, photo_url")

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
            photo_url=u.get("photo_url"),
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
    # ── User counts ──
    total_managers = _count(supabase, "profiles", role="house_manager")
    total_tenants = _count(supabase, "profiles", role="tenant")
    active_managers = _count(supabase, "profiles", role="house_manager", status="active")
    active_tenants = _count(supabase, "profiles", role="tenant", status="active")

    # New users this month
    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    try:
        new_users = (
            supabase.table("profiles")
            .select("user_id", count="exact")
            .gte("created_at", month_start.isoformat())
            .execute()
        )
        new_this_month = new_users.count if hasattr(new_users, "count") else 0
    except Exception:
        new_this_month = 0

    # ── Property counts ──
    total_props = _count(supabase, "properties")
    occupied = _count(supabase, "properties", status="occupied")
    vacant = total_props - occupied

    occupancy = round(occupied / total_props, 2) if total_props > 0 else 0

    # ── Financial ──
    total_collected = 0
    total_outstanding = 0
    recent_count = 0
    collection_rate = 0

    try:
        paid = supabase.table("payments").select("amount", count="exact").eq("status", "completed").execute()
        if paid.data:
            total_collected = sum(p.get("amount", 0) or 0 for p in paid.data)
            recent_count = paid.count if hasattr(paid, "count") else len(paid.data)
    except Exception:
        pass

    try:
        # Outstanding: sum of lease amounts where status = active and no completed payment this month
        active_leases = supabase.table("leases").select("id, rent_amount").eq("status", "active").execute()
        if active_leases.data:
            total_outstanding = sum(float(l.get("rent_amount", 0) or 0) for l in active_leases.data)
    except Exception:
        pass

    if total_outstanding + total_collected > 0:
        collection_rate = round(total_collected / (total_collected + total_outstanding), 2)

    return DashboardStats(
        total_managers=total_managers,
        total_tenants=total_tenants,
        active_managers=active_managers,
        active_tenants=active_tenants,
        new_this_month=new_this_month,
        total_properties=total_props,
        occupied_properties=occupied,
        vacant_properties=vacant,
        occupancy_rate=occupancy,
        total_collected=total_collected,
        total_outstanding=total_outstanding,
        avg_collection_rate=collection_rate,
        recent_payments_count=recent_count,
    )
