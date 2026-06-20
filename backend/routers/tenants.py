from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_service_client, get_supabase_client
from models import TenantCreate, TenantResponse, TenantUpdate
from services import TenantService, get_tenant_service

router = APIRouter(prefix="/tenants", tags=["tenants"])


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


def get_tenant_svc(supabase: Client = Depends(get_supabase_client)) -> TenantService:
    return get_tenant_service(supabase)


@router.get("", response_model=PaginatedResponse)
def list_tenants(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    service: TenantService = Depends(get_tenant_svc),
) -> PaginatedResponse:
    tenants, total = service.get_all(current_user.id, skip, limit)
    return PaginatedResponse(
        items=[TenantResponse(**t) for t in tenants],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/resolve-by-email", response_model=TenantResponse)
def resolve_tenant_by_email(
    email: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: TenantService = Depends(get_tenant_svc),
    service_supabase: Client = Depends(get_service_client),
) -> TenantResponse:
    normalized_email = email.strip().lower()

    existing = (
        service_supabase.table("tenants")
        .select("*")
        .eq("owner_id", current_user.id)
        .eq("email", normalized_email)
        .limit(1)
        .execute()
    )
    if existing.data:
        return TenantResponse(**existing.data[0])

    profile_result = (
        service_supabase.table("profiles")
        .select("user_id, full_name, phone")
        .eq("email", normalized_email)
        .limit(1)
        .execute()
    )
    profile = profile_result.data[0] if profile_result.data else None
    user_id = profile.get("user_id") if profile else None

    if not user_id:
        raise HTTPException(status_code=404, detail="No registered user matched that email address")

    full_name = (profile.get("full_name") or "").strip() if profile else ""
    name_parts = [part for part in full_name.split() if part]
    if name_parts:
        first_name = name_parts[0]
        last_name = " ".join(name_parts[1:]) or "Tenant"
    else:
        first_name = normalized_email.split("@")[0].replace(".", " ").strip().title() or "Tenant"
        last_name = "Tenant"

    tenant = service.create(
        TenantCreate(
            email=normalized_email,
            first_name=first_name,
            last_name=last_name,
            phone=profile.get("phone") if profile else None,
            status="active",
            user_id=user_id,
        ),
        current_user.id,
    )
    return TenantResponse(**tenant)


@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(
    tenant_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: TenantService = Depends(get_tenant_svc),
) -> TenantResponse:
    tenant = service.get_by_id(tenant_id, current_user.id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantResponse(**tenant)


@router.post("", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
def create_tenant(
    data: TenantCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: TenantService = Depends(get_tenant_svc),
) -> TenantResponse:
    tenant = service.create(data, current_user.id)
    return TenantResponse(**tenant)


@router.patch("/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: UUID,
    data: TenantUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    service: TenantService = Depends(get_tenant_svc),
) -> TenantResponse:
    tenant = service.update(tenant_id, data, current_user.id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantResponse(**tenant)


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant(
    tenant_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: TenantService = Depends(get_tenant_svc),
) -> None:
    success = service.delete(tenant_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Tenant not found")
