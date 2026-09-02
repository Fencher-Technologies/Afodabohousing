import logging
import time
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

# A polling client calls /payments/pesapal/status up to every few seconds while
# an order is pending. Each reconcile costs 2 external Pesapal HTTP calls on top
# of the DB reads, so throttle gateway verification to once per order/minute.
# ponytail: single-process in-memory map; fine on the one Render instance.
_RECONCILE_COOLDOWN_SECONDS = 60.0
_reconcile_checked_at: dict[str, float] = {}


def _reconcile_allowed(key: str) -> bool:
    global _reconcile_checked_at
    now = time.monotonic()
    last = _reconcile_checked_at.get(key)
    if last and now - last < _RECONCILE_COOLDOWN_SECONDS:
        return False
    if len(_reconcile_checked_at) > 500:
        cutoff = now - 5 * 60
        _reconcile_checked_at = {k: v for k, v in _reconcile_checked_at.items() if v >= cutoff}
    _reconcile_checked_at[key] = now
    return True


def _reset_reconcile_cooldowns() -> None:
    _reconcile_checked_at.clear()


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


class PesapalInitiateRequest(BaseModel):
    amount: float
    callback_url: str
    currency: str = "USD"
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


def _enrich_payments(supabase: Client, payments: list[dict]) -> list[dict]:
    """Attach tenant_name / property_title / method to payment rows.

    The mobile and web UIs read these display fields; they are joined here
    so both platforms see them without extra client work.
    """
    if not payments:
        return payments
    lease_ids = {str(p.get("lease_id")) for p in payments if p.get("lease_id")}
    leases_by_id: dict[str, dict] = {}
    if lease_ids:
        resp = (
            supabase.table("leases")
            .select("id, tenant_id, property_id")
            .in_("id", list(lease_ids))
            .execute()
        )
        for l in resp.data or []:
            leases_by_id[str(l["id"])] = l

    tenant_ids = {str(l["tenant_id"]) for l in leases_by_id.values() if l.get("tenant_id")}
    names_by_id: dict[str, str] = {}
    if tenant_ids:
        resp = (
            supabase.table("tenants")
            .select("id, first_name, last_name")
            .in_("id", list(tenant_ids))
            .execute()
        )
        for t in resp.data or []:
            names_by_id[str(t["id"])] = (
                f"{t.get('first_name') or ''} {t.get('last_name') or ''}".strip()
            )

    prop_ids = {str(l["property_id"]) for l in leases_by_id.values() if l.get("property_id")}
    titles_by_id: dict[str, str] = {}
    if prop_ids:
        resp = (
            supabase.table("properties")
            .select("id, title")
            .in_("id", list(prop_ids))
            .execute()
        )
        for p in resp.data or []:
            titles_by_id[str(p["id"])] = p.get("title") or ""

    for payment in payments:
        lease = leases_by_id.get(str(payment.get("lease_id")))
        payment["method"] = payment.get("payment_method")
        if not lease:
            continue
        payment["tenant_name"] = names_by_id.get(str(lease.get("tenant_id"))) or None
        payment["property_title"] = titles_by_id.get(str(lease.get("property_id"))) or None
    return payments




def _maybe_issue_receipt(payment: dict) -> None:
    """Auto-issue a receipt when a rent payment is confirmed.

    Runs for both verification approvals (handled in the verification
    service) and payments the manager records directly without any tenant
    proof. Receipt creation is idempotent per payment, so calling it in
    several places is safe. Failures never block the payment response.
    """
    if not payment or payment.get("status") not in ("confirmed", "completed"):
        return
    try:
        from services.receipts import ReceiptService

        ReceiptService(get_service_client()).create_for_payment(payment)
    except Exception as e:
        logger.warning("Receipt generation failed for payment %s: %s", payment.get("id"), e)

