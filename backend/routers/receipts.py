import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from dependencies.auth import CurrentUser, get_current_user
from dependencies.database import get_service_client
from services.receipts import ReceiptService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/receipts", tags=["receipts"])


def get_receipt_svc(supabase: Client = Depends(get_service_client)) -> ReceiptService:
    return ReceiptService(supabase)


def _tenant_id_for_user(supabase: Client, user_id: str) -> str | None:
    result = (
        supabase.table("tenants")
        .select("id")
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0]["id"] if result.data else None


def _owns_receipt_lease(supabase: Client, receipt: dict, user_id: str) -> bool:
    lease_id = receipt.get("lease_id")
    if not lease_id:
        return False
    lease = (
        supabase.table("leases")
        .select("owner_id")
        .eq("id", str(lease_id))
        .execute()
    )
    return bool(lease.data) and str(lease.data[0].get("owner_id")) == str(user_id)


@router.get("/my")
def list_my_receipts(
    status_filter: str | None = Query(None, alias="status", description="active or voided"),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
    service: ReceiptService = Depends(get_receipt_svc),
):
    """List the signed-in tenant's receipts (newest first)."""
    tenant_id = _tenant_id_for_user(supabase, current_user.id)
    if not tenant_id:
        return {"items": [], "total": 0}
    items = service.list_for_tenant(tenant_id, status_filter)
    return {"items": items, "total": len(items)}


@router.get("")
def list_owner_receipts(
    status_filter: str | None = Query(None, alias="status", description="active or voided"),
    current_user: CurrentUser = Depends(get_current_user),
    service: ReceiptService = Depends(get_receipt_svc),
):
    """List receipts across all of the manager's leases (newest first)."""
    items = service.list_for_owner(current_user.id, status_filter)
    return {"items": items, "total": len(items)}


@router.get("/{receipt_id}")
def get_receipt(
    receipt_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
    service: ReceiptService = Depends(get_receipt_svc),
):
    """Fetch a single receipt. Visible to its tenant and the lease manager."""
    receipt = service.get_by_id(receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    tenant_id = _tenant_id_for_user(supabase, current_user.id)
    if tenant_id and str(receipt.get("tenant_id")) == str(tenant_id):
        return receipt
    if _owns_receipt_lease(supabase, receipt, current_user.id):
        return receipt
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


@router.post("/{receipt_id}/void")
def void_receipt(
    receipt_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
    service: ReceiptService = Depends(get_receipt_svc),
):
    """Void a receipt. Manager of the lease only. The payment record itself
    is not changed; voiding only marks the receipt document as cancelled."""
    receipt = service.get_by_id(receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if not _owns_receipt_lease(supabase, receipt, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    updated = service.void(receipt_id, current_user.id)
    if not updated:
        raise HTTPException(status_code=400, detail="Receipt is already voided.")
    return updated
