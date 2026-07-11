import logging
from datetime import date
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


LEASE_OLD_TO_NEW: dict[str, str] = {
    "manager_id": "owner_id",
    "rent_amount": "monthly_rent",
    "rent_start_date": "start_date",
    "rent_end_date": "end_date",
}


def _normalize_lease(l: dict[str, Any]) -> dict[str, Any]:
    l = _normalize_row(l, LEASE_OLD_TO_NEW)
    l.setdefault("security_deposit", 0)
    return l


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
        return [_normalize_property(r) for r in (response.data or [])], total

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
        # Fetch all matching properties (no range — we sort in Python)
        query = self.supabase.table(self._table).select("*", count="exact").eq("status", "available")
        if state:
            query = query.ilike("state", f"%{state}%")
        if property_type:
            query = query.eq("property_type", property_type)
        if rent_period:
            query = query.eq("rent_period", rent_period)
        if min_price is not None:
            query = query.gte("monthly_rent", min_price)
        if max_price is not None:
            query = query.lte("monthly_rent", max_price)

        result = query.order("created_at", desc=True).execute()
        total = result.count if hasattr(result, "count") else len(result.data or [])
        all_properties = result.data or []

        # ── Boost ranking: boosted properties first, by boost recency ──
        boost_svc = BoostService(self.supabase)
        boosted_ids = boost_svc.get_active_boosted_property_ids()

        if boosted_ids:
            # Fetch boost created_at for sort stability
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

            # Sort boosted by boost created_at desc (newer boosts first)
            boosted.sort(key=lambda p: boost_order.get(p["id"], ""), reverse=True)

            all_properties = boosted + not_boosted

        # Apply pagination after ranking sort
        all_properties = [_normalize_property(r) for r in all_properties]
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
        return _normalize_property(row) if row else None

    @with_retry
    def get_by_id_public(self, property_id: UUID) -> dict[str, Any] | None:
        response = (
            self.table.select("*")
            .eq("id", str(property_id))
            .execute()
        )
        row = response.data[0] if response.data else None
        return _normalize_property(row) if row else None

    @with_retry
    def create(self, data: PropertyCreate, owner_id: UUID) -> dict[str, Any]:
        payload = data.model_dump(exclude_none=True, mode="json")
        payload["owner_id"] = str(owner_id)
        response = self.table.insert(payload).execute()
        return response.data[0]

    @with_retry
    def update(
        self, property_id: UUID, data: PropertyUpdate, owner_id: UUID
    ) -> dict[str, Any] | None:
        payload = data.model_dump(exclude_none=True, mode="json")
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
        return [_normalize_lease(r) for r in (response.data or [])], total

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
        return [_normalize_lease(r) for r in (response.data or [])], total

    @with_retry
    def get_by_id(self, lease_id: UUID, owner_id: UUID) -> dict[str, Any] | None:
        response = (
            self.table.select("*")
            .eq("id", str(lease_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        row = response.data[0] if response.data else None
        return _normalize_lease(row) if row else None

    @with_retry
    def get_by_id_for_tenant(self, lease_id: UUID, tenant_id: UUID) -> dict[str, Any] | None:
        response = (
            self.table.select("*")
            .eq("id", str(lease_id))
            .eq("tenant_id", str(tenant_id))
            .execute()
        )
        row = response.data[0] if response.data else None
        return _normalize_lease(row) if row else None

    @with_retry
    def create(self, data: LeaseCreate, owner_id: UUID) -> dict[str, Any]:
        payload = data.model_dump(exclude_none=True, mode="json")
        payload["owner_id"] = str(owner_id)
        response = self.table.insert(payload).execute()
        return _normalize_lease(response.data[0])

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
        return response.data[0] if response.data else None

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
        response = self.table.insert(payload).execute()
        return response.data[0]

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
