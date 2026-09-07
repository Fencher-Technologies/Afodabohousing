import logging
# mypy: ignore-errors
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import (
    get_service_client,
    CurrentUser,
    get_current_user,
    get_supabase_client,
    require_active_subscription,
)
from models import (
    MaintenanceRequestCreate,
    MaintenanceRequestResponse,
    MaintenanceRequestUpdate,
)
from models.maintenance_request import ALLOWED_STATUS_TRANSITIONS
from services import MaintenanceRequestService, get_maintenance_request_service
from services.notifications import notify

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


def get_request_svc(
    supabase: Client = Depends(get_supabase_client),
) -> MaintenanceRequestService:
    return get_maintenance_request_service(supabase)


def _owned_property_ids(supabase: Client, user_id: str) -> list[str]:
    """Property ids belonging to this manager."""
    result = supabase.table("properties").select("id").eq("owner_id", str(user_id)).execute()
    return [str(r["id"]) for r in (result.data or [])]


def _tenant_ids_for_user(supabase: Client, user_id: str) -> list[str]:
    """Tenant records belonging to this user."""
    result = supabase.table("tenants").select("id").eq("user_id", str(user_id)).execute()
    return [str(r["id"]) for r in (result.data or [])]


def _is_manager_of(supabase: Client, request_row: dict, current_user: CurrentUser) -> bool:
    if current_user.role == "super_admin":
        return True
    return str(request_row.get("property_id")) in _owned_property_ids(supabase, current_user.id)


# Fields the manager records for their own bookkeeping. A tenant sees the
# status of their request, not what it cost or what the manager noted.
_MANAGER_ONLY_FIELDS = ("cost", "notes")


def _visible_to(request_row: dict, is_manager: bool) -> dict:
    """Strip manager-only bookkeeping before returning a row to a tenant."""
    if is_manager:
        return request_row
    redacted = dict(request_row)
    for field in _MANAGER_ONLY_FIELDS:
        redacted[field] = None
    return redacted


_STATUS_MESSAGES = {
    "scheduled": ("Maintenance scheduled", "Your maintenance request '{title}' has been scheduled."),
    "completed": ("Maintenance completed", "Your maintenance request '{title}' has been marked completed."),
    "cancelled": ("Maintenance request cancelled", "Your maintenance request '{title}' has been cancelled."),
    "open": ("Maintenance request reopened", "Your maintenance request '{title}' has been reopened."),
}


def _notify_tenant_of_status(supabase: Client, request_row: dict, new_status: str) -> None:
    """Let the tenant know their request moved. Best-effort: a notification
    failure must not undo the status change."""
    title_body = _STATUS_MESSAGES.get(new_status)
    if not title_body or not request_row.get("tenant_id"):
        return
    try:
        tenant = (
            supabase.table("tenants")
            .select("user_id")
            .eq("id", str(request_row["tenant_id"]))
            .limit(1)
            .execute()
        )
        user_id = tenant.data[0].get("user_id") if tenant.data else None
        if not user_id:
            return
        title, body = title_body
        notify(
            supabase,
            recipient_id=str(user_id),
            type="maintenance_status",
            title=title,
            body=body.format(title=request_row.get("title") or "request"),
            metadata={"maintenance_request_id": str(request_row.get("id")), "status": new_status},
        )
    except Exception:
        logger.warning("Could not notify tenant of maintenance status change", exc_info=True)


def _notify_manager_of_new_request(supabase: Client, request_row: dict) -> None:
    """Tell the property's manager that a tenant raised a request."""
    try:
        prop = (
            supabase.table("properties")
            .select("owner_id, title")
            .eq("id", str(request_row.get("property_id")))
            .limit(1)
            .execute()
        )
        if not prop.data:
            return
        owner_id = prop.data[0].get("owner_id")
        if not owner_id:
            return
        notify(
            supabase,
            recipient_id=str(owner_id),
            type="maintenance_request",
            title="New maintenance request",
            body=f"{request_row.get('title') or 'A request'} was raised for {prop.data[0].get('title') or 'your property'}.",
            metadata={"maintenance_request_id": str(request_row.get("id"))},
        )
    except Exception:
        logger.warning("Could not notify manager of new maintenance request", exc_info=True)


def _assert_can_access(supabase: Client, request_row: dict, current_user: CurrentUser) -> None:
    """A request is visible to the manager who owns the property and to the
    tenant who raised it. Without this, any signed-in user could read any
    property's maintenance history by guessing ids."""
    if current_user.role == "super_admin":
        return
    if str(request_row.get("property_id")) in _owned_property_ids(supabase, current_user.id):
        return
    if str(request_row.get("tenant_id") or "") in _tenant_ids_for_user(supabase, current_user.id):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


