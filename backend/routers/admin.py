import logging
import secrets
from datetime import UTC, datetime

from dateutil.parser import isoparse
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from supabase import Client

from dependencies import (
    CurrentUser,
    get_service_client,
    require_super_admin,
    require_super_admin_or_manager,
)
from phone import normalize_phone
from models.subscription import ManagerSubscriptionResponse
from services.crud import _enrich_leases
from services.pesapal import register_ipn_for_url
from services.subscriptions import get_subscription_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Models ──


class PesapalRegisterIpnRequest(BaseModel):
    ipn_url: str


class CreateManagerRequest(BaseModel):
    email: str | None = None
    full_name: str
    phone: str


class CreateTenantRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone: str | None = None
    property_id: str | None = None
    rent_start_date: str | None = None
    rent_end_date: str | None = None
    rent_amount: float | None = None


class ResetTenantPasswordRequest(BaseModel):
    user_id: str


class RemoveManagerRequest(BaseModel):
    user_id: str


class StatusUpdateRequest(BaseModel):
    status: str  # "active" | "suspended"


class UserResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str | None = None
    photo_url: str | None = None
    role: str
    status: str
    created_at: str | None = None
    property_count: int = 0
    overdue_tenants: int = 0
    total_outstanding: float = 0
    subscription_plan: str | None = None
    subscription_status: str | None = None
    boosted_count: int = 0


class ManagerProperty(BaseModel):
    id: str
    title: str
    status: str
    property_type: str | None = None
    city: str | None = None
    area: int | None = None
    monthly_rent: float | None = None
    bedrooms: int | None = None
    bathrooms: float | None = None
    is_boosted: bool = False


class ManagerDetailResponse(UserResponse):
    properties: list[ManagerProperty] = []
    tenants_count: int = 0
    subscription_id: str | None = None
    subscription_days_remaining: int = 0


class AdminConfirmSubscriptionRequest(BaseModel):
    paid_amount: float


class DashboardStats(BaseModel):
    # User stats
    total_managers: int = 0
    total_tenants: int = 0
    active_managers: int = 0
    active_tenants: int = 0
    new_this_month: int = 0
    # Property stats
    total_properties: int = 0
    occupied_properties: int = 0
    vacant_properties: int = 0
    occupancy_rate: float = 0
    # Financial stats
    total_collected: float = 0
    total_outstanding: float = 0
    avg_collection_rate: float = 0
    recent_payments_count: int = 0
    # Subscription stats
    active_subscriptions: int = 0
    subscription_revenue_total: float = 0
    subscription_revenue_this_month: float = 0
    subscription_growth_pct: float = 0


# ── Helpers ──


def parse_timestamp(ts: str) -> datetime:
    try:
        return isoparse(ts)
    except Exception:
        return datetime.min.replace(tzinfo=UTC)


def _count(supabase: Client, table: str, **filters) -> int:
    try:
        q = supabase.table(table).select("*", count="exact")
        for k, v in filters.items():
            q = q.eq(k, v)
        r = q.execute()
        if r.count is not None:
            return r.count
        return len(r.data) if r.data else 0
    except Exception as e:
        logger.exception("Count query failed on %s: %s", table, e)
        return 0


# ── Endpoints ──


@router.post("/pesapal/register-ipn")
async def register_pesapal_ipn(
    data: PesapalRegisterIpnRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> dict:
    """Register (or reuse) the Pesapal IPN webhook URL and persist the ipn_id.

    IPN registration is API-based — there is no Pesapal dashboard form. The
    URL changes only when the domain changes (e.g. on first deploy to Render),
    so call this with the current public webhook URL:
    https://axishousing.onrender.com/payments/webhook/pesapal.
    """
    try:
        result = await register_ipn_for_url(supabase, data.ipn_url.strip())
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    return {"message": f"IPN {result['status']} successfully", **result}


@router.post("/create-manager")
def create_manager(
    data: CreateManagerRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> dict:
    if not data.full_name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full name is required")

    email = data.email.strip() if data.email else None
    phone = normalize_phone(data.phone) if data.phone else ""
    phone_slug = phone.replace("+", "").replace(" ", "").replace("-", "")
    effective_email = email or f"manager-{phone_slug}@axis.internal"

    if email:
        existing = supabase.table("profiles").select("user_id").eq("email", email).execute()
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists",
            )

    password = secrets.token_urlsafe(12)

    try:
        auth_result = supabase.auth.admin.create_user({
            "email": effective_email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": data.full_name, "phone": phone},
        })
    except Exception as e:
        msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                body = e.response.json()
                msg = body.get("msg", body.get("error_description", body.get("error", msg)))
            except Exception:
                msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create user: {msg}",
        )

    user = auth_result.user
    user_id = user.id

    supabase.table("profiles").upsert({
        "user_id": user_id,
        "email": effective_email,
        "full_name": data.full_name,
        "phone": phone,
        "role": "house_manager",
        "status": "active",
        "created_by": current_user.id,
    }, on_conflict="user_id").execute()

    logger.info(
        "Manager created: email=%s phone=%s user_id=%s by super_admin=%s",
        effective_email, phone, user_id, current_user.id,
    )

    return {
        "message": "Manager account created",
        "email": effective_email,
        "phone": phone,
        "user_id": user_id,
        "temporary_password": password,
    }


