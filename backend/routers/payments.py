import time
# mypy: ignore-errors
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from config import get_settings
from dependencies import CurrentUser, get_current_user, get_supabase_client
from models import PaymentCreate, PaymentResponse, PaymentUpdate
from services import PaymentService, get_payment_service

router = APIRouter(prefix="/payments", tags=["payments"])
settings = get_settings()
PESAPAL_BASE = (
    "https://pay.pesapal.com/v3/api"
    if settings.pesapal_environment == "live"
    else "https://cybqa.pesapal.com/pesapalv3/api"
)


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


def get_payment_svc(supabase: Client = Depends(get_supabase_client)) -> PaymentService:
    return get_payment_service(supabase)


async def _get_pesapal_token() -> str:
    if not settings.pesapal_consumer_key or not settings.pesapal_consumer_secret:
        raise HTTPException(status_code=503, detail="Pesapal credentials are not configured")

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"{PESAPAL_BASE}/Auth/RequestToken",
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            json={
                "consumer_key": settings.pesapal_consumer_key,
                "consumer_secret": settings.pesapal_consumer_secret,
            },
        )
        response.raise_for_status()
        payload = response.json()

    token = payload.get("token")
    if not token:
        raise HTTPException(status_code=502, detail="Pesapal authentication failed")
    return token


async def _register_pesapal_ipn(token: str, callback_url: str) -> str:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"{PESAPAL_BASE}/URLSetup/RegisterIPN",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
            json={"url": callback_url, "ipn_notification_type": "POST"},
        )
        response.raise_for_status()
        payload = response.json()

    ipn_id = payload.get("ipn_id")
    if not ipn_id:
        raise HTTPException(status_code=502, detail="Pesapal IPN registration failed")
    return ipn_id


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
        payment = service.create(PaymentCreate(**payload))
    else:
        lease = (
            supabase
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
    return PaymentResponse(**result)


@router.post("/initiate-pesapal", response_model=PesapalInitiateResponse)
async def initiate_pesapal_payment(
    data: PesapalInitiateRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> PesapalInitiateResponse:
    token = await _get_pesapal_token()
    ipn_id = await _register_pesapal_ipn(token, f"{settings.supabase_url}/functions/v1/pesapal-ipn")
    order_id = f"AFODABO-{data.payment_id}-{int(time.time() * 1000)}"

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"{PESAPAL_BASE}/Transactions/SubmitOrderRequest",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
            json={
                "id": order_id,
                "currency": data.currency,
                "amount": float(data.amount),
                "description": data.description,
                "callback_url": data.callback_url,
                "notification_id": ipn_id,
                "billing_address": {
                    "email_address": data.email or "",
                    "phone_number": data.phone,
                    "first_name": data.first_name,
                    "last_name": data.last_name,
                },
            },
        )
        response.raise_for_status()
        payload = response.json()

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