@router.get("", response_model=PaginatedResponse)
def list_my_requests(
    request_status: str | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> PaginatedResponse:
    """Requests visible to the caller.

    Managers see everything raised against their properties, which is the
    triage queue; tenants see the ones they raised. Previously the only list
    endpoint was by-property, so neither view was possible without one request
    per property.
    """
    query = supabase.table("maintenance_requests").select("*", count="exact")

    if current_user.role == "super_admin":
        pass
    else:
        property_ids = _owned_property_ids(supabase, current_user.id)
        tenant_ids = _tenant_ids_for_user(supabase, current_user.id)
        if property_ids:
            query = query.in_("property_id", property_ids)
        elif tenant_ids:
            query = query.in_("tenant_id", tenant_ids)
        else:
            return PaginatedResponse(items=[], total=0, skip=skip, limit=limit)

    if request_status:
        query = query.eq("status", request_status)

    result = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
    rows = result.data or []
    owned = set(_owned_property_ids(supabase, current_user.id)) if current_user.role != "super_admin" else None
    return PaginatedResponse(
        items=[
            MaintenanceRequestResponse(
                **_visible_to(r, owned is None or str(r.get("property_id")) in owned)
            )
            for r in rows
        ],
        total=result.count or 0,
        skip=skip,
        limit=limit,
    )


@router.get("/property/{property_id}", response_model=PaginatedResponse)
def list_requests_by_property(
    property_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    service: MaintenanceRequestService = Depends(get_request_svc),
) -> PaginatedResponse:
    if current_user.role != "super_admin":
        owned = service.supabase.table("properties").select("owner_id").eq("id", str(property_id)).execute()
        if not owned.data or str(owned.data[0]["owner_id"]) != str(current_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
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
    _assert_can_access(service.supabase, req, current_user)
    return MaintenanceRequestResponse(
        **_visible_to(req, _is_manager_of(service.supabase, req, current_user))
    )


@router.post("", response_model=MaintenanceRequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    data: MaintenanceRequestCreate,
    current_user: CurrentUser = Depends(get_current_user),
    _subscription_guard: CurrentUser = Depends(require_active_subscription),
    service: MaintenanceRequestService = Depends(get_request_svc),
) -> MaintenanceRequestResponse:
    # A request may only be raised against a property the caller manages, or
    # one they are a tenant of. Otherwise any signed-in user could file
    # requests against any property.
    if current_user.role != "super_admin":
        sb = service.supabase
        owns = str(data.property_id) in _owned_property_ids(sb, current_user.id)
        if not owns:
            tenant_ids = _tenant_ids_for_user(sb, current_user.id)
            leases = (
                sb.table("leases")
                .select("property_id")
                .in_("tenant_id", tenant_ids)
                .execute()
                if tenant_ids else None
            )
            leased = {str(r["property_id"]) for r in ((leases.data if leases else []) or [])}
            if str(data.property_id) not in leased:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only raise requests for your own property or tenancy",
                )

    req = service.create(data)
    _notify_manager_of_new_request(service.supabase, req)
    return MaintenanceRequestResponse(
        **_visible_to(req, _is_manager_of(service.supabase, req, current_user))
    )


@router.patch("/{request_id}", response_model=MaintenanceRequestResponse)
def update_request(
    request_id: UUID,
    data: MaintenanceRequestUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    _subscription_guard: CurrentUser = Depends(require_active_subscription),
    service: MaintenanceRequestService = Depends(get_request_svc),
) -> MaintenanceRequestResponse:
    existing = service.get_by_id(request_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Request not found")
    _assert_can_access(service.supabase, existing, current_user)

    is_manager = _is_manager_of(service.supabase, existing, current_user)

    # Scheduling, completing, costing and noting are the manager's job. A
    # tenant may correct the description of their own request, nothing more.
    if not is_manager:
        for field in ("status", "scheduled_date", "completed_date", *_MANAGER_ONLY_FIELDS):
            if getattr(data, field, None) is not None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the property manager can update this",
                )

    if data.status is not None:
        current = (existing.get("status") or "open").lower()
        allowed = ALLOWED_STATUS_TRANSITIONS.get(current, set())
        if data.status != current and data.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A {current} request cannot move to {data.status}",
            )

    req = service.update(request_id, data)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Tell the tenant when their request moves on.
    if data.status is not None and data.status != (existing.get("status") or "open"):
        _notify_tenant_of_status(service.supabase, req, data.status)

    return MaintenanceRequestResponse(**_visible_to(req, is_manager))


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(
    request_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    _subscription_guard: CurrentUser = Depends(require_active_subscription),
    service: MaintenanceRequestService = Depends(get_request_svc),
) -> None:
    success = service.delete(request_id)
    if not success:
        raise HTTPException(status_code=404, detail="Request not found")
