import logging
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_service_client, require_active_user
from services import LeaseService, PaymentService, get_lease_service, get_payment_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


def _get_report_supabase() -> Client:
    """Plain (non-lru_cache) wrapper so FastAPI can depend on the service client."""
    return get_service_client()


def get_report_lease_svc(supabase: Client = Depends(_get_report_supabase)) -> LeaseService:
    return get_lease_service(supabase)


def get_report_payment_svc(supabase: Client = Depends(_get_report_supabase)) -> PaymentService:
    return get_payment_service(supabase)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _last_payment_info(payments: list[dict[str, Any]]) -> dict[str, Any]:
    """Return the most recent confirmed/completed payment's date/method."""
    confirmed = [p for p in payments if str(p.get("status")) in ("confirmed", "completed")]
    last = None
    for p in confirmed:
        pd = p.get("paid_date") or p.get("created_at")
        if pd and (last is None or pd > last.get("paid_date")):
            last = p
    if not last:
        return {"last_payment_date": None, "last_payment_method": None, "last_payment_amount": None}
    return {
        "last_payment_date": last.get("paid_date"),
        "last_payment_method": last.get("payment_method"),
        "last_payment_amount": float(last.get("amount", 0)) if last.get("amount") is not None else None,
    }


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class TenantReportItem(BaseModel):
    tenant_id: str
    tenant_name: str | None = None
    tenant_email: str | None = None
    tenant_phone: str | None = None
    property_title: str | None = None
    unit_label: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    status: str
    monthly_rent: float
    expected_rent: float
    total_paid: float
    balance_due: float
    tenant_credit: float
    lease_id: str


class TenantReportResponse(BaseModel):
    items: list[TenantReportItem]
    total: int


class OutstandingItem(BaseModel):
    tenant_id: str
    tenant_name: str | None = None
    tenant_phone: str | None = None
    property_title: str | None = None
    unit_label: str | None = None
    status: str
    expected_rent: float
    total_paid: float
    balance_due: float
    last_payment_date: str | None = None
    last_payment_method: str | None = None
    lease_id: str


class OutstandingResponse(BaseModel):
    items: list[OutstandingItem]
    total: int
    total_outstanding: float = 0.0


class StatementPayment(BaseModel):
    id: str
    date: str | None = None
    amount: float
    method: str | None = None
    status: str
    type: str | None = None


class RenewalHistoryItem(BaseModel):
    previous_end_date: str | None = None
    new_end_date: str | None = None
    monthly_rent: float | None = None
    notes: str | None = None
    renewed_at: str | None = None


class TenantStatement(BaseModel):
    lease_id: str
    tenant_id: str
    tenant_name: str | None = None
    tenant_email: str | None = None
    tenant_phone: str | None = None
    property_title: str | None = None
    unit_label: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    status: str
    monthly_rent: float
    expected_rent: float
    total_paid: float
    balance_due: float
    tenant_credit: float
    is_overdue: bool
    payment_history: list[StatementPayment]
    renewal_history: list[RenewalHistoryItem]


class RentCollectionResponse(BaseModel):
    period_from: str | None = None
    period_to: str | None = None
    total_expected: float
    total_collected: float
    total_outstanding: float
    total_tenant_credit: float
    collection_percentage: float
    tenants_paid_in_full: int
    tenants_with_balance: int
    total_tenants: int