@router.post("/create-tenant")
def create_tenant(
    data: CreateTenantRequest,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
) -> dict:
    if not data.full_name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full name is required")

    existing = supabase.table("profiles").select("user_id").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    password = secrets.token_urlsafe(12)

    try:
        auth_result = supabase.auth.admin.create_user({
            "email": data.email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": data.full_name},
        })
    except Exception as e:
        msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            try:
                body = e.response.json()
                msg = body.get("msg", body.get("error_description", body.get("error", msg)))
            except Exception:
                msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create user: {msg}",
        )

    user = auth_result.user
    user_id = user.id

    tenant_phone = normalize_phone(data.phone) if data.phone else ""

    supabase.table("profiles").upsert({
        "user_id": user_id,
        "email": data.email,
        "full_name": data.full_name,
        "phone": tenant_phone,
        "role": "tenant",
        "status": "active",
    }, on_conflict="user_id").execute()

    name_parts = data.full_name.strip().split(None, 1)
    tenant_result = supabase.table("tenants").insert({
        "owner_id": current_user.id,
        "user_id": user_id,
        "first_name": name_parts[0] if name_parts else data.full_name,
        "last_name": name_parts[1] if len(name_parts) > 1 else "",
        "email": data.email,
        "phone": tenant_phone,
        "status": "active",
    }).execute()
    tenant_id = tenant_result.data[0]["id"] if tenant_result.data else None

    if data.property_id and data.rent_start_date and tenant_id:
        supabase.table("leases").insert({
            "owner_id": current_user.id,
            "property_id": data.property_id,
            "tenant_id": tenant_id,
            "start_date": data.rent_start_date,
            "end_date": data.rent_end_date or data.rent_start_date,
            "monthly_rent": data.rent_amount or 0,
            "security_deposit": 0,
            "status": "active",
        }).execute()
        supabase.table("properties").update({"status": "occupied"}).eq("id", data.property_id).execute()

    logger.info(
        "Tenant created: email=%s user_id=%s by %s=%s",
        data.email, user_id, current_user.role, current_user.id,
    )

    return {
        "message": "Tenant account created",
        "email": data.email,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "full_name": data.full_name,
        "temporary_password": password,
    }


@router.post("/reset-tenant-password")
def reset_tenant_password(
    data: ResetTenantPasswordRequest,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
) -> dict:
    password = secrets.token_urlsafe(12)
    try:
        supabase.auth.admin.update_user_by_id(data.user_id, {"password": password})
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to reset password: {e}",
        )
    logger.info("Password reset for user_id=%s by %s=%s", data.user_id, current_user.role, current_user.id)
    return {"temporary_password": password}


