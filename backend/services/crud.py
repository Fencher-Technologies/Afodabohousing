import logging
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
        return response.data or [], total

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
        return response.data[0] if response.data else None

    @with_retry
    def get_by_id_public(self, property_id: UUID) -> dict[str, Any] | None:
        response = (
            self.table.select("*")
            .eq("id", str(property_id))
            .execute()
        )
        return response.data[0] if response.data else None

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
        return response.data or [], total

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
        return response.data or [], total

    @with_retry
    def get_by_id(self, lease_id: UUID, owner_id: UUID) -> dict[str, Any] | None:
        response = (
            self.table.select("*")
            .eq("id", str(lease_id))
            .eq("owner_id", str(owner_id))
            .execute()
        )
        return response.data[0] if response.data else None

    @with_retry
    def create(self, data: LeaseCreate, owner_id: UUID) -> dict[str, Any]:
        payload = data.model_dump(exclude_none=True, mode="json")
        payload["owner_id"] = str(owner_id)
        response = self.table.insert(payload).execute()
        return response.data[0]

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
