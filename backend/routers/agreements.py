# mypy: ignore-errors
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from supabase import Client

from dependencies import CurrentUser, get_current_user, get_service_client
from models import (
    AgreementConsentRecordResponse,
    AgreementConsentResponse,
    AgreementConsentStateResponse,
)
from services import AgreementService, get_agreement_service

router = APIRouter(prefix="/agreements", tags=["agreements"])


def get_agreement_svc(supabase: Client = Depends(get_service_client)) -> AgreementService:
    return get_agreement_service(supabase)


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
) -> AgreementConsentStateResponse:
    lease, _party_role = _authorized_lease(lease_id, current_user, service)
    document = service.upload_document(
        lease=lease,
        user_id=current_user.id,
        file_name=file.filename,
        mime_type=file.content_type,
        file_bytes=await file.read(),
    )
    return AgreementConsentStateResponse(**service.build_state(document))


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
    state = service.build_state(document)
    return AgreementConsentRecordResponse(
        consent=AgreementConsentResponse(**consent),
        state=AgreementConsentStateResponse(**state),
    )