@router.delete("/users/{user_id}")
def remove_manager(
    user_id: str,
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> dict:
    """Permanently remove a manager: deletes the auth user (which cascades to
    profiles, properties, leases, tenants and other owned rows via ON DELETE
    CASCADE). Fails with a hint if the manager still owns rows that block
    deletion (boosts, subscriptions, uploaded agreement documents).
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own account",
        )

    profile = (
        supabase.table("profiles")
        .select("role, full_name, email")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if profile.data[0].get("role") != "house_manager":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only managers can be removed here",
        )

    try:
        supabase.auth.admin.delete_user(user_id)
    except Exception as e:
        logger.warning("Manager removal blocked for user_id=%s: %s", user_id, e)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Manager has records that block removal (boosts, subscriptions or "
            "agreement documents). Suspend them instead.",
        )

    logger.info(
        "Manager removed: user_id=%s email=%s by super_admin=%s",
        user_id, profile.data[0].get("email"), current_user.id,
    )
    return {"message": "Manager removed", "user_id": user_id}


@router.get("/users", response_model=list[UserResponse])
def list_users(
    role: str | None = Query(None, description="Filter by role"),
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> list[UserResponse]:
    query = supabase.table("profiles").select("user_id, full_name, role, status, created_at, email, photo_url")

    if role:
        query = query.eq("role", role)

    result = query.order("created_at", desc=True).execute()
    users = result.data or []

    manager_ids = [str(u["user_id"]) for u in users if u.get("role") == "house_manager"]

    # Latest subscription per manager (one batched query).
    latest_sub_by_manager: dict[str, dict] = {}
    plan_names: dict[str, str] = {}
    if manager_ids:
        subs = (
            supabase.table("manager_subscriptions")
            .select("manager_id, plan_id, status, payment_status, created_at")
            .in_("manager_id", manager_ids)
            .execute()
            .data
            or []
        )
        for s in subs:
            mid = str(s.get("manager_id", ""))
            if not mid:
                continue
            cur = latest_sub_by_manager.get(mid)
            if cur is None or str(s.get("created_at", "")) > str(cur.get("created_at", "")):
                latest_sub_by_manager[mid] = s

        plan_ids = [str(s["plan_id"]) for s in latest_sub_by_manager.values() if s.get("plan_id")]
        if plan_ids:
            plans = (
                supabase.table("subscription_plans")
                .select("id, name")
                .in_("id", plan_ids)
                .execute()
                .data
                or []
            )
            plan_names = {str(p["id"]): p.get("name") for p in plans}

    # Active boost count per manager (two batched queries: properties -> boosts).
    boosted_by_manager: dict[str, int] = {}
    if manager_ids:
        props = (
            supabase.table("properties")
            .select("id, owner_id")
            .in_("owner_id", manager_ids)
            .execute()
            .data
            or []
        )
        owner_of = {str(p["id"]): str(p["owner_id"]) for p in props}
        if owner_of:
            boosts = (
                supabase.table("property_boosts")
                .select("property_id")
                .in_("property_id", list(owner_of.keys()))
                .eq("status", "active")
                .execute()
                .data
                or []
            )
            for b in boosts:
                owner = owner_of.get(str(b.get("property_id")))
                if owner:
                    boosted_by_manager[owner] = boosted_by_manager.get(owner, 0) + 1

    responses = []
    for u in users:
        mid = str(u.get("user_id", ""))
        sub = latest_sub_by_manager.get(mid)
        subscription_plan = None
        subscription_status = None
        if sub:
            subscription_status = sub.get("payment_status") or sub.get("status")
            plan_id = sub.get("plan_id")
            if plan_id:
                subscription_plan = plan_names.get(str(plan_id)) or str(plan_id)

        responses.append(UserResponse(
            id=mid,
            user_id=mid,
            email=u.get("email", ""),
            full_name=u.get("full_name"),
            photo_url=u.get("photo_url"),
            role=u.get("role", ""),
            status=u.get("status", "active"),
            created_at=str(u.get("created_at")) if u.get("created_at") else None,
            subscription_plan=subscription_plan,
            subscription_status=subscription_status,
            boosted_count=boosted_by_manager.get(mid, 0),
        ))

    return responses


@router.get("/users/{user_id}", response_model=ManagerDetailResponse)
def get_user_detail(
    user_id: str,
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> ManagerDetailResponse:
    prof = (
        supabase.table("profiles")
        .select("user_id, full_name, role, status, created_at, email, photo_url")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not prof.data:
        raise HTTPException(status_code=404, detail="User not found")
    u = prof.data[0]

    prop_count = 0
    overdue = 0
    total_outstanding = 0
    subscription_plan = None
    subscription_status = None
    subscription_id = None
    subscription_days_remaining = 0
    boosted_count = 0
    tenants_count = 0
    properties: list[ManagerProperty] = []

    if u.get("role") == "house_manager":
        props = (
            supabase.table("properties")
            .select("id, title, status, property_type, city, area, monthly_rent, bedrooms, bathrooms, is_boosted")
            .eq("owner_id", user_id)
            .execute()
        )
        prop_rows = props.data or []
        prop_count = len(prop_rows)

        tenants = supabase.table("tenants").select("id", count="exact").eq("owner_id", user_id).execute()
        tenants_count = tenants.count if hasattr(tenants, "count") else len(tenants.data or [])

        owner_leases = (
            supabase.table("leases")
            .select(
                "id, tenant_id, owner_id, property_id, monthly_rent, "
                "status, start_date, end_date, rent_effective_date"
            )
            .eq("owner_id", user_id)
            .execute()
        )
        for lease in _enrich_leases(owner_leases.data or [], supabase):
            if lease.get("effective_status") == "terminated":
                continue
            if lease.get("is_overdue"):
                overdue += 1
                total_outstanding += float(lease.get("arrears_amount") or 0)

        subs = (
            supabase.table("manager_subscriptions")
            .select("id, plan_id, status, payment_status, expires_at")
            .eq("manager_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if subs.data:
            sub = subs.data[0]
            subscription_id = str(sub.get("id")) if sub.get("id") else None
            subscription_status = sub.get("payment_status") or sub.get("status")
            plan_id = sub.get("plan_id")
            if plan_id:
                plan = (
                    supabase.table("subscription_plans")
                    .select("name")
                    .eq("id", str(plan_id))
                    .limit(1)
                    .execute()
                )
                subscription_plan = plan.data[0]["name"] if plan.data else str(plan_id)
            expires = sub.get("expires_at")
            if expires and subscription_status == "completed":
                try:
                    remaining = (
                        isoparse(str(expires).replace("Z", "+00:00"))
                        - datetime.now(UTC)
                    )
                    subscription_days_remaining = max(0, remaining.days)
                except (TypeError, ValueError):
                    subscription_days_remaining = 0

        prop_ids = [str(p["id"]) for p in prop_rows]
        if prop_ids:
            boost_cnt = (
                supabase.table("property_boosts")
                .select("id", count="exact")
                .in_("property_id", prop_ids)
                .eq("status", "active")
                .execute()
            )
            boosted_count = boost_cnt.count if hasattr(boost_cnt, "count") else len(boost_cnt.data or [])

        properties = [
            ManagerProperty(
                id=str(p["id"]),
                title=p.get("title", ""),
                status=p.get("status", ""),
                property_type=p.get("property_type"),
                city=p.get("city"),
                area=p.get("area"),
                monthly_rent=float(p["monthly_rent"]) if p.get("monthly_rent") is not None else None,
                bedrooms=p.get("bedrooms"),
                bathrooms=p.get("bathrooms"),
                is_boosted=bool(p.get("is_boosted")),
            )
            for p in prop_rows
        ]

    return ManagerDetailResponse(
        id=str(u.get("user_id", "")),
        user_id=str(u.get("user_id", "")),
        email=u.get("email", ""),
        full_name=u.get("full_name"),
        photo_url=u.get("photo_url"),
        role=u.get("role", ""),
        status=u.get("status", "active"),
        created_at=str(u.get("created_at")) if u.get("created_at") else None,
        property_count=prop_count,
        overdue_tenants=overdue,
        total_outstanding=total_outstanding,
        subscription_plan=subscription_plan,
        subscription_status=subscription_status,
        boosted_count=boosted_count,
        properties=properties,
        tenants_count=tenants_count,
        subscription_id=subscription_id,
        subscription_days_remaining=subscription_days_remaining,
    )


@router.post("/subscriptions/{subscription_id}/confirm", response_model=ManagerSubscriptionResponse)
def confirm_subscription_payment(
    subscription_id: str,
    data: AdminConfirmSubscriptionRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> ManagerSubscriptionResponse:
    """Super-admin safety valve: confirm a subscription after verifying the
    payment on Pesapal's dashboard (paid before the webhook fixes). Reuses the
    same amount-guarded activation as the live webhook.
    """
    sub = (
        supabase.table("manager_subscriptions")
        .select("payment_reference")
        .eq("id", subscription_id)
        .limit(1)
        .execute()
    )
    if not sub.data:
        raise HTTPException(status_code=404, detail="Subscription not found")

    reference = sub.data[0].get("payment_reference")
    result = get_subscription_service(supabase).confirm_subscription(reference, data.paid_amount)
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Payment verification failed: amount mismatch or subscription not pending",
        )
    return result


@router.get("/pending-managers", response_model=list[UserResponse])
def list_pending_managers(
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> list[UserResponse]:
    result = (
        supabase.table("profiles")
        .select("user_id, full_name, role, status, created_at, email, photo_url, phone")
        .eq("role", "house_manager")
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
    )
    users = result.data or []
    return [
        UserResponse(
            id=str(u["user_id"]),
            user_id=str(u["user_id"]),
            email=u.get("email", ""),
            full_name=u.get("full_name"),
            photo_url=u.get("photo_url"),
            role=u.get("role", ""),
            status=u.get("status", "pending"),
            created_at=str(u["created_at"]) if u.get("created_at") else None,
        )
        for u in users
    ]


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    data: StatusUpdateRequest,
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> dict:
    if data.status not in ("active", "suspended", "rejected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'active', 'suspended', or 'rejected'",
        )

    result = supabase.table("profiles").update({"status": data.status}).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    logger.info("User %s status updated to %s by super admin %s", user_id, data.status, current_user.id)

    return {"message": f"User status updated to {data.status}", "user_id": user_id, "status": data.status}


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
) -> DashboardStats:
    # ── User counts ──
    total_managers = _count(supabase, "profiles", role="house_manager")
    total_tenants = _count(supabase, "profiles", role="tenant")
    active_managers = _count(supabase, "profiles", role="house_manager", status="active")
    active_tenants = _count(supabase, "profiles", role="tenant", status="active")

    # New users this month
    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    try:
        new_users = (
            supabase.table("profiles")
            .select("user_id", count="exact")
            .gte("created_at", month_start.isoformat())
            .execute()
        )
        new_this_month = new_users.count if hasattr(new_users, "count") else 0
    except Exception:
        new_this_month = 0

    # ── Property counts ──
    total_props = _count(supabase, "properties")
    occupied = _count(supabase, "properties", status="occupied")
    vacant = total_props - occupied

    occupancy = round(occupied / total_props, 2) if total_props > 0 else 0

    # ── Financial ──
    total_collected = 0
    total_outstanding = 0
    recent_count = 0
    collection_rate = 0

    try:
        paid = supabase.table("payments").select("amount", count="exact").eq("status", "completed").execute()
        if paid.data:
            total_collected = sum(p.get("amount", 0) or 0 for p in paid.data)
            recent_count = paid.count if hasattr(paid, "count") else len(paid.data)
    except Exception:
        pass

    try:
        # Outstanding: sum of lease amounts where status = active and no completed payment this month
        active_leases = supabase.table("leases").select("id, monthly_rent").eq("status", "active").execute()
        if active_leases.data:
            total_outstanding = sum(float(l.get("monthly_rent", 0) or 0) for l in active_leases.data)
    except Exception:
        pass

    if total_outstanding + total_collected > 0:
        collection_rate = round(total_collected / (total_collected + total_outstanding), 2)

    # ── Subscription stats ──
    active_subs = 0
    sub_revenue_total = 0.0
    sub_revenue_month = 0.0
    sub_growth = 0.0

    try:
        subs = supabase.table("manager_subscriptions").select("plan_id, status, created_at").execute()
        all_subs = subs.data or []
        active_subs = sum(1 for s in all_subs if s.get("status") == "active")

        # Last month active subs count for growth
        last_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Rough: count subs created before this month vs during this month
        created_before = [
            s for s in all_subs
            if s.get("created_at") and parse_timestamp(s["created_at"]) < last_month_start
        ]
        active_before = sum(1 for s in created_before if s.get("status") == "active")
        sub_growth = round(
            ((active_subs - active_before) / active_before * 100) if active_before > 0 else 0, 1
        )

        # Revenue from plans — joins via plan_id
        plans = supabase.table("subscription_plans").select("id, price_ugx").execute()
        plan_prices = {p["id"]: float(p.get("price_ugx", 0)) for p in (plans.data or [])}
        for s in all_subs:
            price = plan_prices.get(s.get("plan_id", ""), 0)
            sub_revenue_total += price
            if (
                s.get("created_at")
                and parse_timestamp(s["created_at"]) >= month_start
            ):
                sub_revenue_month += price
    except Exception:
        pass

    return DashboardStats(
        total_managers=total_managers,
        total_tenants=total_tenants,
        active_managers=active_managers,
        active_tenants=active_tenants,
        new_this_month=new_this_month,
        total_properties=total_props,
        occupied_properties=occupied,
        vacant_properties=vacant,
        occupancy_rate=occupancy,
        total_collected=total_collected,
        total_outstanding=total_outstanding,
        avg_collection_rate=collection_rate,
        recent_payments_count=recent_count,
        active_subscriptions=active_subs,
        subscription_revenue_total=sub_revenue_total,
        subscription_revenue_this_month=sub_revenue_month,
        subscription_growth_pct=sub_growth,
    )
