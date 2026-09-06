import logging
import time as _time
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from supabase import Client

from models import (
    LeaseCreate,
    LeaseUpdate,
    MaintenanceRequestCreate,
    MaintenanceRequestUpdate,
    PaymentCreate,
    PaymentUpdate,
    PropertyCreate,
    PropertyUpdate,
    TenantCreate,
    TenantUpdate,
)

from .base import BaseService, with_retry
from .boost import BoostService

logger = logging.getLogger(__name__)


_MOBILE_TO_ENUM = {
    "apartment": "Residential",
    "house": "Residential",
    "studio": "Residential",
    "single_room": "Residential",
    "shop": "Office Space",
}


_CATEGORY_TO_ENUM = {
    "residential": "Residential",
    "commercial": "Office Space",
}


def _normalize_property_type(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    if value in ("Residential", "Office Space"):
        return value
    return _MOBILE_TO_ENUM.get(value)


def _normalize_row(row: dict[str, Any], column_map: dict[str, str]) -> dict[str, Any]:
    out = {}
    for k, v in row.items():
        out[k] = v
    for old_name, new_name in column_map.items():
        if old_name in row and new_name not in row:
            out[new_name] = row[old_name]
        elif old_name in row and new_name in row:
            out[new_name] = row[new_name]
    return out


PROPERTY_OLD_TO_NEW: dict[str, str] = {
    "manager_id": "owner_id",
    "district": "state",
    "area": "square_feet",
    "rent_amount": "monthly_rent",
}


def _normalize_property(p: dict[str, Any]) -> dict[str, Any]:
    p = _normalize_row(p, PROPERTY_OLD_TO_NEW)
    # ponytail: rows carry either legacy or new price/size column; coalesce both
    # ways until the schema settles on monthly_rent/square_feet only
    if p.get("monthly_rent") in (None, ""):
        p["monthly_rent"] = p.get("rent_amount")
    if p.get("rent_amount") in (None, ""):
        p["rent_amount"] = p.get("monthly_rent")
    if p.get("square_feet") in (None, ""):
        p["square_feet"] = p.get("area")
    p.setdefault("zip_code", "00000")
    p.setdefault("country", "UG")
    p.setdefault("security_deposit", 0)
    p.setdefault("is_active", True)
    p.setdefault("rent_period", "monthly")
    p.setdefault("area", p.get("square_feet"))
    return p


_REGION_IDS_CACHE: dict[str, tuple[float, list[str]]] = {}


def _cached_region_ids(country: str, supabase: Client) -> list[str]:
    now = _time.monotonic()
    hit = _REGION_IDS_CACHE.get(country)
    if hit and now - hit[0] < 300:
        return hit[1]
    resp = supabase.table("regions").select("id").eq("country_id", country).is_("deprecated_at", "null").execute()
    ids = [r["id"] for r in (resp.data or [])]
    _REGION_IDS_CACHE[country] = (now, ids)
    return ids


def _enrich_with_boost_info(
    props: list[dict[str, Any]], supabase: Client
) -> list[dict[str, Any]]:
    from datetime import UTC, datetime

    if not props:
        return props

    property_ids = [str(p["id"]) for p in props if p.get("id")]
    if not property_ids:
        return props

    now = datetime.now(UTC).isoformat()
    result = (
        supabase.table("property_boosts")
        .select("property_id,expires_at,duration_days")
        .in_("property_id", property_ids)
        .eq("status", "active")
        .gt("expires_at", now)
        .execute()
    )
    boosts_by_property: dict[str, dict] = {}
    for b in (result.data or []):
        pid = b.get("property_id")
        if pid and pid not in boosts_by_property:
            boosts_by_property[pid] = b

    for p in props:
        pid = str(p.get("id", ""))
        boost = boosts_by_property.get(pid)
        if boost:
            expires_at = boost.get("expires_at", "")
            dur = boost.get("duration_days", 0)
            try:
                expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                remaining = (expires_dt - datetime.now(UTC)).days
            except (ValueError, TypeError):
                remaining = 0
            p["is_boosted"] = True
            p["boosted_until"] = expires_at
            p["boost_days_remaining"] = max(0, remaining)
            p["boost_package_label"] = f"{dur} Days"
        else:
            p["is_boosted"] = False
            p["boosted_until"] = None
            p["boost_days_remaining"] = 0
            p["boost_package_label"] = None

    return props


def _enrich_with_manager_contact(
    props: list[dict[str, Any]], supabase: Client
) -> list[dict[str, Any]]:
    owner_ids = {str(p["owner_id"]) for p in props if p.get("owner_id")}
    if not owner_ids:
        return props
    resp = (
        supabase.table("profiles")
        .select("user_id, email, phone")
        .in_("user_id", list(owner_ids))
        .execute()
    )
    profiles = {str(p["user_id"]): p for p in (resp.data or [])}
    for p in props:
        oid = str(p.get("owner_id", ""))
        if oid in profiles:
            if not p.get("manager_email"):
                p["manager_email"] = profiles[oid].get("email")
            if not p.get("manager_phone"):
                p["manager_phone"] = profiles[oid].get("phone")
    return props


LEASE_OLD_TO_NEW: dict[str, str] = {
    "manager_id": "owner_id",
    "rent_amount": "monthly_rent",
    "rent_start_date": "start_date",
    "rent_end_date": "end_date",
}


def _normalize_lease_status(value: str | None) -> str:
    if value in ("terminated", "expired"):
        return value
    return "active"


def _normalize_lease(l: dict[str, Any]) -> dict[str, Any]:
    l = _normalize_row(l, LEASE_OLD_TO_NEW)
    l.setdefault("security_deposit", 0)
    l.setdefault("rent_effective_date", None)
    l["status"] = _normalize_lease_status(l.get("status"))
    return l


def _rent_coverage_days(amount, monthly_rent) -> int:
    """Coverage (in 30-day months) a payment buys at the given rent.

    coverage_days = FLOOR(amount * 30 / monthly_rent). Uses the lease's
    monthly_rent at write time so later rent edits never change a payment's
    frozen coverage. Returns 0 for missing/invalid/non-positive inputs.
    """
    try:
        amount = Decimal(str(amount))
        rent = Decimal(str(monthly_rent))
    except (TypeError, ValueError, InvalidOperation):
        return 0
    if amount <= 0 or rent <= 0:
        return 0
    return int((amount * 30) // rent)


def _compute_rent_financials(
    rent_effective_date: Any,
    payments: list[dict[str, Any]],
    monthly_rent: Any,
    start_date: Any = None,
    end_date: Any = None,
    today: date | None = None,
) -> dict[str, Any]:
    """Money-ledger rent position (billing anchor + money) — source of truth.

    rent_effective_date is the PERMANENT billing anchor: from that day the
    system accrues rent every day (daily rate = monthly_rent / 30) forever,
    whether or not the tenant has paid. Payments buy coverage; they never
    move the billing calendar.

      * rent_accrued   = daily rate * elapsed days since the anchor (money
                         due by the billing schedule up to today).
      * total_paid     = sum of confirmed/completed RENT payments only.
      * advance_amount = max(0, total_paid - rent_accrued)   (credit, UGX).
      * arrears_amount = max(0, rent_accrued - total_paid)   (UGX).
      * is_overdue     = arrears_amount > 0.

    Day fields (paid_until_date, rent_days_remaining, rent_days_in_arrears)
    are DERIVED DISPLAY VALUES ONLY — never a second source of truth:

      * paid_until_date      = anchor + floor(total_paid / daily) ("covered until").
      * rent_days_in_arrears = max(0, elapsed - covered_days).
      * rent_days_remaining  = max(0, covered_days - elapsed).

    next_payment_due_date = the next 30-day billing boundary from the anchor
    (anchor + 30 * ceil(elapsed / 30)) — payment-independent.

    coverage_days remains computed and stored per payment (see
    _rent_coverage_days / PaymentService) and is displayed to users to explain
    what each payment purchased, but it NEVER drives arrears/advance/overdue.

    contract_rent = monthly_rent * round(term_days / 30) — informational ONLY,
    never used in arrears or coverage math. Returns an all-None position when
    no anchor exists.
    """
    result: dict[str, Any] = {
        "rent_effective_date": None,
        "paid_until_date": None,
        "rent_days_remaining": None,
        "rent_days_in_arrears": None,
        "next_payment_due_date": None,
        "total_paid": 0.0,
        "rent_accrued": None,
        "arrears_amount": None,
        "advance_amount": None,
        "contract_rent": None,
        "is_overdue": None,
    }

    try:
        monthly_rent_f = float(monthly_rent or 0)
    except (TypeError, ValueError):
        monthly_rent_f = 0.0

    # Money actually received is anchor-independent; only the position fields
    # (accrued, arrears, advance, overdue, day displays) need an anchor.
    rent_payments = [
        p
        for p in payments
        if p.get("payment_type") in (None, "rent")
        and p.get("status") in (None, "confirmed", "completed")
    ]
    total_paid = sum(float(p.get("amount") or 0) for p in rent_payments)
    result["total_paid"] = round(total_paid, 2)

    if start_date and end_date:
        try:
            s = start_date if isinstance(start_date, date) else date.fromisoformat(str(start_date)[:10])
            e = end_date if isinstance(end_date, date) else date.fromisoformat(str(end_date)[:10])
            term_days = (e - s).days
            if term_days > 0:
                result["contract_rent"] = round(monthly_rent_f * round(term_days / 30), 2)
        except (TypeError, ValueError):
            pass

    try:
        if isinstance(rent_effective_date, date):
            eff = rent_effective_date
        else:
            eff = date.fromisoformat(str(rent_effective_date)[:10])
    except (TypeError, ValueError):
        return result

    today = today or date.today()
    elapsed = max(0, (today - eff).days)

    rent_accrued = round(monthly_rent_f * elapsed / 30.0, 2)
    balance = round(total_paid - rent_accrued, 2)
    arrears_amount = round(max(0.0, -balance), 2)
    advance_amount = round(max(0.0, balance), 2)

    result["rent_effective_date"] = eff.isoformat()
    result["rent_accrued"] = rent_accrued
    result["arrears_amount"] = arrears_amount
    result["advance_amount"] = advance_amount
    result["is_overdue"] = arrears_amount > 0

    # Derived display days ("covered until") — from the MONEY position.
    if monthly_rent_f > 0:
        covered_days = _rent_coverage_days(total_paid, monthly_rent_f)
        result["paid_until_date"] = (eff + timedelta(days=covered_days)).isoformat()
        result["rent_days_remaining"] = max(0, covered_days - elapsed)
        result["rent_days_in_arrears"] = max(0, elapsed - covered_days)
    else:
        covered_days = 0
        result["paid_until_date"] = eff.isoformat()
        result["rent_days_remaining"] = 0
        result["rent_days_in_arrears"] = 0

    # The next payment falls due when the rent already paid runs out, so this
    # tracks coverage rather than the anchor's 30-day grid.
    #
    # The previous formula (eff + 30 * ceil(elapsed / 30)) ignored payments
    # entirely. On the anchor day itself it evaluated to the anchor, so a
    # tenant who had just paid a full month saw "Paid Until 4 Oct" beside
    # "Next Payment Due 4 Sep"; and a tenant who paid two months still saw a
    # due date one month out.
    if covered_days >= elapsed:
        # Paid up — the next payment is due the day cover expires.
        next_due = eff + timedelta(days=covered_days)
    else:
        # Already in arrears: payment is due now, not at some future boundary.
        next_due = today
    result["next_payment_due_date"] = next_due.isoformat()

    return result



def _clean_contact(value: Any) -> str | None:
    """Normalize a contact field: strip whitespace, treat empties as missing."""
    if value is None:
        return None
    s = str(value).strip()
    return s or None


def _enrich_leases(
    leases: list[dict[str, Any]], supabase: Client
) -> list[dict[str, Any]]:
    if not leases:
        return leases

    tenant_ids = {str(l["tenant_id"]) for l in leases if l.get("tenant_id")}
    property_ids = {str(l["property_id"]) for l in leases if l.get("property_id")}
    lease_ids = {str(l["id"]) for l in leases if l.get("id")}

    tenants_by_id: dict[str, dict[str, Any]] = {}
    if tenant_ids:
        resp = (
            supabase.table("tenants")
            .select("id, first_name, last_name, phone, email")
            .in_("id", list(tenant_ids))
            .execute()
        )
        for t in resp.data or []:
            tid = str(t["id"])
            first = t.get("first_name") or ""
            last = t.get("last_name") or ""
            name = f"{first} {last}".strip()
            tenants_by_id[tid] = {
                "tenant_name": name or None,
                "tenant_phone": t.get("phone"),
                "tenant_email": t.get("email"),
            }

    props_by_id: dict[str, dict[str, Any]] = {}
    if property_ids:
        resp = (
            supabase.table("properties")
            .select("id, title, images, manager_phone, manager_email")
            .in_("id", list(property_ids))
            .execute()
        )
        for p in resp.data or []:
            images = p.get("images") or []
            props_by_id[str(p["id"])] = {
                "title": p.get("title"),
                "image": images[0] if images else None,
                "manager_phone": p.get("manager_phone"),
                "manager_email": p.get("manager_email"),
            }

    owner_ids = {str(l["owner_id"]) for l in leases if l.get("owner_id")}
    managers_by_id: dict[str, dict[str, Any]] = {}
    if owner_ids:
        resp = (
            supabase.table("profiles")
            .select("user_id, full_name, phone, email")
            .in_("user_id", list(owner_ids))
            .execute()
        )
        for m in resp.data or []:
            mid = str(m["user_id"])
            managers_by_id[mid] = {
                "manager_name": _clean_contact(m.get("full_name")),
                "manager_phone": _clean_contact(m.get("phone")),
                "manager_email": _clean_contact(m.get("email")),
            }

    payments_by_lease: dict[str, list[dict[str, Any]]] = {}
    if lease_ids:
        resp = (
            supabase.table("payments")
            .select(
                "lease_id, amount, status, paid_date, payment_method, "
                "payment_type, coverage_days, frozen_monthly_rent, created_at"
            )
            .in_("lease_id", list(lease_ids))
            .in_("status", ["confirmed", "completed"])
            .execute()
        )
        for p in resp.data or []:
            payments_by_lease.setdefault(str(p["lease_id"]), []).append(p)

    for l in leases:
        tid = str(l.get("tenant_id", ""))
        pid = str(l.get("property_id", ""))
        lid = str(l.get("id", ""))

        if tid in tenants_by_id:
            l.update(tenants_by_id[tid])
        else:
            l.setdefault("tenant_name", None)
            l.setdefault("tenant_phone", None)
            l.setdefault("tenant_email", None)

        prop = props_by_id.get(pid) or {}
        l["property_title"] = prop.get("title")
        l["property_image"] = prop.get("image")

        prop_phone = _clean_contact(prop.get("manager_phone"))
        prop_email = _clean_contact(prop.get("manager_email"))
        oid = str(l.get("owner_id", ""))
        profile = managers_by_id.get(oid) or {}
        l["manager_name"] = (
            _clean_contact(profile.get("manager_name"))
            or _clean_contact(l.get("manager_name"))
            or None
        )
        l["manager_phone"] = prop_phone or _clean_contact(profile.get("manager_phone")) or None
        l["manager_email"] = prop_email or _clean_contact(profile.get("manager_email")) or None

        lease_payments = payments_by_lease.get(lid, [])

        try:
            monthly_rent = float(l.get("monthly_rent") or 0)
        except (TypeError, ValueError):
            monthly_rent = 0.0

        stored_status = str(l.get("status") or "active")
        if stored_status == "terminated":
            effective_status = "terminated"
        else:
            end = l.get("end_date")
            now = date.today()
            if end and str(end) < now.isoformat():
                effective_status = "expired"
            else:
                effective_status = stored_status if stored_status in ("active", "expired", "terminated") else "active"
        l["effective_status"] = effective_status

        today = date.today()
        start = l.get("start_date")
        end = l.get("end_date")
        total_days = 0
        elapsed_days = 0
        remaining_days = 0
        if start and end:
            try:
                s = date.fromisoformat(str(start)[:10]) if not isinstance(start, date) else start
                e = date.fromisoformat(str(end)[:10]) if not isinstance(end, date) else end
                total_days = (e - s).days
                elapsed_days = (today - s).days
                remaining_days = max(0, (e - today).days)
            except (TypeError, ValueError):
                pass
        l["tenancy_total_days"] = max(1, total_days)
        l["tenancy_elapsed_days"] = max(0, elapsed_days)
        l["tenancy_remaining_days"] = remaining_days
        l["tenancy_progress_pct"] = round(min(100, max(0, elapsed_days / max(1, total_days) * 100)), 1)

        last_payment = None
        for p in lease_payments:
            if p.get("paid_date"):
                if last_payment is None or p["paid_date"] > last_payment["paid_date"]:
                    last_payment = p
        l["last_payment_date"] = last_payment.get("paid_date") if last_payment else None
        l["last_payment_amount"] = (
            float(last_payment["amount"]) if last_payment else None
        )
        l["last_payment_method"] = (
            last_payment.get("payment_method") if last_payment else None
        )

        l.update(
            _compute_rent_financials(
                l.get("rent_effective_date"),
                lease_payments,
                monthly_rent,
                start_date=l.get("start_date"),
                end_date=l.get("end_date"),
            )
        )
        # Deprecated aliases — kept for one release. The money-ledger
        # canonical fields (rent_accrued/arrears_amount/advance_amount) are
        # the source of truth; these exist only for old API consumers.
        l["expected_rent"] = l.get("rent_accrued")
        l["balance_due"] = l.get("arrears_amount")
        l["tenant_credit"] = l.get("advance_amount")

    return leases


PAYMENT_OLD_TO_NEW: dict[str, str] = {
    "tenancy_id": "lease_id",
    "period_end": "due_date",
    "period_start": "paid_date",
}


def _normalize_payment(p: dict[str, Any]) -> dict[str, Any]:
    p = _normalize_row(p, PAYMENT_OLD_TO_NEW)
    p.setdefault("payment_type", "rent")
    return p


class PropertyService(BaseService):
    def __init__(self, supabase: Client):
        super().__init__(supabase)
        self._table = "properties"

    def _resolve_property_type_from_slug(self, payload: dict[str, Any]) -> None:
        """If property_type_slug is present, derive property_type ENUM from catalog."""
        slug = payload.get("property_type_slug")
        if not slug:
            return
        resp = (
            self.supabase.table("property_types")
            .select("category_slug")
            .eq("slug", slug)
            .limit(1)
            .execute()
        )
        if resp.data:
            cat = resp.data[0]["category_slug"]
            payload["property_type"] = _CATEGORY_TO_ENUM.get(cat, "Residential")
        else:
            normalized = _normalize_property_type(payload.get("property_type"))
            if normalized:
                payload["property_type"] = normalized

    @with_retry
    def get_all(
        self, owner_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict[str, Any]], int]:
        count_resp = (
            self.supabase.table(self._table)
            .select("*", count="exact")
            .eq("owner_id", str(owner_id))
            .execute()
        )
        total = count_resp.count if hasattr(count_resp, "count") else 0

        response = (
            self.table.select("*")
            .eq("owner_id", str(owner_id))
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        items = [_normalize_property(r) for r in (response.data or [])]
        items = _enrich_with_manager_contact(items, self.supabase)
        items = _enrich_with_boost_info(items, self.supabase)
        return items, total

    @with_retry
    def get_all_for_tenant(
        self, tenant_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict[str, Any]], int]:
        count_resp = (
            self.supabase.table(self._table)
            .select("*", count="exact")
            .eq("tenant_id", str(tenant_id))
            .execute()
        )
        total = count_resp.count if hasattr(count_resp, "count") else 0

        response = (
            self.table.select("*")
            .eq("tenant_id", str(tenant_id))
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return [_normalize_property(r) for r in (response.data or [])], total

    @with_retry
    def get_public_listings(
        self,
        skip: int = 0,
        limit: int = 20,
        state: str | None = None,
        country: str | None = None,
        region_id: str | None = None,
        property_type: str | None = None,
        property_type_slug: str | None = None,
        rent_period: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        region_ids_for_country: list[str] | None = None
        if country:
            region_ids_for_country = _cached_region_ids(country, self.supabase)

        def _filtered(columns: str, count: str | None = None):
            query = self.supabase.table(self._table).select(columns, count=count).eq("is_active", True)
            if state:
                term = f"%{state}%"
                query = query.or_(f"state.ilike.{term},city.ilike.{term}")
            if region_id:
                query = query.eq("region_id", region_id)
            elif region_ids_for_country is not None:
                if region_ids_for_country:
                    query = query.in_("region_id", region_ids_for_country)
                else:
                    # Country has no regions yet — match nothing
                    query = query.eq("region_id", "__none__")
            if property_type:
                query = query.eq("property_type", property_type)
            if property_type_slug:
                query = query.eq("property_type_slug", property_type_slug)
            if min_price is not None:
                query = query.gte("monthly_rent", min_price)
            if max_price is not None:
                query = query.lte("monthly_rent", max_price)
            return query

        count_resp = _filtered("id", count="exact").range(0, 0).execute()
        total = count_resp.count if hasattr(count_resp, "count") else len(count_resp.data or [])

        # Boosted properties rank first (by boost recency), then all others by
        # recency. Active boosts are few, so fetch them fully and paginate only
        # the large non-boosted set in SQL instead of loading the whole table.
        boost_map = BoostService(self.supabase).get_active_boost_map()

        page_rows: list[dict[str, Any]] = []
        non_skip, non_limit = skip, limit
        boost_ids: list[str] = []
        if boost_map:
            boost_ids = list(boost_map)
            boosted_query = _filtered("*")
            boosted_query = boosted_query.in_("id", boost_ids)
            boosted_resp = boosted_query.execute()
            by_id = {r["id"]: r for r in (boosted_resp.data or [])}
            boosted_rows = [
                by_id[i] for i in sorted(boost_ids, key=lambda i: boost_map[i], reverse=True)
                if i in by_id
            ]
            if skip < len(boosted_rows):
                page_rows = boosted_rows[skip:skip + limit]
                non_skip, non_limit = 0, limit - len(page_rows)
            else:
                non_skip, non_limit = skip - len(boosted_rows), limit

        if non_limit > 0:
            query = _filtered("*").order("created_at", desc=True)
            if boost_ids:
                query = query.not_.in_("id", boost_ids)
            page_resp = (
                query
                .range(non_skip, non_skip + non_limit - 1)
                .execute()
            )
            page_rows += page_resp.data or []

        page_rows = [_normalize_property(r) for r in page_rows]
        page_rows = _enrich_with_manager_contact(page_rows, self.supabase)
        page_rows = _enrich_with_boost_info(page_rows, self.supabase)
        return page_rows, total

    @with_retry
    def get_by_id(self, property_id: UUID, owner_id: UUID) -> dict[str, Any] | None:
        response = (
            self.table.select("*")
            .eq("id", str(property_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        row = response.data[0] if response.data else None
        if not row:
            return None
        prop = _normalize_property(row)
        enriched = _enrich_with_manager_contact([prop], self.supabase)
        enriched = _enrich_with_boost_info(enriched, self.supabase)
        return enriched[0]

    @with_retry
    def get_by_id_public(self, property_id: UUID) -> dict[str, Any] | None:
        response = (
            self.table.select("*")
            .eq("id", str(property_id))
            .execute()
        )
        row = response.data[0] if response.data else None
        if not row:
            return None
        prop = _normalize_property(row)
        enriched = _enrich_with_manager_contact([prop], self.supabase)
        enriched = _enrich_with_boost_info(enriched, self.supabase)
        return enriched[0]

    @with_retry
    def create(self, data: PropertyCreate, owner_id: UUID) -> dict[str, Any]:
        payload = data.model_dump(exclude_none=True, mode="json")
        payload["owner_id"] = str(owner_id)
        if not payload.get("zip_code"):
            payload["zip_code"] = ""
        self._resolve_property_type_from_slug(payload)
        normalized = _normalize_property_type(payload.get("property_type"))
        if normalized:
            payload["property_type"] = normalized
        response = self.table.insert(payload).execute()
        return response.data[0]

    @with_retry
    def update(
        self, property_id: UUID, data: PropertyUpdate, owner_id: UUID
    ) -> dict[str, Any] | None:
        payload = data.model_dump(exclude_none=True, mode="json")
        self._resolve_property_type_from_slug(payload)
        normalized = _normalize_property_type(payload.get("property_type"))
        if normalized:
            payload["property_type"] = normalized
        if not payload:
            return self.get_by_id(property_id, owner_id)
        response = (
            self.table.update(payload)
            .eq("id", str(property_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        return response.data[0] if response.data else None

    @with_retry
    def delete(self, property_id: UUID, owner_id: UUID) -> bool:
        response = (
            self.table.delete()
            .eq("id", str(property_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        return bool(response.data)


class TenantService(BaseService):
    def __init__(self, supabase: Client):
        super().__init__(supabase)
        self._table = "tenants"

    @with_retry
    def get_all(
        self,
        owner_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        search: str | None = None,
        has_user_account: bool | None = None,
        created_from: date | None = None,
        created_to: date | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        query = self.supabase.table(self._table).select("*", count="exact").eq("owner_id", str(owner_id))

        if status:
            query = query.eq("status", status)
        if search:
            query = query.or_(f"first_name.ilike.%{search}%,last_name.ilike.%{search}%,email.ilike.%{search}%")
        if has_user_account is not None:
            if has_user_account:
                query = query.not_.is_("user_id", "null")
            else:
                query = query.is_("user_id", "null")
        if created_from:
            query = query.gte("created_at", created_from.isoformat())
        if created_to:
            query = query.lte("created_at", created_to.isoformat())

        count_resp = query.execute()
        total = count_resp.count if hasattr(count_resp, "count") else 0

        data_query = (
            self.table.select("*")
            .eq("owner_id", str(owner_id))
        )
        if status:
            data_query = data_query.eq("status", status)
        if search:
            data_query = data_query.or_(f"first_name.ilike.%{search}%,last_name.ilike.%{search}%,email.ilike.%{search}%")
        if has_user_account is not None:
            if has_user_account:
                data_query = data_query.not_.is_("user_id", "null")
            else:
                data_query = data_query.is_("user_id", "null")
        if created_from:
            data_query = data_query.gte("created_at", created_from.isoformat())
        if created_to:
            data_query = data_query.lte("created_at", created_to.isoformat())

        response = (
            data_query
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return response.data or [], total

    @with_retry
    def get_by_id(self, tenant_id: UUID, owner_id: UUID) -> dict[str, Any] | None:
        response = (
            self.table.select("*")
            .eq("id", str(tenant_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        return response.data[0] if response.data else None

    @with_retry
    def get_by_id_for_manager(
        self, tenant_id: UUID, manager_id: UUID
    ) -> dict[str, Any] | None:
        owned = (
            self.table.select("*")
            .eq("id", str(tenant_id))
            .eq("owner_id", str(manager_id))
            .execute()
        )
        if owned.data:
            return owned.data[0]
        lease_link = (
            self.supabase.table("leases")
            .select("id")
            .eq("owner_id", str(manager_id))
            .eq("tenant_id", str(tenant_id))
            .limit(1)
            .execute()
        )
        if lease_link.data:
            linked = (
                self.table.select("*").eq("id", str(tenant_id)).execute()
            )
            return linked.data[0] if linked.data else None
        return None

    @with_retry
    def create(self, data: TenantCreate, owner_id: UUID) -> dict[str, Any]:
        payload = data.model_dump(exclude_none=True, mode="json")
        payload["owner_id"] = str(owner_id)
        response = self.table.insert(payload).execute()
        return response.data[0]

    @with_retry
    def update(
        self, tenant_id: UUID, data: TenantUpdate, owner_id: UUID
    ) -> dict[str, Any] | None:
        payload = data.model_dump(exclude_none=True, mode="json")
        if not payload:
            return self.get_by_id(tenant_id, owner_id)
        response = (
            self.table.update(payload)
            .eq("id", str(tenant_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        return response.data[0] if response.data else None

    @with_retry
    def delete(self, tenant_id: UUID, owner_id: UUID) -> bool:
        response = (
            self.table.delete()
            .eq("id", str(tenant_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        return bool(response.data)


class LeaseService(BaseService):
    def __init__(self, supabase: Client):
        super().__init__(supabase)
        self._table = "leases"

    @with_retry
    def get_all_for_tenant(
        self, tenant_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict[str, Any]], int]:
        count_resp = (
            self.supabase.table(self._table)
            .select("*", count="exact")
            .eq("tenant_id", str(tenant_id))
            .execute()
        )
        total = count_resp.count if hasattr(count_resp, "count") else 0

        response = (
            self.table.select("*")
            .eq("tenant_id", str(tenant_id))
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        leases = _enrich_leases(
            [_normalize_lease(r) for r in (response.data or [])], self.supabase
        )
        return leases, total

    @with_retry
    def get_all(
        self, owner_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict[str, Any]], int]:
        count_resp = (
            self.supabase.table(self._table)
            .select("*", count="exact")
            .eq("owner_id", str(owner_id))
            .execute()
        )
        total = count_resp.count if hasattr(count_resp, "count") else 0

        response = (
            self.table.select("*")
            .eq("owner_id", str(owner_id))
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        leases = _enrich_leases(
            [_normalize_lease(r) for r in (response.data or [])], self.supabase
        )
        return leases, total

    @with_retry
    def get_by_id(self, lease_id: UUID, owner_id: UUID) -> dict[str, Any] | None:
        response = (
            self.table.select("*")
            .eq("id", str(lease_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        row = response.data[0] if response.data else None
        if not row:
            return None
        return _enrich_leases([_normalize_lease(row)], self.supabase)[0]

    @with_retry
    def get_by_id_for_tenant(self, lease_id: UUID, tenant_id: UUID) -> dict[str, Any] | None:
        response = (
            self.table.select("*")
            .eq("id", str(lease_id))
            .eq("tenant_id", str(tenant_id))
            .execute()
        )
        row = response.data[0] if response.data else None
        if not row:
            return None
        return _enrich_leases([_normalize_lease(row)], self.supabase)[0]

    @with_retry
    def create(self, data: LeaseCreate, owner_id: UUID) -> dict[str, Any]:
        payload = data.model_dump(exclude_none=True, mode="json")
        payload["owner_id"] = str(owner_id)

        # Inherit the currency the property was listed in. Without this the
        # lease takes the UGX column default, and every payment and receipt
        # under it reports UGX no matter how the listing was priced.
        if not payload.get("currency") and payload.get("property_id"):
            try:
                prop = (
                    self.supabase.table("properties")
                    .select("rent_currency")
                    .eq("id", str(payload["property_id"]))
                    .limit(1)
                    .execute()
                )
                row = prop.data[0] if isinstance(prop.data, list) and prop.data else None
                code = row.get("rent_currency") if isinstance(row, dict) else None
                if isinstance(code, str) and code.strip():
                    payload["currency"] = code.strip().upper()
            except Exception:
                logger.warning(
                    "Could not read property currency for lease creation; "
                    "falling back to the column default",
                    exc_info=True,
                )

        response = self.table.insert(payload).execute()
        raw = response.data[0]
        lease = _enrich_leases([_normalize_lease(raw)], self.supabase)[0]
        if raw.get("status") == "active":
            self._sync_property_status(raw.get("property_id"))
        return lease

    @with_retry
    def update(
        self, lease_id: UUID, data: LeaseUpdate, owner_id: UUID
    ) -> dict[str, Any] | None:
        payload = data.model_dump(exclude_none=True, mode="json")
        if not payload:
            return self.get_by_id(lease_id, owner_id)
        response = (
            self.table.update(payload)
            .eq("id", str(lease_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        if not response.data:
            return None
        lease = _enrich_leases([_normalize_lease(response.data[0])], self.supabase)[0]
        self._sync_property_status(lease.get("property_id"))
        return lease

    @with_retry
    def delete(self, lease_id: UUID, owner_id: UUID) -> bool:
        row = (
            self.supabase.table(self._table)
            .select("property_id")
            .eq("id", str(lease_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        response = (
            self.table.delete()
            .eq("id", str(lease_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        if not response.data:
            return False
        if row.data:
            self._sync_property_status(row.data[0].get("property_id"))
        return True

    @with_retry
    def terminate(
        self,
        lease_id: UUID,
        owner_id: UUID,
        reason: str | None = None,
    ) -> dict[str, Any]:
        """Terminate a lease: mark it terminated, record the date, and release the property."""
        today = date.today().isoformat()
        response = (
            self.table.update(
                {
                    "status": "terminated",
                    "termination_date": today,
                    "termination_reason": reason,
                }
            )
            .eq("id", str(lease_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        if not response.data:
            raise PermissionError("Lease not found or not authorized")
        lease = _enrich_leases([_normalize_lease(response.data[0])], self.supabase)[0]
        self._sync_property_status(lease.get("property_id"))
        return lease

    def _sync_property_status(self, property_id: Any) -> None:
        """Mark the property occupied while a tenant is assigned, else available."""
        if not property_id:
            return
        try:
            current = (
                self.supabase.table("properties")
                .select("status")
                .eq("id", str(property_id))
                .execute()
            )
            if not current.data:
                return
            if current.data[0].get("status") == "inactive":
                return
            assigned = (
                self.supabase.table("leases")
                .select("id")
                .eq("property_id", str(property_id))
                .neq("status", "terminated")
                .limit(1)
                .execute()
            )
            new_status = "occupied" if assigned.data else "available"
            if current.data[0].get("status") != new_status:
                self.supabase.table("properties").update({"status": new_status}).eq(
                    "id", str(property_id)
                ).execute()
        except Exception:
            logger.warning(
                "Failed to sync occupancy status for property %s", property_id, exc_info=True
            )

    @with_retry
    def request_renewal(self, lease_id: UUID, tenant_id: UUID, notes: str | None = None) -> dict[str, Any]:
        lease = self.get_by_id_for_tenant(lease_id, tenant_id)
        if not lease:
            raise ValueError("Lease not found")
        existing = (
            self.supabase.table("renewal_requests")
            .select("*")
            .eq("lease_id", str(lease_id))
            .eq("status", "pending")
            .execute()
        )
        if existing.data:
            raise ValueError("A pending renewal request already exists for this lease")
        payload = {
            "lease_id": str(lease_id),
            "tenant_id": str(tenant_id),
            "status": "pending",
            "notes": notes,
        }
        response = self.supabase.table("renewal_requests").insert(payload).execute()
        return response.data[0]

    @with_retry
    def renew(
        self,
        lease_id: UUID,
        owner_id: UUID,
        new_end_date: date,
        notes: str | None = None,
    ) -> dict[str, Any]:
        """Extend a tenancy in place.

        Renewal keeps the same lease record (same ID and start date), updates
        only the end date, and restores the status to active. It never changes
        the monthly rent and never touches rent accounting (effective date,
        payments, credit, or arrears). Each renewal is recorded in the
        renewal_history audit trail.
        """
        lease = self.get_by_id(lease_id, owner_id)
        if not lease:
            raise PermissionError("Lease not found or not authorized")

        current_end = lease.get("end_date")
        if current_end is not None:
            try:
                cur_end_d = (
                    current_end
                    if isinstance(current_end, date)
                    else date.fromisoformat(str(current_end)[:10])
                )
            except (TypeError, ValueError):
                cur_end_d = None
            if cur_end_d is not None and new_end_date <= cur_end_d:
                raise ValueError(
                    "New end date must be later than the current lease end date"
                )

        response = (
            self.table.update(
                {
                    "end_date": new_end_date.isoformat(),
                    "status": "active",
                }
            )
            .eq("id", str(lease_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        if not response.data:
            raise PermissionError("Lease not found or not authorized")

        renewal_record = {
            "lease_id": str(lease_id),
            "previous_end_date": (
                current_end.isoformat()
                if isinstance(current_end, date)
                else str(current_end)[:10]
                if current_end
                else None
            ),
            "new_end_date": new_end_date.isoformat(),
            "monthly_rent": (
                float(lease.get("monthly_rent") or 0)
                if lease.get("monthly_rent") is not None
                else None
            ),
            "notes": notes,
            "renewed_by": str(owner_id),
        }
        try:
            self.supabase.table("renewal_history").insert(renewal_record).execute()
        except Exception:
            logger.warning(
                "Failed to record renewal history for lease %s", lease_id, exc_info=True
            )

        return _enrich_leases([_normalize_lease(response.data[0])], self.supabase)[0]

    @with_retry
    def renewal_history(
        self, lease_id: UUID, user_id: UUID
    ) -> list[dict[str, Any]]:
        """List the renewal audit trail for a lease, newest first.

        Authorized for the lease owner/manager or the tenant of the lease.
        Resolves the renewing user's full name from profiles when available.
        """
        lease = self.get_by_id(lease_id, user_id)
        if not lease:
            lease = self.get_by_id_for_tenant(lease_id, user_id)
        if not lease:
            raise PermissionError("Lease not found or not authorized")

        response = (
            self.supabase.table("renewal_history")
            .select("*")
            .eq("lease_id", str(lease_id))
            .order("created_at", desc=True)
            .execute()
        )
        rows = response.data or []
        if not rows:
            return []

        renewed_by_ids = {
            str(r.get("renewed_by")) for r in rows if r.get("renewed_by")
        }
        name_map: dict[str, str | None] = {}
        if renewed_by_ids:
            try:
                prof_resp = (
                    self.supabase.table("profiles")
                    .select("user_id, full_name")
                    .in_("user_id", list(renewed_by_ids))
                    .execute()
                )
                name_map = {
                    str(p.get("user_id")): (p.get("full_name") or "").strip() or None
                    for p in (prof_resp.data or [])
                }
            except Exception:
                pass

        result: list[dict[str, Any]] = []
        for r in rows:
            renewed_by = str(r.get("renewed_by")) if r.get("renewed_by") else None
            result.append(
                {
                    "id": str(r.get("id")) if r.get("id") else None,
                    "previous_end_date": r.get("previous_end_date"),
                    "new_end_date": r.get("new_end_date"),
                    "monthly_rent": r.get("monthly_rent"),
                    "notes": r.get("notes"),
                    "renewed_by": renewed_by,
                    "renewed_by_name": (
                        name_map.get(renewed_by) if renewed_by else None
                    ),
                    "renewed_at": r.get("created_at"),
                }
            )
        return result

    @with_retry
    def set_rent_effective_date(
        self,
        lease_id: UUID,
        owner_id: UUID,
        effective_date: date,
    ) -> dict[str, Any]:
        """Set the rent coverage billing anchor for a lease (once, owner-scoped).

        rent_effective_date is the permanent billing anchor: set once at any
        time (including after rent payments exist, e.g. for legacy leases),
        never changeable afterwards. Raises ValueError if already set so
        callers can return a 400 for a second attempt.
        """
        lease = self.get_by_id(lease_id, owner_id)
        if not lease:
            raise PermissionError("Lease not found or not authorized")
        if lease.get("rent_effective_date"):
            raise ValueError("Rent effective date has already been set")
        response = (
            self.table.update(
                {"rent_effective_date": effective_date.isoformat()}
            )
            .eq("id", str(lease_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        if not response.data:
            raise PermissionError("Lease not found or not authorized")
        return _enrich_leases([_normalize_lease(response.data[0])], self.supabase)[0]


class BookmarkService(BaseService):
    def __init__(self, supabase: Client):
        super().__init__(supabase)
        self._table = "property_bookmarks"

    @with_retry
    def get_user_bookmarks(self, user_id: UUID) -> list[dict[str, Any]]:
        response = (
            self.table.select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []

    @with_retry
    def add_bookmark(self, user_id: UUID, property_id: UUID) -> dict[str, Any]:
        existing = (
            self.table.select("*")
            .eq("user_id", str(user_id))
            .eq("property_id", str(property_id))
            .execute()
        )
        if existing.data:
            return existing.data[0]
        payload = {
            "user_id": str(user_id),
            "property_id": str(property_id),
        }
        response = self.table.insert(payload).execute()
        return response.data[0]

    @with_retry
    def remove_bookmark(self, user_id: UUID, property_id: UUID) -> bool:
        response = (
            self.table.delete()
            .eq("user_id", str(user_id))
            .eq("property_id", str(property_id))
            .execute()
        )
        return bool(response.data)

    @with_retry
    def is_bookmarked(self, user_id: UUID, property_id: UUID) -> bool:
        response = (
            self.table.select("id", count="exact")
            .eq("user_id", str(user_id))
            .eq("property_id", str(property_id))
            .execute()
        )
        return (response.count if hasattr(response, "count") else len(response.data or [])) > 0


class PaymentService(BaseService):
    def __init__(self, supabase: Client):
        super().__init__(supabase)
        self._table = "payments"

    @with_retry
    def get_all_for_tenant(
        self, tenant_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict[str, Any]], int]:
        count_resp = (
            self.supabase.table(self._table)
            .select("*", count="exact")
            .eq("tenant_id", str(tenant_id))
            .execute()
        )
        total = count_resp.count if hasattr(count_resp, "count") else 0
        response = (
            self.table.select("*")
            .eq("tenant_id", str(tenant_id))
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return response.data or [], total

    @with_retry
    def get_all_for_lease(
        self, lease_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict[str, Any]], int]:
        count_resp = (
            self.supabase.table(self._table)
            .select("*", count="exact")
            .eq("lease_id", str(lease_id))
            .execute()
        )
        total = count_resp.count if hasattr(count_resp, "count") else 0
        response = (
            self.table.select("*")
            .eq("lease_id", str(lease_id))
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return response.data or [], total

    @with_retry
    def get_overdue(
        self, owner_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict[str, Any]], int]:
        resp = (
            self.supabase.table("leases")
            .select("*")
            .eq("owner_id", str(owner_id))
            .execute()
        )
        leases = _enrich_leases(resp.data or [], self.supabase)
        overdue = [
            l
            for l in leases
            if l.get("is_overdue")
            and l.get("effective_status") != "terminated"
        ]
        paginated = overdue[skip:skip + limit]
        return paginated, len(overdue)

    @with_retry
    def get_all(
        self, owner_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict[str, Any]], int]:
        leases = (
            self.supabase.table("leases")
            .select("id")
            .eq("owner_id", str(owner_id))
            .execute()
        )
        lease_ids = [lease["id"] for lease in (leases.data or [])]
        if not lease_ids:
            return [], 0
        count_resp = (
            self.supabase.table(self._table)
            .select("*", count="exact")
            .in_("lease_id", lease_ids)
            .execute()
        )
        total = count_resp.count if hasattr(count_resp, "count") else 0
        response = (
            self.table.select("*")
            .in_("lease_id", lease_ids)
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return response.data or [], total

    @with_retry
    def get_by_id(self, payment_id: UUID) -> dict[str, Any] | None:
        response = (
            self.table.select("*")
            .eq("id", str(payment_id))
            .execute()
        )
        return response.data[0] if response.data else None

    def _coverage_for(self, lease_id: Any, amount: Any) -> tuple[int | None, int | None]:
        """Compute (coverage_days, frozen_monthly_rent) for a lease+amount.

        Returns (None, None) when the lease or rate is unknown. frozen
        monthly rent is captured at write time so later rent edits never
        revalue a payment's historical coverage.
        """
        if not lease_id or amount is None:
            return None, None
        lease = (
            self.supabase.table("leases")
            .select("monthly_rent")
            .eq("id", str(lease_id))
            .execute()
        )
        if not lease.data:
            return None, None
        monthly_rent = lease.data[0].get("monthly_rent")
        if monthly_rent is None:
            return None, None
        try:
            frozen = int(monthly_rent)
        except (TypeError, ValueError, InvalidOperation):
            return None, None
        return _rent_coverage_days(amount, monthly_rent), frozen

    @with_retry
    def create(self, data: PaymentCreate) -> dict[str, Any]:
        payload = data.model_dump(exclude_none=True, mode="json")
        if not payload.get("due_date"):
            payload["due_date"] = date.today().isoformat()
        is_rent = payload.get("payment_type") == "rent"
        is_confirm = payload.get("status") in ("confirmed", "completed")
        if is_rent and is_confirm:
            # Confirmed rent payments require the permanent billing anchor:
            # without rent_effective_date the money ledger cannot accrue.
            lease = (
                self.supabase.table("leases")
                .select("rent_effective_date")
                .eq("id", str(data.lease_id))
                .execute()
            )
            anchor = (lease.data[0].get("rent_effective_date") if lease.data else None)
            if not anchor:
                # Auto-anchor the billing start instead of rejecting the
                # payment: rent accrues from the lease start date (fallback:
                # today). The conditional update only writes when the column
                # is still empty, so a concurrent writer can never lose its
                # value.
                lease_row = (
                    self.supabase.table("leases")
                    .select("start_date")
                    .eq("id", str(data.lease_id))
                    .execute()
                )
                start = (
                    lease_row.data[0].get("start_date") if lease_row.data else None
                )
                # Fallback order: lease start date, then the tenant's actual
                # payment date, then today. Anchoring is set-once, so the
                # payment date is a truer billing start than the server's
                # clock for legacy leases.
                anchor = start or (payload.get("paid_date") or date.today().isoformat())[:10]
                try:
                    result = self.supabase.table("leases").update(
                        {"rent_effective_date": anchor}
                    ).eq("id", str(data.lease_id)).is_(
                        "rent_effective_date", "null"
                    ).execute()
                    if result.data:
                        logger.warning(
                            "Auto-anchored lease %s rent_effective_date=%s (source=%s) "
                            "while recording a payment. This is permanent and resets "
                            "arrears history.",
                            data.lease_id,
                            anchor,
                            "start_date" if start else "payment_date",
                        )
                    else:
                        logger.error(
                            "Failed to anchor lease %s; balances will stay uncomputed",
                            data.lease_id,
                        )
                except Exception:
                    logger.exception(
                        "Failed to anchor lease %s; balances will stay uncomputed",
                        data.lease_id,
                    )
            if "coverage_days" not in payload:
                coverage, frozen = self._coverage_for(data.lease_id, payload.get("amount"))
                if coverage is not None:
                    payload["coverage_days"] = coverage
                    payload["frozen_monthly_rent"] = frozen
        elif not is_rent or not is_confirm:
            payload["coverage_days"] = None
            payload["frozen_monthly_rent"] = None

        # Record the payment in the lease's currency, so the receipt snapshot
        # reports what the tenant actually paid in rather than the UGX default.
        if not payload.get("currency") and data.lease_id:
            try:
                lease = (
                    self.supabase.table("leases")
                    .select("currency")
                    .eq("id", str(data.lease_id))
                    .limit(1)
                    .execute()
                )
                row = lease.data[0] if isinstance(lease.data, list) and lease.data else None
                code = row.get("currency") if isinstance(row, dict) else None
                if isinstance(code, str) and code.strip():
                    payload["currency"] = code.strip().upper()
            except Exception:
                logger.warning(
                    "Could not read lease currency for payment creation; "
                    "falling back to the column default",
                    exc_info=True,
                )

        response = self.table.insert(payload).execute()
        return response.data[0]

    @with_retry
    def delete(self, payment_id: UUID) -> None:
        self.table.delete().eq("id", str(payment_id)).execute()

    @with_retry
    def update(self, payment_id: UUID, data: PaymentUpdate) -> dict[str, Any] | None:
        payload = data.model_dump(exclude_none=True, mode="json")
        if not payload:
            return self.get_by_id(payment_id)
        existing = self.get_by_id(payment_id)
        response = (
            self.table.update(payload)
            .eq("id", str(payment_id))
            .execute()
        )
        row = response.data[0] if response.data else None
        if not row:
            return None
        is_rent = row.get("payment_type") == "rent"
        is_confirm = row.get("status") in ("confirmed", "completed")
        if is_rent and is_confirm:
            lease_id = existing.get("lease_id") if existing else row.get("lease_id")
            coverage, frozen = self._coverage_for(lease_id, row.get("amount"))
            if coverage is not None:
                patch = {"coverage_days": coverage, "frozen_monthly_rent": frozen}
                self.table.update(patch).eq("id", str(payment_id)).execute()
                row = {**row, **patch}
        else:
            patch = {"coverage_days": None, "frozen_monthly_rent": None}
            self.table.update(patch).eq("id", str(payment_id)).execute()
            row = {**row, **patch}
        return row


class MaintenanceRequestService(BaseService):
    def __init__(self, supabase: Client):
        super().__init__(supabase)
        self._table = "maintenance_requests"

    @with_retry
    def get_by_property(
        self, property_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[list[dict[str, Any]], int]:
        count_resp = (
            self.supabase.table(self._table)
            .select("*", count="exact")
            .eq("property_id", str(property_id))
            .execute()
        )
        total = count_resp.count if hasattr(count_resp, "count") else 0
        response = (
            self.table.select("*")
            .eq("property_id", str(property_id))
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return response.data or [], total

    @with_retry
    def get_by_id(self, request_id: UUID) -> dict[str, Any] | None:
        response = (
            self.table.select("*")
            .eq("id", str(request_id))
            .execute()
        )
        return response.data[0] if response.data else None

    @with_retry
    def create(self, data: MaintenanceRequestCreate) -> dict[str, Any]:
        payload = data.model_dump(exclude_none=True, mode="json")
        response = self.table.insert(payload).execute()
        return response.data[0]

    @with_retry
    def update(
        self, request_id: UUID, data: MaintenanceRequestUpdate
    ) -> dict[str, Any] | None:
        payload = data.model_dump(exclude_none=True, mode="json")
        if not payload:
            return self.get_by_id(request_id)
        response = (
            self.table.update(payload)
            .eq("id", str(request_id))
            .execute()
        )
        return response.data[0] if response.data else None

    @with_retry
    def delete(self, request_id: UUID) -> bool:
        response = (
            self.table.delete()
            .eq("id", str(request_id))
            .execute()
        )
        return bool(response.data)


def sync_all_property_occupancy(supabase: Client) -> None:
    """Backfill occupancy status for all properties based on existing leases.

    A property is considered occupied if any non-terminated lease references it.
    Only runs on startup so pre-existing assignments get labelled correctly.
    """
    try:
        leases = (
            supabase.table("leases")
            .select("property_id")
            .neq("status", "terminated")
            .execute()
        )
        occupied_ids = {str(r["property_id"]) for r in (leases.data or []) if r.get("property_id")}
        properties = (
            supabase.table("properties")
            .select("id, status")
            .in_("status", ["available", "occupied"])
            .execute()
        )
        for prop in properties.data or []:
            want = "occupied" if str(prop["id"]) in occupied_ids else "available"
            if prop.get("status") != want:
                (
                    supabase.table("properties")
                    .update({"status": want})
                    .eq("id", str(prop["id"]))
                    .execute()
                )
        logger.info(
            "Property occupancy backfill complete: %d occupied, %d available",
            len(occupied_ids),
            len(properties.data or []) - len(occupied_ids),
        )
    except Exception:
        logger.warning("Property occupancy backfill failed", exc_info=True)


def get_property_service(supabase: Client) -> PropertyService:
    return PropertyService(supabase)


def get_tenant_service(supabase: Client) -> TenantService:
    return TenantService(supabase)


def get_lease_service(supabase: Client) -> LeaseService:
    return LeaseService(supabase)


def get_payment_service(supabase: Client) -> PaymentService:
    return PaymentService(supabase)


def get_maintenance_request_service(supabase: Client) -> MaintenanceRequestService:
    return MaintenanceRequestService(supabase)


def get_bookmark_service(supabase: Client) -> BookmarkService:
    return BookmarkService(supabase)
