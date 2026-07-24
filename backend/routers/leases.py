from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_service_client, get_supabase_client
from models import (
    LeaseCreate,
    LeaseResponse,
    LeaseUpdate,
    RenewLease,
    RenewalRequestCreate,
)
from services import LeaseService, get_lease_service
from services.notifications import notify

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

    admin = get_service_client()
    pids = {str(l["property_id"]) for l in leases if l.get("property_id")}
    oids = {str(l["owner_id"]) for l in leases if l.get("owner_id")}
    props_map: dict[str, dict] = {}
    profs_map: dict[str, dict] = {}
    if pids:
        try:
            r = admin.table("properties").select("id, title, images, manager_phone, manager_email").in_("id", list(pids)).execute()
            for p in r.data or []:
                imgs = p.get("images") or []
                props_map[str(p["id"])] = {"title": p.get("title"), "image": imgs[0] if imgs else None, "mgr_phone": p.get("manager_phone"), "mgr_email": p.get("manager_email")}
        except Exception:
            pass
    if oids:
        try:
            r = admin.table("profiles").select("user_id, full_name, phone, email").in_("user_id", list(oids)).execute()
            for p in r.data or []:
                profs_map[str(p["user_id"])] = {"name": (p.get("full_name") or "").strip() or None, "phone": p.get("phone"), "email": p.get("email")}
        except Exception:
            pass
    for l in leases:
        prop = props_map.get(str(l.get("property_id", ""))) or {}
        prof = profs_map.get(str(l.get("owner_id", ""))) or {}
        if not l.get("property_title"):
            l["property_title"] = prop.get("title")
        if not l.get("property_image"):
            l["property_image"] = prop.get("image")
        if not l.get("manager_name"):
            l["manager_name"] = prof.get("name")
        if not l.get("manager_phone"):
            l["manager_phone"] = prop.get("mgr_phone") or prof.get("phone")
        if not l.get("manager_email"):
            l["manager_email"] = prop.get("mgr_email") or prof.get("email")

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
    supabase: Client = Depends(get_supabase_client),
    service: LeaseService = Depends(get_lease_svc),
) -> LeaseResponse:
    lease = service.create(data, current_user.id)

    if lease.get("status") == "active":
        tenant_user = (
            supabase.table("tenants")
            .select("user_id")
            .eq("id", str(lease["tenant_id"]))
            .execute()
        )
        tenant_user_id = tenant_user.data[0].get("user_id") if tenant_user.data else None
        if tenant_user_id:
            property_info = (
                supabase.table("properties")
                .select("title")
                .eq("id", str(lease["property_id"]))
                .execute()
            )
            property_title = property_info.data[0].get("title", "Property") if property_info.data else "Property"
            notify(
                supabase,
                recipient_id=tenant_user_id,
                type="tenancy_created",
                title="New tenancy activated",
                body=f"Your tenancy at {property_title} has been created by your house manager.",
                metadata={"lease_id": lease["id"], "property_id": str(lease["property_id"])},
            )

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


class RenewalRequestCreateResponse(BaseModel):
    success: bool
    message: str


@router.post("/{lease_id}/renewal-request", response_model=RenewalRequestCreateResponse)
def create_renewal_request(
    lease_id: UUID,
    data: RenewalRequestCreate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    service: LeaseService = Depends(get_lease_svc),
) -> RenewalRequestCreateResponse:
    tenant = supabase.table("tenants").select("id").eq("user_id", str(current_user.id)).execute()
    if not tenant.data:
        raise HTTPException(status_code=403, detail="Only tenants can request renewal")
    tenant_id = tenant.data[0]["id"]

    lease = supabase.table("leases").select("*").eq("id", str(lease_id)).execute()
    if not lease.data:
        raise HTTPException(status_code=404, detail="Lease not found")
    if lease.data[0]["tenant_id"] != tenant_id:
        raise HTTPException(status_code=403, detail="This lease does not belong to you")

    try:
        service.request_renewal(lease_id, UUID(tenant_id), data.notes)

        lease_data = lease.data[0]
        manager_id = lease_data.get("owner_id")
        if manager_id:
            notify(
                supabase,
                recipient_id=manager_id,
                type="renewal_request",
                title="Renewal request received",
                body=f"Tenant {current_user.email} has requested to renew their lease.",
                metadata={
                    "lease_id": str(lease_id),
                    "tenant_id": str(tenant_id),
                    "tenant_email": current_user.email,
                },
            )

        return RenewalRequestCreateResponse(success=True, message="Renewal request submitted for manager review")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{lease_id}/renew", response_model=LeaseResponse)
def renew_lease(
    lease_id: UUID,
    data: RenewLease,
    current_user: CurrentUser = Depends(get_current_user),
    service: LeaseService = Depends(get_lease_svc),
) -> LeaseResponse:
    try:
        lease = service.renew(
            lease_id,
            current_user.id,
            data.new_end_date,
            monthly_rent=data.monthly_rent,
            notes=data.notes,
        )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to renew this lease",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    return LeaseResponse(**lease)
