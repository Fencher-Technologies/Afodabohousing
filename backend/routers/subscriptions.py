import logging
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from dependencies import (
    CurrentUser,
    get_service_client,
    require_super_admin,
    require_super_admin_or_manager,
)
from models.subscription import (
    InitiateSubscriptionRequest,
    InitiateSubscriptionResponse,
    SubscriptionResponse,
    SubscriptionStats,
    calculate_subscription_price,
)
from services.nylonpay import initiate_boost_payment
from services.subscription import SubscriptionService, get_subscription_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


def get_sub_svc(supabase: Client = Depends(get_service_client)) -> SubscriptionService:
    return get_subscription_service(supabase)


class PaginatedSubscriptionResponse(BaseModel):
    items: list[SubscriptionResponse]
    total: int
    skip: int
    limit: int


# ── Super Admin: Subscription Management ──


@router.get("", response_model=PaginatedSubscriptionResponse)
def list_subscriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_super_admin),
    service: SubscriptionService = Depends(get_sub_svc),
) -> PaginatedSubscriptionResponse:
    subs, total = service.get_all(skip=skip, limit=limit)
    return PaginatedSubscriptionResponse(
        items=[SubscriptionResponse(**s) for s in subs],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/my", response_model=SubscriptionResponse)
def get_my_subscription(
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    service: SubscriptionService = Depends(get_sub_svc),
) -> SubscriptionResponse:
    sub = service.get_by_manager(UUID(current_user.id))
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No subscription found")
    return SubscriptionResponse(**sub)


@router.get("/stats", response_model=SubscriptionStats)
def get_subscription_stats(
    current_user: CurrentUser = Depends(require_super_admin),
    service: SubscriptionService = Depends(get_sub_svc),
) -> SubscriptionStats:
    return service.get_stats()


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: UUID,
    current_user: CurrentUser = Depends(require_super_admin),
    service: SubscriptionService = Depends(get_sub_svc),
) -> SubscriptionResponse:
    sub = service.get_by_id(subscription_id)
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    return SubscriptionResponse(**sub)


@router.post("/expire-old")
def expire_old_subscriptions(
    current_user: CurrentUser = Depends(require_super_admin),
    service: SubscriptionService = Depends(get_sub_svc),
) -> dict:
    count = service.expire_old()
    return {"message": f"{count} subscription(s) expired", "expired_count": count}


@router.patch("/{subscription_id}/cancel")
def cancel_subscription(
    subscription_id: UUID,
    current_user: CurrentUser = Depends(require_super_admin),
    service: SubscriptionService = Depends(get_sub_svc),
) -> dict:
    sub = service.get_by_id(subscription_id)
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    if sub["status"] != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only active subscriptions can be cancelled")
    service.cancel(subscription_id)
    return {"message": "Subscription cancelled", "subscription_id": str(subscription_id), "status": "cancelled"}


# ── Manager: Self-service ──


@router.post("/initiate", response_model=InitiateSubscriptionResponse)
def initiate_subscription(
    data: InitiateSubscriptionRequest,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    service: SubscriptionService = Depends(get_sub_svc),
) -> InitiateSubscriptionResponse:
    amount = calculate_subscription_price(data.plan_type)
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid plan type")

    reference = str(uuid4())
    result = service.create_pending(UUID(current_user.id), data.plan_type, amount, reference)

    try:
        initiate_boost_payment(
            amount=int(amount),
            customer_name=current_user.full_name or current_user.email,
            customer_phone=data.phone_number,
            reference=reference,
            description=f"Subscription {data.plan_type} — Afodabo Housing",
        )
    except Exception as e:
        logger.error("NylonPay payment initiation failed for subscription %s: %s", result["id"], str(e))
        service.cancel(result["id"])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment initiation failed. Please try again.",
        )

    return InitiateSubscriptionResponse(
        subscription_id=result["id"],
        reference=reference,
        status="pending",
        message="Check your phone for the payment prompt. Enter your PIN to confirm.",
    )
