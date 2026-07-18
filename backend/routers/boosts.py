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
from models.boost import (
    BoostCreate,
    BoostPriceResponse,
    BoostResponse,
    BoostStats,
    InitiateBoostRequest,
    InitiateBoostResponse,
)
from services.boost import BoostService, calculate_boost_price, get_boost_service
from services.nylonpay import initiate_boost_payment

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/boosts", tags=["boosts"])


def get_boost_svc(supabase: Client = Depends(get_service_client)) -> BoostService:
    return get_boost_service(supabase)


class PaginatedBoostResponse(BaseModel):
    items: list[BoostResponse]
    total: int
    skip: int
    limit: int


class BoostCreateRequest(BaseModel):
    property_id: UUID
    duration_days: int = 7


class BoostCancelResponse(BaseModel):
    message: str
    boost_id: str
    status: str


# ── Super Admin: Boost Management ──


@router.post("", response_model=BoostResponse, status_code=status.HTTP_201_CREATED)
def create_boost(
    data: BoostCreateRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
    service: BoostService = Depends(get_boost_svc),
) -> BoostResponse:
    """Create a boost for a property. Super admin only (payment verified offline)."""
    # Verify property exists
    prop = supabase.table("properties").select("id, owner_id, title").eq("id", str(data.property_id)).maybe_single().execute()
    if not prop.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    manager_id = prop.data.get("owner_id")
    amount = calculate_boost_price(data.duration_days)

    boost_data = BoostCreate(
        property_id=data.property_id,
        duration_days=data.duration_days,
        amount_paid=amount,
    )

    result = service.create(boost_data, UUID(manager_id))

    return BoostResponse(
        id=result["id"],
        property_id=result["property_id"],
        property_title=prop.data.get("title"),
        amount_paid=result["amount_paid"],
        duration_days=result["duration_days"],
        started_at=result["started_at"],
        expires_at=result["expires_at"],
        status=result["status"],
        created_at=result["created_at"],
    )


@router.get("", response_model=PaginatedBoostResponse)
def list_boosts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_super_admin),
    service: BoostService = Depends(get_boost_svc),
    supabase: Client = Depends(get_service_client),
) -> PaginatedBoostResponse:
    """List all boosts. Super admin only."""
    boosts, total = service.get_all(skip=skip, limit=limit)

    # Enrich with property titles
    property_ids = [b["property_id"] for b in boosts if b.get("property_id")]
    titles = {}
    if property_ids:
        props = supabase.table("properties").select("id, title").in_("id", property_ids).execute()
        titles = {p["id"]: p["title"] for p in (props.data or [])}

    items = [
        BoostResponse(
            id=b["id"],
            property_id=b["property_id"],
            property_title=titles.get(b.get("property_id", "")),
            amount_paid=b["amount_paid"],
            duration_days=b["duration_days"],
            started_at=b["started_at"],
            expires_at=b["expires_at"],
            status=b["status"],
            created_at=b["created_at"],
        )
        for b in boosts
    ]

    return PaginatedBoostResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/stats", response_model=BoostStats)
def get_boost_stats(
    current_user: CurrentUser = Depends(require_super_admin),
    service: BoostService = Depends(get_boost_svc),
) -> BoostStats:
    """Boost revenue and usage stats. Super admin only."""
    return service.get_stats()


@router.get("/{boost_id}", response_model=BoostResponse)
def get_boost(
    boost_id: UUID,
    current_user: CurrentUser = Depends(require_super_admin),
    service: BoostService = Depends(get_boost_svc),
    supabase: Client = Depends(get_service_client),
) -> BoostResponse:
    """Get a specific boost. Super admin only."""
    boost = service.get_by_id(boost_id)
    if not boost:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Boost not found")

    prop_title = None
    if boost.get("property_id"):
        prop = supabase.table("properties").select("title").eq("id", boost["property_id"]).maybe_single().execute()
        if prop.data:
            prop_title = prop.data.get("title")

    return BoostResponse(
        id=boost["id"],
        property_id=boost["property_id"],
        property_title=prop_title,
        amount_paid=boost["amount_paid"],
        duration_days=boost["duration_days"],
        started_at=boost["started_at"],
        expires_at=boost["expires_at"],
        status=boost["status"],
        created_at=boost["created_at"],
    )


@router.patch("/{boost_id}/cancel", response_model=BoostCancelResponse)
def cancel_boost(
    boost_id: UUID,
    current_user: CurrentUser = Depends(require_super_admin),
    service: BoostService = Depends(get_boost_svc),
) -> BoostCancelResponse:
    """Cancel an active boost. Super admin only."""
    boost = service.get_by_id(boost_id)
    if not boost:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Boost not found")
    if boost["status"] != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only active boosts can be cancelled")

    success = service.cancel(boost_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to cancel boost")

    return BoostCancelResponse(
        message="Boost cancelled successfully",
        boost_id=str(boost_id),
        status="cancelled",
    )


@router.post("/expire-old")
def expire_old_boosts(
    current_user: CurrentUser = Depends(require_super_admin),
    service: BoostService = Depends(get_boost_svc),
) -> dict:
    """Manually expire overdue boosts. Super admin only."""
    count = service.expire_old()
    return {"message": f"{count} boost(s) expired", "expired_count": count}


# ── Manager: Self-service boost initiation with NylonPay ──


@router.post("/initiate", response_model=InitiateBoostResponse)
def initiate_boost(
    data: InitiateBoostRequest,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
    service: BoostService = Depends(get_boost_svc),
) -> InitiateBoostResponse:
    """Manager initiates a boost for their own property. Payment via NylonPay mobile money."""
    prop = supabase.table("properties").select("id, owner_id, title").eq("id", str(data.property_id)).maybe_single().execute()
    if not prop.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    if str(prop.data.get("owner_id")) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only boost your own properties")

    amount = int(calculate_boost_price(data.duration_days))
    reference = str(uuid4())
    prop_title = prop.data.get("title", "Property")

    boost_data = BoostCreate(
        property_id=data.property_id,
        duration_days=data.duration_days,
        amount_paid=calculate_boost_price(data.duration_days),
    )

    result = service.create_pending(boost_data, UUID(current_user.id), reference, "nylonpay")

    try:
        initiate_boost_payment(
            amount=amount,
            customer_name=current_user.full_name or current_user.email,
            customer_phone=data.phone_number,
            reference=reference,
            description=f"Boost {prop_title} ({data.duration_days} days)",
        )
    except Exception as e:
        logger.error("NylonPay payment initiation failed for boost %s: %s", result["id"], str(e))
        service.cancel(result["id"])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment initiation failed. Please try again.",
        )

    return InitiateBoostResponse(
        boost_id=result["id"],
        reference=reference,
        status="pending",
        message="Check your phone for the payment prompt. Enter your PIN to confirm.",
    )


# ── Manager: Price calculation (no auth required for price discovery) ──


@router.get("/price/default")
def default_boost_price() -> BoostPriceResponse:
    """Get the default boost pricing. Public endpoint."""
    return BoostPriceResponse(
        duration_days=7,
        amount=float(calculate_boost_price(7)),
        currency="UGX",
    )
