import logging
from datetime import date
from decimal import Decimal
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
    p.setdefault("zip_code", "00000")
    p.setdefault("country", "UG")
    p.setdefault("security_deposit", 0)
    p.setdefault("is_active", True)
    return p


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
    l["status"] = _normalize_lease_status(l.get("status"))
    return l


def _months_between(start, end) -> int:
    try:
        from datetime import date as _date

        if not isinstance(start, _date):
            start = _date.fromisoformat(str(start)[:10])
        if not isinstance(end, _date):
            end = _date.fromisoformat(str(end)[:10])
    except (TypeError, ValueError):
        return 1
    months = (end.year - start.year) * 12 + (end.month - start.month)
    return max(1, months)


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
                "manager_name": (m.get("full_name") or "").strip() or None,
                "manager_phone": m.get("phone"),
                "manager_email": m.get("email"),
            }

    payments_by_lease: dict[str, list[dict[str, Any]]] = {}
    if lease_ids:
        resp = (
            supabase.table("payments")
            .select("lease_id, amount, status, paid_date, payment_method")
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

        prop_phone = prop.get("manager_phone")
        prop_email = prop.get("manager_email")
        oid = str(l.get("owner_id", ""))
        profile = managers_by_id.get(oid) or {}
        l["manager_name"] = (
            profile.get("manager_name")
            or l.get("manager_name")
            or None
        )
        l["manager_phone"] = prop_phone or profile.get("manager_phone") or None
        l["manager_email"] = prop_email or profile.get("manager_email") or None

        lease_payments = payments_by_lease.get(lid, [])
        total_paid = sum(float(p["amount"]) for p in lease_payments)
        l["total_paid"] = total_paid

        try:
            monthly_rent = float(l.get("monthly_rent") or 0)
        except (TypeError, ValueError):
            monthly_rent = 0.0

        months = _months_between(l.get("start_date"), l.get("end_date"))
        expected_rent = monthly_rent * months
        l["expected_rent"] = expected_rent

        l["balance_due"] = max(0.0, expected_rent - total_paid)
        l["tenant_credit"] = max(0.0, total_paid - expected_rent)

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

        l["is_overdue"] = l["balance_due"] > 0

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
        limit: int = 100,
        state: str | None = None,
        property_type: str | None = None,
        rent_period: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        query = self.supabase.table(self._table).select("*", count="exact").eq("is_active", True)
        if state:
            query = query.ilike("state", f"%{state}%")
        if property_type:
            query = query.eq("property_type", property_type)
        if min_price is not None:
            query = query.gte("monthly_rent", min_price)
        if max_price is not None:
            query = query.lte("monthly_rent", max_price)

        result = query.order("created_at", desc=True).execute()
        total = result.count if hasattr(result, "count") else len(result.data or [])
        all_properties = result.data or []

        boost_svc = BoostService(self.supabase)
        boosted_ids = boost_svc.get_active_boosted_property_ids()

        if boosted_ids:
            boosted_result = (
                self.supabase.table("property_boosts")
                .select("property_id, created_at")
                .eq("status", "active")
                .in_("property_id", list(boosted_ids))
                .order("created_at", desc=True)
                .execute()
            )
            boost_order = {
                b["property_id"]: b["created_at"]
                for b in (boosted_result.data or [])
            }

            boosted = [p for p in all_properties if p["id"] in boosted_ids]
            not_boosted = [p for p in all_properties if p["id"] not in boosted_ids]

            boosted.sort(key=lambda p: boost_order.get(p["id"], ""), reverse=True)

            all_properties = boosted + not_boosted

        all_properties = [_normalize_property(r) for r in all_properties]
        all_properties = _enrich_with_manager_contact(all_properties, self.supabase)
        paginated = all_properties[skip:skip + limit]
        return paginated, total

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
        return enriched[0]

    @with_retry
    def create(self, data: PropertyCreate, owner_id: UUID) -> dict[str, Any]:
        payload = data.model_dump(exclude_none=True, mode="json")
        payload["owner_id"] = str(owner_id)
        if not payload.get("zip_code"):
            payload["zip_code"] = ""
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
        response = self.table.insert(payload).execute()
        return _enrich_leases([_normalize_lease(response.data[0])], self.supabase)[0]

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
        return _enrich_leases([_normalize_lease(response.data[0])], self.supabase)[0]

    @with_retry
    def delete(self, lease_id: UUID, owner_id: UUID) -> bool:
        response = (
            self.table.delete()
            .eq("id", str(lease_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        return bool(response.data)

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
        monthly_rent: Decimal | None = None,
        notes: str | None = None,
    ) -> dict[str, Any]:
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

        update_payload: dict[str, Any] = {
            "end_date": new_end_date.isoformat(),
            "status": "active",
        }
        if monthly_rent is not None:
            update_payload["monthly_rent"] = float(monthly_rent)

        response = (
            self.table.update(update_payload)
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
            "monthly_rent": float(monthly_rent) if monthly_rent is not None else None,
            "notes": notes,
            "renewed_by": str(owner_id),
        }
        try:
            self.supabase.table("renewal_history").insert(renewal_record).execute()
        except Exception:
            pass

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
    def get_all_for_owner(
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

    @with_retry
    def create(self, data: PaymentCreate) -> dict[str, Any]:
        payload = data.model_dump(exclude_none=True, mode="json")
        if not payload.get("due_date"):
            payload["due_date"] = date.today().isoformat()
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
        response = (
            self.table.update(payload)
            .eq("id", str(payment_id))
            .execute()
        )
        return response.data[0] if response.data else None


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
