import logging
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from supabase import Client
from dependencies import CurrentUser, get_current_user, get_service_client, require_super_admin_or_manager
from services.agreement_generator import generate_agreement_pdf
from services.crud import get_lease_service, get_property_service, get_tenant_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agreements/generate", tags=["agreements"])


class AgreementGenerateRequest(BaseModel):
    lease_id: str
    tenant_signature: str | None = None


@router.post("")
def generate_agreement(
    data: AgreementGenerateRequest,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
):
    lease_svc = get_lease_service(supabase)
    lease = lease_svc.get_by_id_public(data.lease_id) if hasattr(lease_svc, "get_by_id_public") else None
    if not lease:
        lease = lease_svc.get_by_id(data.lease_id)
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    prop = get_property_service(supabase).get_by_id_public(lease["property_id"]) or {}
    tenant = get_tenant_service(supabase).get_by_id(lease["tenant_id"], current_user.id) or {}
    tenant_name = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip() or "Tenant"
    manager_name = current_user.email
    pdf_bytes = generate_agreement_pdf(
        tenant_name=tenant_name,
        property_title=prop.get("title", ""),
        property_address=f"{prop.get('address', '')}, {prop.get('city', '')}",
        monthly_rent=float(lease.get("monthly_rent", 0)),
        security_deposit=float(prop.get("security_deposit", 0)),
        start_date=date.fromisoformat(str(lease.get("start_date", ""))[:10]) if lease.get("start_date") else date.today(),
        end_date=date.fromisoformat(str(lease.get("end_date", ""))[:10]) if lease.get("end_date") else date.today(),
        manager_name=manager_name,
        tenant_signature=data.tenant_signature or tenant_name,
        manager_signature=current_user.email,
    )
    filename = f"agreement_{data.lease_id}_{date.today()}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
