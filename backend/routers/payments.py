import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from config import get_settings
from dependencies import (
    CurrentUser,
    get_current_user,
    get_service_client,
    get_supabase_client,
    require_active_subscription,
    require_active_user,
)
from models import PaymentCreate, PaymentResponse, PaymentUpdate
from services import PaymentService, get_payment_service, pesapal
from services.notifications import notify

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])
settings = get_settings()


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


class PesapalInitiateRequest(BaseModel):
    amount: float
    callback_url: str
    currency: str = "UGX"
    description: str
    email: str | None = None
    first_name: str
    last_name: str
    payment_id: str
    phone: str


class PesapalInitiateResponse(BaseModel):
    success: bool
    redirect_url: str | None = None
    order_id: str | None = None
    order_tracking_id: str | None = None
    error: str | None = None


def get_payment_svc(supabase: Client = Depends(get_service_client)) -> PaymentService:
    return get_payment_service(supabase)


@router.get("", response_model=PaginatedResponse)
def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    service: PaymentService = Depends(get_payment_svc),
) -> PaginatedResponse:
    tenant = (
        supabase
        .table("tenants")
        .select("id")
        .eq("user_id", current_user.id)
        .execute()
    )
    if tenant.data:
        payments, total = service.get_all_for_tenant(tenant.data[0]["id"], skip, limit)
    else:
        payments, total = service.get_all(current_user.id, skip, limit)
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
    supabase: Client = Depends(get_supabase_client),
    service: PaymentService = Depends(get_payment_svc),
) -> PaymentResponse:
    payment = service.get_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    tenant = (
        supabase
        .table("tenants")
        .select("id")
        .eq("user_id", current_user.id)
        .execute()
    )
    if tenant.data and str(payment["tenant_id"]) != str(tenant.data[0]["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    if not tenant.data:
        lease = (
            supabase
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
    _subscription_guard: CurrentUser = Depends(require_active_subscription),
    supabase: Client = Depends(get_supabase_client),
    service: PaymentService = Depends(get_payment_svc),
) -> PaymentResponse:
    tenant = (
        supabase
        .table("tenants")
        .select("id")
        .eq("user_id", current_user.id)
        .execute()
    )
    if tenant.data:
        payload = data.model_dump(exclude_none=True, mode="json")
        payload["tenant_id"] = tenant.data[0]["id"]
        if not payload.get("due_date"):
            payload["due_date"] = payload.get("paid_date")
        try:
            payment = service.create(PaymentCreate(**payload))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        lease = (
            supabase
            .table("leases")
            .select("owner_id, tenant_id")
            .eq("id", str(data.lease_id))
            .execute()
        )
        if not lease.data or str(lease.data[0]["owner_id"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        payload = data.model_dump(exclude_none=True, mode="json")
        payload.setdefault("tenant_id", lease.data[0]["tenant_id"])
        if not payload.get("due_date"):
            payload["due_date"] = payload.get("paid_date")
        try:
            payment = service.create(PaymentCreate(**payload))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    return PaymentResponse(**payment)


@router.patch("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: UUID,
    data: PaymentUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    _subscription_guard: CurrentUser = Depends(require_active_subscription),
    supabase: Client = Depends(get_supabase_client),
    service: PaymentService = Depends(get_payment_svc),
) -> PaymentResponse:
    payment = service.get_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    tenant = (
        supabase
        .table("tenants")
        .select("id")
        .eq("user_id", current_user.id)
        .execute()
    )
    if tenant.data and str(payment["tenant_id"]) != str(tenant.data[0]["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    if not tenant.data:
        lease = (
            supabase
            .table("leases")
            .select("owner_id")
            .eq("id", str(payment["lease_id"]))
            .execute()
        )
        if not lease.data or str(lease.data[0]["owner_id"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
    result = service.update(payment_id, data)

    if data.status in ("confirmed", "rejected"):
        lease = (
            supabase.table("leases")
            .select("owner_id")
            .eq("id", str(result["lease_id"]))
            .execute()
        )
        tenant_user_id = None
        if lease.data:
            tenant_profile = (
                supabase.table("profiles")
                .select("user_id")
                .eq("id", str(result["tenant_id"]))
                .execute()
            )
            if not tenant_profile.data:
                tenant_user = (
                    supabase.table("tenants")
                    .select("user_id")
                    .eq("id", str(result["tenant_id"]))
                    .execute()
                )
                if tenant_user.data and tenant_user.data[0].get("user_id"):
                    tenant_user_id = tenant_user.data[0]["user_id"]
            else:
                tenant_user_id = tenant_profile.data[0]["user_id"]

        if tenant_user_id:
            status_label = "confirmed" if data.status == "confirmed" else "rejected"
            amount = result.get("amount", 0)
            notify(
                supabase,
                recipient_id=tenant_user_id,
                type="payment_status",
                title=f"Payment {status_label}",
                body=f"Your rent payment of UGX {amount:,.0f} has been {status_label} by the house manager.",
                metadata={"payment_id": str(payment_id), "status": data.status},
            )

    return PaymentResponse(**result)


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    payment_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    _subscription_guard: CurrentUser = Depends(require_active_subscription),
    supabase: Client = Depends(get_supabase_client),
    service: PaymentService = Depends(get_payment_svc),
):
    payment = service.get_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    tenant = (
        supabase
        .table("tenants")
        .select("id")
        .eq("user_id", current_user.id)
        .execute()
    )
    if tenant.data and str(payment["tenant_id"]) != str(tenant.data[0]["id"]):
        raise HTTPException(status_code=403, detail="Access denied")
    if not tenant.data:
        lease = (
            supabase.table("leases")
            .select("owner_id")
            .eq("id", str(payment["lease_id"]))
            .execute()
        )
        if not lease.data or str(lease.data[0]["owner_id"]) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
    service.delete(payment_id)


@router.post("/initiate-pesapal", response_model=PesapalInitiateResponse)
async def initiate_pesapal_payment(
    data: PesapalInitiateRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> PesapalInitiateResponse:
    try:
        token = await pesapal.get_auth_token()
        ipn_url = settings.pesapal_ipn_url or data.callback_url
        ipn_id = await pesapal.register_ipn(token, ipn_url)
        order_id = pesapal.make_order_id("pay", data.payment_id)

        payload = await pesapal.submit_order(
            token=token,
            order_id=order_id,
            amount=data.amount,
            currency=data.currency,
            description=data.description,
            callback_url=data.callback_url,
            ipn_id=ipn_id,
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email or "",
            phone=data.phone,
        )

        if not payload.get("redirect_url"):
            return PesapalInitiateResponse(
                success=False,
                error=payload.get("error", {}).get("message") or str(payload),
            )

        return PesapalInitiateResponse(
            success=True,
            redirect_url=payload.get("redirect_url"),
            order_id=order_id,
            order_tracking_id=payload.get("order_tracking_id"),
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/pesapal/status")
def pesapal_payment_status(
    reference: str = Query(..., description="OrderMerchantReference / payment reference from the Pesapal callback"),
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(get_service_client),
) -> dict:
    """Poll the outcome of a Pesapal payment by its merchant reference.

    Checks manager_subscriptions (by payment_reference) then property_boosts
    (by transaction_id), since both flows redirect to /payment/status.
    """
    sub = (
        supabase.table("manager_subscriptions")
        .select("*")
        .eq("payment_reference", reference)
        .limit(1)
        .execute()
    )
    if sub.data:
        row = sub.data[0]
        return {
            "type": "subscription",
            "status": row.get("status"),
            "payment_status": row.get("payment_status", "pending"),
        }

    boost = (
        supabase.table("property_boosts")
        .select("*")
        .eq("transaction_id", reference)
        .limit(1)
        .execute()
    )
    if boost.data:
        row = boost.data[0]
        return {"type": "boost", "status": row.get("status")}

    return {"type": "unknown", "status": "pending"}



