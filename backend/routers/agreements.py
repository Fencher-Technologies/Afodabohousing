# mypy: ignore-errors
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_service_client
from models import (
    AgreementConsentRecordResponse,
    AgreementConsentResponse,
    AgreementConsentStateResponse,
    AgreementVersionResponse,
    AgreementVersionsResponse,
)
from services import AgreementService, get_agreement_service
from services.notifications import notify

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agreements", tags=["agreements"])


def get_agreement_svc(supabase: Client = Depends(get_service_client)) -> AgreementService:
    return get_agreement_service(supabase)


def _get_other_party_id(supabase: Client, lease: dict) -> str | None:
    """Get the user_id of the other party on a lease (manager or tenant)."""
    manager_id = str(lease["owner_id"])
    tenant_result = supabase.table("tenants").select("user_id").eq("id", str(lease["tenant_id"])).execute()
    tenant_user_id = str(tenant_result.data[0]["user_id"]) if tenant_result.data else None
    return tenant_user_id


def _notify_party(
    supabase: Client,
    *,
    lease: dict,
    current_user_id: str,
    event: str,
    actor_role: str,
) -> None:
    """Send an in-app notification to the party who did NOT trigger the event."""
    manager_id = str(lease["owner_id"])
    tenant_user_id = _get_other_party_id(supabase, lease)
    other_party_id = manager_id if current_user_id != manager_id else tenant_user_id
    if not other_party_id:
        return

    if event == "upload":
        title = "Revised Agreement Uploaded"
        body = "A revised tenancy agreement was uploaded. Please review and consent to the new version."
    elif event == "consent":
        who = "manager" if actor_role == "manager" else "tenant"
        title = "Agreement Consented"
        body = f"The {who} has consented to the tenancy agreement."
    else:
        return

    notify(supabase, recipient_id=other_party_id, type=f"agreement_{event}", title=title, body=body)


def _notify_both(
    supabase: Client,
    *,
    lease: dict,
    event: str,
) -> None:
    """Notify BOTH manager and tenant about a new agreement version."""
    manager_id = str(lease["owner_id"])
    tenant_user_id = _get_other_party_id(supabase, lease)
    if event == "upload":
        title = "Revised Agreement Requires Consent"
        body = "A revised tenancy agreement was uploaded. Both parties must review and consent to the new version."
    else:
        return
    for recipient in {manager_id, tenant_user_id}:
        if recipient:
            notify(supabase, recipient_id=recipient, type="agreement_upload", title=title, body=body)


def _authorized_lease(
    lease_id: UUID,
    current_user: CurrentUser,
    service: AgreementService,
) -> tuple[dict, str]:
    lease = service.get_lease(lease_id)
    if not lease:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lease not found")
    party_role = service.get_party_role(lease, current_user.id)
    return lease, party_role


@router.get("/{lease_id}", response_model=AgreementConsentStateResponse)
def get_agreement_state(
    lease_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: AgreementService = Depends(get_agreement_svc),
) -> AgreementConsentStateResponse:
    _authorized_lease(lease_id, current_user, service)
    document = service.get_current_document(lease_id)
    return AgreementConsentStateResponse(**service.build_state(document))


@router.post(
    "/{lease_id}/upload",
    response_model=AgreementConsentStateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_agreement(
    lease_id: UUID,
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    service: AgreementService = Depends(get_agreement_svc),
    supabase: Client = Depends(get_service_client),
) -> AgreementConsentStateResponse:
    lease, party_role = _authorized_lease(lease_id, current_user, service)
    document = service.upload_document(
        lease=lease,
        user_id=current_user.id,
        file_name=file.filename,
        mime_type=file.content_type,
        file_bytes=await file.read(),
    )

    _notify_both(
        supabase,
        lease=lease,
        event="upload",
    )

    return AgreementConsentStateResponse(**service.build_state(document))


@router.get(
    "/{lease_id}/versions",
    response_model=AgreementVersionsResponse,
)
def list_agreement_versions(
    lease_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: AgreementService = Depends(get_agreement_svc),
) -> AgreementVersionsResponse:
    _authorized_lease(lease_id, current_user, service)
    versions = [
        AgreementVersionResponse(**v)
        for v in service.list_versions(lease_id)
    ]
    active = next((v.version for v in versions if v.status in {"active", "fully_executed"}), None)
    return AgreementVersionsResponse(versions=versions, active_version=active)


@router.post(
    "/{lease_id}/consent",
    response_model=AgreementConsentRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
def consent_to_agreement(
    lease_id: UUID,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    service: AgreementService = Depends(get_agreement_svc),
    supabase: Client = Depends(get_service_client),
) -> AgreementConsentRecordResponse:
    lease, party_role = _authorized_lease(lease_id, current_user, service)
    document = service.get_current_document(lease_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Upload an agreement before recording consent.",
        )

    consent = service.record_consent(
        lease=lease,
        document=document,
        party_role=party_role,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    _notify_party(
        supabase,
        lease=lease,
        current_user_id=current_user.id,
        event="consent",
        actor_role=party_role,
    )

    state = service.build_state(document)
    return AgreementConsentRecordResponse(
        consent=AgreementConsentResponse(**consent),
        state=AgreementConsentStateResponse(**state),
    )
