import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from config import get_settings
from dependencies import (
    CurrentUser,
    get_service_client,
    require_active_user,
)
from models.subscription import (
    ManagerSubscriptionResponse,
    SubscriptionCreateRequest,
    SubscriptionCreateResponse,
    SubscriptionPlanResponse,
)
from services.pesapal import (
    get_auth_token,
    register_ipn,
    submit_order,
)
from services.subscriptions import SubscriptionService, get_subscription_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def get_sub_svc() -> SubscriptionService:
    return get_subscription_service(get_service_client())


SUBSCRIPTION_CALLBACK_URL = "/account"


@router.get("/plans", response_model=list[SubscriptionPlanResponse])
def list_plans(
    service: SubscriptionService = Depends(get_sub_svc),
) -> list[SubscriptionPlanResponse]:
    return service.get_active_plans()


@router.get("/current", response_model=ManagerSubscriptionResponse | None)
def get_current_subscription(
    current_user: CurrentUser = Depends(require_active_user),
    service: SubscriptionService = Depends(get_sub_svc),
    supabase: Client = Depends(get_service_client),
) -> ManagerSubscriptionResponse | None:
    role = current_user.role
    try:
        result = supabase.table("profiles").select("role").eq("user_id", current_user.id).limit(1).execute()
        if result.data:
            role = result.data[0].get("role", role)
    except Exception:
        pass
    if role not in ("house_manager", "super_admin"):
        return None
    return service.get_current_subscription(current_user.id)


@router.post("/create", response_model=SubscriptionCreateResponse)
async def create_subscription(
    data: SubscriptionCreateRequest,
    current_user: CurrentUser = Depends(require_active_user),
    service: SubscriptionService = Depends(get_sub_svc),
    supabase: Client = Depends(get_service_client),
) -> SubscriptionCreateResponse:
    role = current_user.role
    profile = None
    try:
        result = supabase.table("profiles").select("*").eq("user_id", current_user.id).limit(1).execute()
        profile = result.data[0] if result.data else None
        if profile:
            role = profile.get("role", role)
    except Exception:
        pass

    if role not in ("house_manager", "super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can subscribe")

    plan = service.get_plan(data.plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan '{data.plan_id}' not found")

    reference = str(uuid4())
    amount = int(plan["price_ugx"])

    profile = profile or {}
    first_name = (profile.get("full_name") or "").split()[0] or current_user.email
    last_name = " ".join((profile.get("full_name") or "").split()[1:]) or ""
    customer_phone = data.phone_number or profile.get("phone") or ""
    customer_email = profile.get("email") or current_user.email

    sub_payload = {
        "manager_id": current_user.id,
        "plan_id": data.plan_id,
        "status": "pending",
        "payment_reference": reference,
        "payment_status": "pending",
    }
    result = supabase.table("manager_subscriptions").insert(sub_payload).execute()
    subscription_id = str(result.data[0]["id"])

    base_url = (data.callback_url or "").rstrip("/")
    callback_url = f"{base_url}{SUBSCRIPTION_CALLBACK_URL}"
    s = get_settings()
    ipn_url = s.pesapal_ipn_url or f"{base_url}/payments/webhook/pesapal"

    try:
        token = await get_auth_token()
        ipn_id = await register_ipn(token, ipn_url)
        order_id = reference
        pay_resp = await submit_order(
            token=token,
            order_id=order_id,
            amount=float(amount),
            currency="UGX",
            description=f"Afodabo Housing - {plan['name']} Subscription",
            callback_url=callback_url,
            ipn_id=ipn_id,
            first_name=first_name,
            last_name=last_name,
            email=customer_email,
            phone=customer_phone,
        )
    except RuntimeError as e:
        logger.error("Pesapal configuration error for subscription %s: %s", subscription_id, e)
        supabase.table("manager_subscriptions").update({"status": "failed"}).eq("id", subscription_id).execute()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        logger.error("Pesapal payment initiation failed for subscription %s: %s", subscription_id, str(e))
        supabase.table("manager_subscriptions").update({"status": "failed"}).eq("id", subscription_id).execute()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Payment initiation failed. Please try again.")

    redirect_url = pay_resp.get("redirect_url", "")
    if not redirect_url:
        supabase.table("manager_subscriptions").update({"status": "failed"}).eq("id", subscription_id).execute()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to get payment redirect URL from Pesapal")

    return SubscriptionCreateResponse(
        subscription_id=subscription_id,
        plan_id=data.plan_id,
        amount=float(amount),
        currency="UGX",
        payment_reference=reference,
        redirect_url=redirect_url,
        message="Redirecting to Pesapal to complete payment.",
    )