class FinancialSummary(BaseModel):
    total_expected: float
    total_collected: float
    total_outstanding: float
    total_tenant_credit: float
    active_tenancies: int
    expired_tenancies: int
    terminated_tenancies: int
    occupancy_rate: float


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/tenants", response_model=TenantReportResponse)
def tenants_report(
    property_id: str | None = Query(None),
    tenant_id: str | None = Query(None),
    status: str | None = Query(None, description="active|expired|terminated"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(_get_report_supabase),
    lease_svc: LeaseService = Depends(get_report_lease_svc),
) -> TenantReportResponse:
    leases, total = lease_svc.get_all(current_user.id, skip=skip, limit=limit)

    leases = [l for l in leases if l.get("effective_status") != "terminated" or status == "terminated"]
    if property_id:
        leases = [l for l in leases if str(l.get("property_id")) == str(property_id)]
    if tenant_id:
        leases = [l for l in leases if str(l.get("tenant_id")) == str(tenant_id)]
    if status:
        leases = [l for l in leases if l.get("effective_status") == status]

    items = [
        TenantReportItem(
            tenant_id=str(l.get("tenant_id")),
            tenant_name=l.get("tenant_name"),
            tenant_email=l.get("tenant_email"),
            tenant_phone=l.get("tenant_phone"),
            property_title=l.get("property_title"),
            unit_label=l.get("unit_label"),
            start_date=str(l.get("start_date")) if l.get("start_date") else None,
            end_date=str(l.get("end_date")) if l.get("end_date") else None,
            status=l.get("effective_status", "active"),
            monthly_rent=float(l.get("monthly_rent") or 0),
            expected_rent=float(l.get("expected_rent") or 0),
            total_paid=float(l.get("total_paid") or 0),
            balance_due=float(l.get("balance_due") or 0),
            tenant_credit=float(l.get("tenant_credit") or 0),
            lease_id=str(l.get("id")),
        )
        for l in leases
    ]
    return TenantReportResponse(items=items, total=total)


@router.get("/outstanding", response_model=OutstandingResponse)
def outstanding_report(
    property_id: str | None = Query(None),
    status: str | None = Query(None, description="active|expired|terminated"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(_get_report_supabase),
    lease_svc: LeaseService = Depends(get_report_lease_svc),
) -> OutstandingResponse:
    leases, _ = lease_svc.get_all(current_user.id, skip=0, limit=500)

    if property_id:
        leases = [l for l in leases if str(l.get("property_id")) == str(property_id)]
    if status:
        leases = [l for l in leases if l.get("effective_status") == status]

    # Only tenants who still owe money.
    outstanding = [l for l in leases if float(l.get("balance_due") or 0) > 0]
    total_outstanding = round(sum(float(l.get("balance_due") or 0) for l in outstanding), 2)

    # Paginate the filtered set.
    page = outstanding[skip : skip + limit]
    items = [
        OutstandingItem(
            tenant_id=str(l.get("tenant_id")),
            tenant_name=l.get("tenant_name"),
            tenant_phone=l.get("tenant_phone"),
            property_title=l.get("property_title"),
            unit_label=l.get("unit_label"),
            status=l.get("effective_status", "active"),
            expected_rent=float(l.get("expected_rent") or 0),
            total_paid=float(l.get("total_paid") or 0),
            balance_due=float(l.get("balance_due") or 0),
            last_payment_date=str(l.get("last_payment_date")) if l.get("last_payment_date") else None,
            last_payment_method=l.get("last_payment_method"),
            lease_id=str(l.get("id")),
        )
        for l in page
    ]
    return OutstandingResponse(items=items, total=len(outstanding), total_outstanding=total_outstanding)


@router.get("/tenant/{tenant_id}", response_model=TenantStatement)
def tenant_statement(
    tenant_id: str,
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(_get_report_supabase),
    lease_svc: LeaseService = Depends(get_report_lease_svc),
    payment_svc: PaymentService = Depends(get_report_payment_svc),
) -> TenantStatement:
    # A manager may have multiple leases for a tenant; pick the active one,
    # otherwise the most recently created.
    leases, _ = lease_svc.get_all(current_user.id, skip=0, limit=500)
    owned = [l for l in leases if str(l.get("tenant_id")) == str(tenant_id)]
    if not owned:
        raise HTTPException(status_code=404, detail="Tenant not found")

    lease = next((l for l in owned if l.get("effective_status") == "active"), owned[0])

    payments = (
        supabase.table("payments")
        .select("id, amount, payment_method, status, payment_type, paid_date, created_at")
        .eq("lease_id", str(lease.get("id")))
        .order("created_at", desc=True)
        .execute()
    )
    history = [
        StatementPayment(
            id=str(p.get("id")),
            date=str(p.get("paid_date") or p.get("created_at")),
            amount=float(p.get("amount", 0)),
            method=p.get("payment_method"),
            status=str(p.get("status")),
            type=p.get("payment_type"),
        )
        for p in (payments.data or [])
    ]

    renewals: list[RenewalHistoryItem] = []
    try:
        renewal = (
            supabase.table("renewal_history")
            .select("previous_end_date, new_end_date, monthly_rent, notes, created_at")
            .eq("lease_id", str(lease.get("id")))
            .order("created_at", desc=True)
            .execute()
        )
        renewals = [
            RenewalHistoryItem(
                previous_end_date=str(r.get("previous_end_date")) if r.get("previous_end_date") else None,
                new_end_date=str(r.get("new_end_date")) if r.get("new_end_date") else None,
                monthly_rent=float(r.get("monthly_rent")) if r.get("monthly_rent") is not None else None,
                notes=r.get("notes"),
                renewed_at=str(r.get("created_at")) if r.get("created_at") else None,
            )
            for r in (renewal.data or [])
        ]
    except Exception:
        # renewal_history table may not be migrated yet; statement still works.
        logger.warning("renewal_history unavailable; returning empty renewal history")
        renewals = []

    return TenantStatement(
        lease_id=str(lease.get("id")),
        tenant_id=str(lease.get("tenant_id")),
        tenant_name=lease.get("tenant_name"),
        tenant_email=lease.get("tenant_email"),
        tenant_phone=lease.get("tenant_phone"),
        property_title=lease.get("property_title"),
        unit_label=lease.get("unit_label"),
        start_date=str(lease.get("start_date")) if lease.get("start_date") else None,
        end_date=str(lease.get("end_date")) if lease.get("end_date") else None,
        status=lease.get("effective_status", "active"),
        monthly_rent=float(lease.get("monthly_rent") or 0),
        expected_rent=float(lease.get("expected_rent") or 0),
        total_paid=float(lease.get("total_paid") or 0),
        balance_due=float(lease.get("balance_due") or 0),
        tenant_credit=float(lease.get("tenant_credit") or 0),
        is_overdue=bool(lease.get("balance_due", 0) > 0),
        payment_history=history,
        renewal_history=renewals,
    )


@router.get("/rent-collection", response_model=RentCollectionResponse)
def rent_collection_report(
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(_get_report_supabase),
    lease_svc: LeaseService = Depends(get_report_lease_svc),
) -> RentCollectionResponse:
    leases, _ = lease_svc.get_all(current_user.id, skip=0, limit=500)

    total_expected = sum(float(l.get("expected_rent") or 0) for l in leases)
    total_collected = sum(float(l.get("total_paid") or 0) for l in leases)
    total_outstanding = sum(float(l.get("balance_due") or 0) for l in leases)
    total_credit = sum(float(l.get("tenant_credit") or 0) for l in leases)

    paid_in_full = sum(1 for l in leases if float(l.get("balance_due") or 0) <= 0)
    with_balance = sum(1 for l in leases if float(l.get("balance_due") or 0) > 0)
    total = len(leases) or 1

    collection_pct = round((total_collected / total_expected) * 100, 2) if total_expected > 0 else 0.0

    return RentCollectionResponse(
        period_from=from_date,
        period_to=to_date,
        total_expected=round(total_expected, 2),
        total_collected=round(total_collected, 2),
        total_outstanding=round(total_outstanding, 2),
        total_tenant_credit=round(total_credit, 2),
        collection_percentage=collection_pct,
        tenants_paid_in_full=paid_in_full,
        tenants_with_balance=with_balance,
        total_tenants=len(leases),
    )


@router.get("/summary", response_model=FinancialSummary)
def financial_summary(
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(_get_report_supabase),
    lease_svc: LeaseService = Depends(get_report_lease_svc),
) -> FinancialSummary:
    leases, _ = lease_svc.get_all(current_user.id, skip=0, limit=500)

    total_expected = sum(float(l.get("expected_rent") or 0) for l in leases)
    total_collected = sum(float(l.get("total_paid") or 0) for l in leases)
    total_outstanding = sum(float(l.get("balance_due") or 0) for l in leases)
    total_credit = sum(float(l.get("tenant_credit") or 0) for l in leases)

    active = sum(1 for l in leases if l.get("effective_status") == "active")
    expired = sum(1 for l in leases if l.get("effective_status") == "expired")
    terminated = sum(1 for l in leases if l.get("effective_status") == "terminated")
    total = len(leases) or 1

    return FinancialSummary(
        total_expected=round(total_expected, 2),
        total_collected=round(total_collected, 2),
        total_outstanding=round(total_outstanding, 2),
        total_tenant_credit=round(total_credit, 2),
        active_tenancies=active,
        expired_tenancies=expired,
        terminated_tenancies=terminated,
        occupancy_rate=round((active / total) * 100, 2),
    )


# ---------------------------------------------------------------------------
# Legacy-compatible endpoints (kept for the mobile report tabs)
# ---------------------------------------------------------------------------

class DuePaymentItem(BaseModel):
    lease_id: str
    tenant_name: str | None = None
    tenant_phone: str | None = None
    property_title: str | None = None
    unit_label: str | None = None
    amount_due: float
    balance_due: float
    status: str
    overdue: bool


class DuePaymentsResponse(BaseModel):
    items: list[DuePaymentItem]
    total: int
    filter: str


@router.get("/due-payments", response_model=DuePaymentsResponse)
def due_payments_report(
    filter: str = Query("overdue", alias="filter"),
    property_id: str | None = Query(None),
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(_get_report_supabase),
    lease_svc: LeaseService = Depends(get_report_lease_svc),
) -> DuePaymentsResponse:
    leases, _ = lease_svc.get_all(current_user.id, skip=0, limit=500)
    if property_id:
        leases = [l for l in leases if str(l.get("property_id")) == str(property_id)]

    owed = [l for l in leases if float(l.get("balance_due") or 0) > 0]

    if filter == "paid":
        owed = [l for l in leases if float(l.get("balance_due") or 0) <= 0]

    items = [
        DuePaymentItem(
            lease_id=str(l.get("id")),
            tenant_name=l.get("tenant_name"),
            tenant_phone=l.get("tenant_phone"),
            property_title=l.get("property_title"),
            unit_label=l.get("unit_label"),
            amount_due=float(l.get("balance_due") or 0),
            balance_due=float(l.get("balance_due") or 0),
            status=l.get("effective_status", "active"),
            overdue=float(l.get("balance_due") or 0) > 0,
        )
        for l in owed
    ]
    items.sort(key=lambda x: x.balance_due, reverse=True)
    return DuePaymentsResponse(items=items, total=len(items), filter=filter)


class PaymentHistoryItem(BaseModel):
    id: str
    date: str | None = None
    tenant_name: str | None = None
    property_title: str | None = None
    amount: float
    method: str | None = None
    status: str
    lease_id: str


class PaymentHistorySummary(BaseModel):
    total_collected: float
    payment_count: int
    period_from: str | None = None
    period_to: str | None = None


class PaymentHistoryResponse(BaseModel):
    items: list[PaymentHistoryItem]
    summary: PaymentHistorySummary
    total: int


@router.get("/payment-history", response_model=PaymentHistoryResponse)
def payment_history_report(
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    current_user: CurrentUser = Depends(require_active_user),
    supabase: Client = Depends(_get_report_supabase),
    lease_svc: LeaseService = Depends(get_report_lease_svc),
) -> PaymentHistoryResponse:
    leases, _ = lease_svc.get_all(current_user.id, skip=0, limit=500)
    lease_ids = [str(l.get("id")) for l in leases]

    if not lease_ids:
        return PaymentHistoryResponse(
            items=[],
            summary=PaymentHistorySummary(total_collected=0, payment_count=0),
            total=0,
        )

    query = (
        supabase.table("payments")
        .select("id, lease_id, amount, payment_method, status, paid_date, created_at")
        .in_("lease_id", lease_ids)
        .order("created_at", desc=True)
    )
    if from_date:
        query = query.gte("created_at", from_date)
    if to_date:
        query = query.lte("created_at", to_date)

    result = query.execute()
    payments = result.data if result.data else []

    lease_meta: dict[str, dict[str, Any]] = {
        str(l.get("id")): {
            "tenant_name": l.get("tenant_name"),
            "property_title": l.get("property_title"),
        }
        for l in leases
    }

    items: list[PaymentHistoryItem] = []
    total_collected = 0.0
    for p in payments:
        lid = str(p.get("lease_id"))
        meta = lease_meta.get(lid, {})
        if str(p.get("status")) in ("confirmed", "completed"):
            total_collected += float(p.get("amount", 0) or 0)
        items.append(
            PaymentHistoryItem(
                id=str(p.get("id")),
                date=str(p.get("paid_date") or p.get("created_at")),
                tenant_name=meta.get("tenant_name"),
                property_title=meta.get("property_title"),
                amount=float(p.get("amount", 0) or 0),
                method=p.get("payment_method"),
                status=str(p.get("status")),
                lease_id=lid,
            )
        )

    return PaymentHistoryResponse(
        items=items,
        summary=PaymentHistorySummary(
            total_collected=round(total_collected, 2),
            payment_count=len(items),
            period_from=from_date,
            period_to=to_date,
        ),
        total=len(items),
    )