@router.get("", response_model=PaginatedResponse)
def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    lease_id: UUID | None = Query(None, description="Scope to one lease's payments"),
    tenant_id: UUID | None = Query(None, description="Scope to one tenant's payments"),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
    service: PaymentService = Depends(get_payment_svc),
) -> PaginatedResponse:
    caller_tenant = (
        supabase
        .table("tenants")
        .select("id")
        .eq("user_id", str(current_user.id))
        .execute()
    )
    caller_tenant_id = caller_tenant.data[0]["id"] if caller_tenant.data else None

    if lease_id:
        lease = supabase.table("leases").select("owner_id, tenant_id").eq("id", str(lease_id)).execute()
        if not lease.data:
            raise HTTPException(status_code=404, detail="Lease not found")
        l = lease.data[0]
        if caller_tenant_id and str(l.get("tenant_id")) != str(caller_tenant_id):
            raise HTTPException(status_code=403, detail="Access denied")
        if not caller_tenant_id and str(l.get("owner_id")) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        payments, total = service.get_all_for_lease(lease_id, skip, limit)
    elif tenant_id:
        if caller_tenant_id and str(tenant_id) != str(caller_tenant_id):
            raise HTTPException(status_code=403, detail="Access denied")
        if not caller_tenant_id:
            owned = (
                supabase.table("leases")
                .select("id")
                .eq("owner_id", str(current_user.id))
                .in_("tenant_id", [str(tenant_id)])
                .limit(1)
                .execute()
            )
            if not owned.data:
                raise HTTPException(status_code=403, detail="Access denied")
        payments, total = service.get_all_for_tenant(tenant_id, skip, limit)
    elif caller_tenant_id:
        payments, total = service.get_all_for_tenant(caller_tenant_id, skip, limit)
    else:
        payments, total = service.get_all(current_user.id, skip, limit)
    return PaginatedResponse(
        items=[PaymentResponse(**p) for p in _enrich_payments(supabase, payments)],
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
    return PaymentResponse(**_enrich_payments(supabase, [payment])[0])


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
    _maybe_issue_receipt(payment)
    return PaymentResponse(**_enrich_payments(supabase, [payment])[0])


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

    if data.status in ("confirmed", "completed"):
        _maybe_issue_receipt(result)

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
                body=f"Your rent payment of {result.get('currency', 'USD')} {amount:,.0f} has been {status_label} by the house manager.",
                metadata={"payment_id": str(payment_id), "status": data.status},
            )

    return PaymentResponse(**_enrich_payments(supabase, [result])[0])


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
    supabase: Client = Depends(get_service_client),
) -> PesapalInitiateResponse:
    try:
        token = await pesapal.get_auth_token()
        ipn_id = pesapal.get_ipn_id(supabase)
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
async def pesapal_payment_status(
    reference: str | None = Query(None, description="OrderMerchantReference / payment reference from the Pesapal callback"),
    property_id: str | None = Query(None, description="Look up a boost's status by property instead of by reference"),
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(get_service_client),
) -> dict:
    """Poll the outcome of a Pesapal payment.

    Looks up subscriptions by payment_reference or boosts by transaction_id
    (the merchant reference from the Pesapal callback), since both flows
    redirect to /payment/status. When a boost initiate hits the pending-guard
    409, the client has no fresh reference; it can instead pass property_id
    to resume watching the existing pending boost.

    If a row is still pending and carries a pesapal_tracking_id, reconcile it
    by calling GetTransactionStatus directly — the IPN webhook is best-effort,
    and this poll becomes the on-demand fallback so an IPN delay/loss no
    longer strands a paid order in pending forever.
    """
    row = None
    kind = None

    if reference:
        sub = (
            supabase.table("manager_subscriptions")
            .select("*")
            .eq("payment_reference", reference)
            .limit(1)
            .execute()
        )
        if sub.data:
            row, kind = sub.data[0], "subscription"

        if not row:
            boost = (
                supabase.table("property_boosts")
                .select("*")
                .eq("transaction_id", reference)
                .limit(1)
                .execute()
            )
            if boost.data:
                row, kind = boost.data[0], "boost"

    if not row and property_id:
        boost = (
            supabase.table("property_boosts")
            .select("*")
            .eq("property_id", property_id)
            .in_("status", ["pending", "active"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if boost.data:
            row, kind = boost.data[0], "boost"

    if not row:
        return {"type": "unknown", "status": "pending"}

    status = row.get("status")
    if not status or status == "pending":
        if await _reconcile_pesapal_order(supabase, row, kind):
            row = _refresh_row(supabase, kind, row)

    return {
        "type": kind,
        "status": row.get("status", "pending"),
        "payment_status": row.get("payment_status", "pending") if kind == "subscription" else None,
    }


async def _reconcile_pesapal_order(supabase, row: dict, kind: str) -> bool:
    """Verify a pending Pesapal order against the gateway; update the row if
    the authoritative status differs. Returns True if a change was applied.
    """
    tracking_id = row.get("pesapal_tracking_id")
    if not tracking_id:
        return False
    if not _reconcile_allowed(f"{kind}:{row['id']}"):
        return False
    from services.pesapal import PESAPAL_STATUS_MAP

    try:
        token = await pesapal.get_auth_token()
        status_data = await pesapal.get_transaction_status(token, tracking_id)
    except Exception as e:
        logger.warning("Reconcile status lookup failed for %s %s: %s", kind, row.get("id"), e)
        return False

    status = PESAPAL_STATUS_MAP.get(
        (status_data.get("payment_status_description") or "").upper(),
        "pending",
    )
    if status == "pending":
        return False

    table = "manager_subscriptions" if kind == "subscription" else "property_boosts"
    payload = {"status": status}
    if kind == "subscription" and status == "failed":
        payload["payment_status"] = "failed"
    if status == "completed":
        payload["payment_status"] = "completed"
        if kind == "boost":
            from services.boost import get_boost_service
            activated = get_boost_service(supabase).activate_by_reference(
                row["transaction_id"], tracking_id, status_data.get("amount")
            )
            return activated is not None
        from services.subscriptions import get_subscription_service
        activated = get_subscription_service(supabase).confirm_subscription(
            row["payment_reference"], status_data.get("amount")
        )
        return activated is not None
    result = supabase.table(table).update(payload).eq("id", row["id"]).eq("status", "pending").execute()
    return bool(result.data)


def _refresh_row(supabase, kind: str, row: dict) -> dict:
    table = "manager_subscriptions" if kind == "subscription" else "property_boosts"
    result = supabase.table(table).select("*").eq("id", row["id"]).limit(1).execute()
    return result.data[0] if result.data else row



