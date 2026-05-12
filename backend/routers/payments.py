from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_supabase_client
from models import PaymentCreate, PaymentResponse, PaymentUpdate
from services import PaymentService, get_payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


def get_payment_svc(supabase: Client = Depends(get_supabase_client)) -> PaymentService:
    return get_payment_service(supabase)


@router.get("", response_model=PaginatedResponse)
def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_svc),
) -> PaginatedResponse:
    tenant = (
        get_supabase_client()
        .table("tenants")
        .select("id")
        .eq("user_id", current_user.id)
        .execute()
    )
    if tenant.data:
        payments, total = service.get_all_for_tenant(tenant.data[0]["id"], skip, limit)
    else:
        payments, total = service.get_all_for_owner(current_user.id, skip, limit)
    return PaginatedResponse(
        items=[PaymentResponse(**p) for p in payments],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_svc),
) -> PaymentResponse:
    payment = service.get_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    tenant = (
        get_supabase_client()
        .table("tenants")
        .select("id")
        .eq("user_id", current_user.id)
        .execute()
    )
    if tenant.data and str(payment["tenant_id"]) != str(tenant.data[0]["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    if not tenant.data:
        lease = (
            get_supabase_client()
            .table("leases")
            .select("owner_id")
            .eq("id", str(payment["lease_id"]))
            .execute()
        )
        if not lease.data or str(lease.data[0]["owner_id"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
    return PaymentResponse(**payment)


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    data: PaymentCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_svc),
) -> PaymentResponse:
    tenant = (
        get_supabase_client()
        .table("tenants")
        .select("id")
        .eq("user_id", current_user.id)
        .execute()
    )
    if tenant.data:
        payload = data.model_dump(exclude_none=True)
        payload["tenant_id"] = tenant.data[0]["id"]
        payment = service.create(PaymentCreate(**payload))
    else:
        lease = (
            get_supabase_client()
            .table("leases")
            .select("owner_id")
            .eq("id", str(data.lease_id))
            .execute()
        )
        if not lease.data or str(lease.data[0]["owner_id"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        payment = service.create(data)
    return PaymentResponse(**payment)


@router.patch("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: UUID,
    data: PaymentUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_svc),
) -> PaymentResponse:
    payment = service.get_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    tenant = (
        get_supabase_client()
        .table("tenants")
        .select("id")
        .eq("user_id", current_user.id)
        .execute()
    )
    if tenant.data and str(payment["tenant_id"]) != str(tenant.data[0]["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    if not tenant.data:
        lease = (
            get_supabase_client()
            .table("leases")
            .select("owner_id")
            .eq("id", str(payment["lease_id"]))
            .execute()
        )
        if not lease.data or str(lease.data[0]["owner_id"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
    result = service.update(payment_id, data)
    return PaymentResponse(**result)
