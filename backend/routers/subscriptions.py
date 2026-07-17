import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_service_client, get_supabase_client, require_active_user
from models.subscription import (
    ManagerSubscriptionResponse,
    SubscriptionCreateRequest,
    SubscriptionCreateResponse,
    SubscriptionPlanResponse,
)
from services.subscriptions import SubscriptionService, get_subscription_service
from services.nylonpay import verify_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def get_sub_svc() -> SubscriptionService:
    return get_subscription_service(get_service_client())


class WebhookPayload(BaseModel):
    event: str
    reference: str
    status: str
    amount: int
    currency: str
    metadata: dict[str, Any] | None = None


@router.get("/plans", response_model=list[SubscriptionPlanResponse])
def list_plans(
    service: SubscriptionService = Depends(get_sub_svc),
) -> list[SubscriptionPlanResponse]:
    return service.get_active_plans()


@router.get("/current", response_model=ManagerSubscriptionResponse | None)
def get_current_subscription(
    current_user: CurrentUser = Depends(require_active_user),
    service: SubscriptionService = Depends(get_sub_svc),
) -> ManagerSubscriptionResponse | None:
    if current_user.role not in ("house_manager", "super_admin"):
        return None
    return service.get_current_subscription(current_user.id)


@router.post("/create", response_model=SubscriptionCreateResponse)
def create_subscription(
    data: SubscriptionCreateRequest,
    current_user: CurrentUser = Depends(require_active_user),
    service: SubscriptionService = Depends(get_sub_svc),
    supabase: Client = Depends(get_supabase_client),
) -> SubscriptionCreateResponse:
    if current_user.role not in ("house_manager", "super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only managers can subscribe")

    profile_result = supabase.table("profiles").select("*").eq("user_id", current_user.id).limit(1).execute()
    profile = profile_result.data[0] if profile_result.data else None

    try:
        return service.create_subscription(
            manager_id=current_user.id,
            plan_id=data.plan_id,
            profile=profile,
            phone_number=data.phone_number,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/webhook")
async def subscription_webhook(
    request: Request,
    service: SubscriptionService = Depends(get_sub_svc),
) -> dict:
    body = await request.body()
    signature = request.headers.get("x-nylonpay-signature", "")

    if not verify_webhook(body, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    try:
        import json
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")

    event = payload.get("event", "")
    reference = payload.get("reference", "")
    status_val = payload.get("status", "")

    if event == "payment.completed" and status_val == "success":
        result = service.confirm_subscription(reference)
        if result:
            logger.info("Subscription confirmed for reference %s", reference)
            return {"status": "ok", "message": "Subscription confirmed"}
        logger.warning("Subscription not found for reference %s", reference)
        return {"status": "not_found", "message": "No pending subscription found"}

    logger.info("Unhandled webhook event: %s for reference %s", event, reference)
    return {"status": "ignored", "message": f"Event {event} not handled"}
