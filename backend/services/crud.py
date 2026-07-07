# mypy: ignore-errors
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

logger = logging.getLogger(__name__)


def _apply_date_range(query: Any, column: str, date_from: date | None, date_to: date | None) -> Any:
    if date_from:
        query = query.gte(column, date_from.isoformat())
    if date_to:
        query = query.lte(column, date_to.isoformat())
    return query


def _apply_search(query: Any, columns: list[str], search: str | None) -> Any:
    if not search:
        return query
    term = search.strip()
    if not term:
        return query
    return query.or_(",".join(f"{column}.ilike.%{term}%" for column in columns))


class PropertyService(BaseService):
    def __init__(self, supabase: Client):
        super().__init__(supabase)
        self._table = "properties"

    def _apply_property_filters(
        self,
        query: Any,
        *,
        owner_id: UUID | None = None,
        property_type: str | None = None,
        status: str | None = None,
        is_active: bool | None = None,
        city: str | None = None,
        state: str | None = None,
        country: str | None = None,
        min_rent: float | None = None,
        max_rent: float | None = None,
        min_bedrooms: int | None = None,
        min_bathrooms: float | None = None,
        created_from: date | None = None,
        created_to: date | None = None,
        search: str | None = None,
    ) -> Any:
        if owner_id:
            query = query.eq("owner_id", str(owner_id))
        if property_type:
            query = query.eq("property_type", property_type)
        if status:
            query = query.eq("status", status)
        if is_active is not None:
            query = query.eq("is_active", is_active)
        if city:
            query = query.ilike("city", f"%{city}%")
        if state:
            query = query.ilike("state", f"%{state}%")
        if country:
            query = query.eq("country", country)
        if min_rent is not None:
            query = query.gte("monthly_rent", min_rent)
        if max_rent is not None:
            query = query.lte("monthly_rent", max_rent)
        if min_bedrooms is not None:
            query = query.gte("bedrooms", min_bedrooms)
        if min_bathrooms is not None:
            query = query.gte("bathrooms", min_bathrooms)
        query = _apply_date_range(query, "created_at", created_from, created_to)
        return _apply_search(query, ["title", "address", "city", "state", "description"], search)

    @with_retry
    def get_all(
        self,
        owner_id: UUID,
        skip: int = 0,
        limit: int = 100,
        **filters: Any,
    ) -> tuple[list[dict[str, Any]], int]:
        count_resp = self._apply_property_filters(
            self.supabase.table(self._table).select("*", count="exact"),
            owner_id=owner_id,
            **filters,
        ).execute()
        total = count_resp.count if hasattr(count_resp, "count") else 0
        response = (
            self._apply_property_filters(self.table.select("*"), owner_id=owner_id, **filters)
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
        **filters: Any,
    ) -> tuple[list[dict[str, Any]], int]:
        count_resp = self._apply_property_filters(
            self.supabase.table(self._table).select("*", count="exact"),
            **filters,
        ).execute()
        total = count_resp.count if hasattr(count_resp, "count") else 0
        response = (
            self._apply_property_filters(self.table.select("*"), **filters)
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
        response = self.table.select("*").eq("id", str(property_id)).execute()
        return response.data[0] if response.data else None

    @with_retry
    def create(self, data: PropertyCreate, owner_id: UUID) -> dict[str, Any]:
        payload = data.model_dump(exclude_none=True, mode="json")
        payload.setdefault("title", data.title or data.address)
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
        *,
        status: str | None = None,
        search: str | None = None,
        has_user_account: bool | None = None,
        created_from: date | None = None,
        created_to: date | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        def apply_filters(query: Any) -> Any:
            query = query.eq("owner_id", str(owner_id))
            if status:
                query = query.eq("status", status)
            if has_user_account is True:
                query = query.not_.is_("user_id", "null")
            elif has_user_account is False:
                query = query.is_("user_id", "null")
            query = _apply_date_range(query, "created_at", created_from, created_to)
            return _apply_search(query, ["first_name", "last_name", "email", "phone", "notes"], search)

        count_resp = apply_filters(self.supabase.table(self._table).select("*", count="exact")).execute()
        total = count_resp.count if hasattr(count_resp, "count") else 0
        response = apply_filters(self.table.select("*")).order("created_at", desc=True).range(
            skip, skip + limit - 1
        ).execute()
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


class ManagerService(BaseService):
    def __init__(self, supabase: Client):
        super().__init__(supabase)
        self._table = "profiles"

    @with_retry
    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        *,
        search: str | None = None,
        user_id: UUID | None = None,
        email: str | None = None,
        phone: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        def apply_filters(query: Any) -> Any:
            query = query.eq("role", "house_manager")
            if user_id:
                query = query.eq("user_id", str(user_id))
            if email:
                query = query.ilike("email", f"%{email}%")
            if phone:
                query = query.ilike("phone", f"%{phone}%")
            return _apply_search(query, ["full_name", "email", "phone"], search)

        count_resp = apply_filters(self.table.select("*", count="exact")).execute()
        total = count_resp.count if hasattr(count_resp, "count") else 0
        response = apply_filters(self.table.select("*")).order("created_at", desc=True).range(
            skip, skip + limit - 1
        ).execute()
        return response.data or [], total


class LeaseService(BaseService):
    def __init__(self, supabase: Client):
        super().__init__(supabase)
        self._table = "leases"

    def _apply_lease_filters(
        self,
        query: Any,
        *,
        owner_id: UUID | None = None,
        tenant_id: UUID | None = None,
        status: str | None = None,
        property_id: UUID | None = None,
        start_from: date | None = None,
        start_to: date | None = None,
        end_from: date | None = None,
        end_to: date | None = None,
    ) -> Any:
        if owner_id:
            query = query.eq("owner_id", str(owner_id))
        if tenant_id:
            query = query.eq("tenant_id", str(tenant_id))
        if status:
            query = query.eq("status", status)
        if property_id:
            query = query.eq("property_id", str(property_id))
        query = _apply_date_range(query, "start_date", start_from, start_to)
        return _apply_date_range(query, "end_date", end_from, end_to)

    @with_retry
    def get_all_for_tenant(
        self,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
        **filters: Any,
    ) -> tuple[list[dict[str, Any]], int]:
        count_resp = self._apply_lease_filters(
            self.supabase.table(self._table).select("*", count="exact"),
            tenant_id=tenant_id,
            **filters,
        ).execute()
        total = count_resp.count if hasattr(count_resp, "count") else 0
        response = (
            self._apply_lease_filters(self.table.select("*"), tenant_id=tenant_id, **filters)
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return response.data or [], total

    @with_retry
    def get_all(
        self,
        owner_id: UUID,
        skip: int = 0,
        limit: int = 100,
        **filters: Any,
    ) -> tuple[list[dict[str, Any]], int]:
        count_resp = self._apply_lease_filters(
            self.supabase.table(self._table).select("*", count="exact"),
            owner_id=owner_id,
            **filters,
        ).execute()
        total = count_resp.count if hasattr(count_resp, "count") else 0
        response = (
            self._apply_lease_filters(self.table.select("*"), owner_id=owner_id, **filters)
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

    def _apply_payment_filters(
        self,
        query: Any,
        *,
        lease_ids: list[str] | None = None,
        tenant_id: UUID | str | None = None,
        status: str | None = None,
        payment_type: str | None = None,
        payment_method: str | None = None,
        due_from: date | None = None,
        due_to: date | None = None,
        paid_from: date | None = None,
        paid_to: date | None = None,
        created_from: date | None = None,
        created_to: date | None = None,
    ) -> Any:
        if lease_ids is not None:
            query = query.in_("lease_id", lease_ids)
        if tenant_id:
            query = query.eq("tenant_id", str(tenant_id))
        if status:
            query = query.eq("status", status)
        if payment_type:
            query = query.eq("payment_type", payment_type)
        if payment_method:
            query = query.eq("payment_method", payment_method)
        query = _apply_date_range(query, "due_date", due_from, due_to)
        query = _apply_date_range(query, "paid_date", paid_from, paid_to)
        return _apply_date_range(query, "created_at", created_from, created_to)

    def _lease_ids_for_owner(self, owner_id: UUID, property_id: UUID | None = None) -> list[str]:
        query = self.supabase.table("leases").select("id").eq("owner_id", str(owner_id))
        if property_id:
            query = query.eq("property_id", str(property_id))
        leases = query.execute()
        return [lease["id"] for lease in (leases.data or [])]

    def _lease_ids_for_tenant_property(self, tenant_id: UUID, property_id: UUID | None = None) -> list[str] | None:
        if not property_id:
            return None
        leases = (
            self.supabase.table("leases")
            .select("id")
            .eq("tenant_id", str(tenant_id))
            .eq("property_id", str(property_id))
            .execute()
        )
        return [lease["id"] for lease in (leases.data or [])]

    @with_retry
    def get_all_for_tenant(
        self,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
        *,
        property_id: UUID | None = None,
        **filters: Any,
    ) -> tuple[list[dict[str, Any]], int]:
        requested_lease_ids = filters.pop("lease_ids", None)
        lease_ids = self._lease_ids_for_tenant_property(tenant_id, property_id)
        if requested_lease_ids is not None:
            requested_lease_ids = [str(lease_id) for lease_id in requested_lease_ids]
            lease_ids = requested_lease_ids if lease_ids is None else [
                lease_id for lease_id in lease_ids if lease_id in requested_lease_ids
            ]
        if lease_ids == []:
            return [], 0
        count_resp = self._apply_payment_filters(
            self.supabase.table(self._table).select("*", count="exact"),
            tenant_id=tenant_id,
            lease_ids=lease_ids,
            **filters,
        ).execute()
        total = count_resp.count if hasattr(count_resp, "count") else 0
        response = (
            self._apply_payment_filters(self.table.select("*"), tenant_id=tenant_id, lease_ids=lease_ids, **filters)
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return response.data or [], total

    @with_retry
    def get_all_for_owner(
        self,
        owner_id: UUID,
        skip: int = 0,
        limit: int = 100,
        *,
        property_id: UUID | None = None,
        tenant_id: UUID | None = None,
        **filters: Any,
    ) -> tuple[list[dict[str, Any]], int]:
        requested_lease_ids = filters.pop("lease_ids", None)
        lease_ids = self._lease_ids_for_owner(owner_id, property_id)
        if requested_lease_ids is not None:
            requested_lease_ids = [str(lease_id) for lease_id in requested_lease_ids]
            lease_ids = [lease_id for lease_id in lease_ids if lease_id in requested_lease_ids]
        if not lease_ids:
            return [], 0
        count_resp = self._apply_payment_filters(
            self.supabase.table(self._table).select("*", count="exact"),
            lease_ids=lease_ids,
            tenant_id=tenant_id,
            **filters,
        ).execute()
        total = count_resp.count if hasattr(count_resp, "count") else 0
        response = (
            self._apply_payment_filters(self.table.select("*"), lease_ids=lease_ids, tenant_id=tenant_id, **filters)
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )
        return response.data or [], total

    @with_retry
    def get_by_id(self, payment_id: UUID) -> dict[str, Any] | None:
        response = self.table.select("*").eq("id", str(payment_id)).execute()
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
        response = self.table.update(payload).eq("id", str(payment_id)).execute()
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
        response = self.table.select("*").eq("id", str(request_id)).execute()
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
        response = self.table.update(payload).eq("id", str(request_id)).execute()
        return response.data[0] if response.data else None

    @with_retry
    def delete(self, request_id: UUID) -> bool:
        response = self.table.delete().eq("id", str(request_id)).execute()
        return bool(response.data)


def get_property_service(supabase: Client) -> PropertyService:
    return PropertyService(supabase)


def get_tenant_service(supabase: Client) -> TenantService:
    return TenantService(supabase)


def get_manager_service(supabase: Client) -> ManagerService:
    return ManagerService(supabase)


def get_lease_service(supabase: Client) -> LeaseService:
    return LeaseService(supabase)


def get_payment_service(supabase: Client) -> PaymentService:
    return PaymentService(supabase)


def get_maintenance_request_service(supabase: Client) -> MaintenanceRequestService:
    return MaintenanceRequestService(supabase)
