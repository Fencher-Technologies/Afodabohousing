import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response, StreamingResponse
from supabase import Client

from dependencies.auth import CurrentUser, get_current_user
from dependencies.database import get_service_client
from models.agreements import (
    AgreementConsentRecordResponse,
    AgreementConsentResponse,
    AgreementConsentStateResponse,
    AgreementDocumentResponse,
    AgreementTemplateResponse,
    AgreementVersionHistoryResponse,
    BuildAgreementRequest,
    BuildAgreementResponse,
    ConsentRequest,
    ConsentStateResponse,
    EditAgreementRequest,
    PartyConsentState,
)
from services.agreement_generator import generate_agreement_pdf
from services.agreement_pdf import AgreementPDFGenerator
from services.agreements import AgreementService, get_agreement_service
from services.notifications import notify

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agreements", tags=["agreements"])


def _authorized_lease(
    lease_id: UUID,
    current_user: CurrentUser,
    service: AgreementService,
):
    """Fetch lease and determine the caller's party role. Raises 403 / 404."""
    lease = service.get_lease(lease_id)
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    role = service.get_party_role(lease, current_user.id)
    return lease, role


def _notify_other_party(
    supabase: Client,
    svc: AgreementService,
    lease: dict,
    current_user: CurrentUser,
    event_type: str,
    title: str,
    body: str,
    metadata: dict | None = None,
):
    caller_role = "manager" if str(lease.get("owner_id")) == current_user.id else "tenant"
    other_user_id = (
        svc.get_tenant_user_id(lease) if caller_role == "manager"
        else lease.get("owner_id")
    )
    if other_user_id:
        try:
            notify(
                supabase,
                recipient_id=str(other_user_id),
                type=event_type,
                title=title,
                body=body,
                metadata=metadata or {},
            )
        except Exception as e:
            logger.warning("Failed to notify %s: %s", caller_role, str(e))


# ─── Template ────────────────────────────────────────────────────────────

@router.get("/template", response_model=AgreementTemplateResponse)
def get_agreement_template(
    svc: AgreementService = Depends(get_agreement_service),
):
    """Get the default agreement template with standard clauses."""
    template = svc.get_default_template()
    if not template:
        raise HTTPException(status_code=404, detail="No default template found")
    return template


# ─── Content ─────────────────────────────────────────────────────────────

@router.get("/{lease_id}/content")
def get_agreement_content(
    lease_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: AgreementService = Depends(get_agreement_service),
):
    """Get the full agreement content JSON."""
    _authorized_lease(lease_id, current_user, svc)
    content = svc.get_content(lease_id)
    if not content:
        raise HTTPException(status_code=404, detail="No agreement content found")
    return content


# ─── PDF Download ─────────────────────────────────────────────────────────

@router.get("/{lease_id}/pdf")
def download_agreement_pdf(
    lease_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: AgreementService = Depends(get_agreement_service),
    supabase: Client = Depends(get_service_client),
):
    """Download agreement as a PDF document."""
    _authorized_lease(lease_id, current_user, svc)
    doc = svc.get_current_document(lease_id)
    if not doc:
        raise HTTPException(status_code=404, detail="No agreement document found")

    content = doc.get("content")
    if not content:
        raise HTTPException(status_code=404, detail="Agreement has no content to generate PDF from")

    try:
        pdf_bytes = generate_agreement_pdf(content)
    except Exception as e:
        logger.error("PDF generation failed: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

    agreement_number = content.get("agreement_number") or "draft"
    # Record audit event
    try:
        svc.record_audit_event(
            lease_id=str(lease_id),
            agreement_document_id=str(doc["id"]),
            actor_user_id=current_user.id,
            event_type="pdf_downloaded",
            evidence_hash=doc.get("agreement_hash", ""),
            metadata={"agreement_number": agreement_number, "version": content.get("version", 1)},
        )
    except Exception as e:
        logger.warning("Failed to record pdf_downloaded audit: %s", str(e))

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="agreement-{agreement_number}.pdf"',
        },
    )


# ─── Build ────────────────────────────────────────────────────────────────

@router.post("/{lease_id}/build", response_model=BuildAgreementResponse, status_code=201)
def build_agreement(
    lease_id: UUID,
    data: BuildAgreementRequest,
    current_user: CurrentUser = Depends(get_current_user),
    svc: AgreementService = Depends(get_agreement_service),
    supabase: Client = Depends(get_service_client),
):
    """Create a new generated agreement from template + custom clauses."""
    lease, role = _authorized_lease(lease_id, current_user, svc)
    if role != "manager":
        raise HTTPException(status_code=403, detail="Only the manager can create agreements")

    document = svc.build_agreement(
        lease_id=lease_id,
        standard_clauses=[c.model_dump() for c in data.standard_clauses],
        custom_clauses=[c.model_dump() for c in data.custom_clauses],
        actor_user_id=current_user.id,
    )
    content = document.get("content") or {}

    # Notify tenant
    _notify_other_party(
        supabase, svc, lease, current_user,
        event_type="agreement_generated",
        title="New Tenancy Agreement",
        body="A new tenancy agreement has been created for your review.",
        metadata={
            "lease_id": str(lease_id),
            "agreement_number": content.get("agreement_number"),
            "version": content.get("version"),
        },
    )
    return {
        "id": document["id"],
        "lease_id": lease_id,
        "version": document.get("version", 1),
        "agreement_number": content.get("agreement_number", ""),
        "status": document.get("status", "draft"),
        "content": content,
        "created_at": document.get("created_at"),
    }


# ─── Edit ────────────────────────────────────────────────────────────────

@router.post("/{lease_id}/edit", response_model=BuildAgreementResponse)
def edit_agreement(
    lease_id: UUID,
    data: EditAgreementRequest,
    current_user: CurrentUser = Depends(get_current_user),
    svc: AgreementService = Depends(get_agreement_service),
    supabase: Client = Depends(get_service_client),
):
    """Edit an existing agreement. Creates new version if significant changes."""
    lease, role = _authorized_lease(lease_id, current_user, svc)
    if role != "manager":
        raise HTTPException(status_code=403, detail="Only the manager can edit agreements")

    document = svc.edit_agreement(
        lease_id=lease_id,
        standard_clauses=[c.model_dump() for c in data.standard_clauses],
        custom_clauses=[c.model_dump() for c in data.custom_clauses],
        actor_user_id=current_user.id,
    )
    content = document.get("content") or {}
    return {
        "id": document["id"],
        "lease_id": lease_id,
        "version": document.get("version", 1),
        "agreement_number": content.get("agreement_number", ""),
        "status": document.get("status", "draft"),
        "content": content,
        "created_at": document.get("created_at"),
    }


# ─── Consent State (new) ─────────────────────────────────────────────────

@router.get("/{lease_id}/consent-state", response_model=ConsentStateResponse)
def get_consent_state(
    lease_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: AgreementService = Depends(get_agreement_service),
):
    """Get consent state with signature details for the current active document."""
    _authorized_lease(lease_id, current_user, svc)
    document = svc.get_current_document(lease_id)
    state = svc.build_consent_state(document)
    return state


# ─── Consent (record) ────────────────────────────────────────────────────

@router.post("/{lease_id}/consent", response_model=AgreementConsentRecordResponse, status_code=201)
def record_consent(
    lease_id: UUID,
    data: ConsentRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    svc: AgreementService = Depends(get_agreement_service),
    supabase: Client = Depends(get_service_client),
):
    """Record consent for the active agreement with electronic signature."""
    lease, party_role = _authorized_lease(lease_id, current_user, svc)
    document = svc.get_current_document(lease_id)
    if not document:
        raise HTTPException(status_code=404, detail="No active agreement document found")

    if document.get("agreement_type") != "generated":
        raise HTTPException(status_code=400, detail="Only generated agreements support named consent")

    content = document.get("content") or {}
    sigs = content.get("signatures", {})

    # Check if already consented
    if sigs.get(party_role, {}).get("consent_status") == "approved":
        raise HTTPException(status_code=409, detail="You have already consented to this agreement")

    consent = svc.record_consent(
        lease=lease,
        document=document,
        party_role=party_role,
        user_id=current_user.id,
        signed_name=data.signed_name,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    # Reload document to get updated state
    updated_doc = svc.get_current_document(lease_id)
    state = svc.build_state(updated_doc)
    consent_resp = AgreementConsentResponse(
        id=consent["id"],
        lease_id=consent["lease_id"],
        agreement_document_id=consent["agreement_document_id"],
        agreement_hash=consent.get("agreement_hash"),
        party_role=consent["party_role"],
        user_id=consent["user_id"],
        consent_status=consent["consent_status"],
        signed_name=consent.get("signed_name"),
        consent_version=consent.get("consent_version", 1),
        consented_at=consent["consented_at"],
        ip_address=consent.get("ip_address"),
        user_agent=consent.get("user_agent"),
        created_at=consent["created_at"],
    )

    # Notify other party
    other_role = "manager" if party_role == "tenant" else "tenant"
    other_label = "Tenant" if other_role == "tenant" else "Landlord/Manager"
    _notify_other_party(
        supabase, svc, lease, current_user,
        event_type="agreement_consent",
        title=f"{other_label} Has Consented",
        body=f"The {other_label} has signed the tenancy agreement.",
        metadata={
            "lease_id": str(lease_id),
            "agreement_number": content.get("agreement_number"),
            "party_role": party_role,
            "signed_name": data.signed_name,
        },
    )

    return AgreementConsentRecordResponse(
        consent=consent_resp,
        state=AgreementConsentStateResponse(
            current_document=AgreementDocumentResponse(
                id=updated_doc["id"],
                lease_id=updated_doc["lease_id"],
                agreement_type=updated_doc.get("agreement_type", "generated"),
                version=updated_doc.get("version", 1),
                status=updated_doc.get("status", "draft"),
                content=updated_doc.get("content"),
                created_at=updated_doc.get("created_at"),
            ) if updated_doc else None,
            manager=PartyConsentState(
                consented=state.get("manager", {}).get("consented", False),
                consented_at=state.get("manager", {}).get("consented_at"),
                user_id=state.get("manager", {}).get("user_id"),
            ),
            tenant=PartyConsentState(
                consented=state.get("tenant", {}).get("consented", False),
                consented_at=state.get("tenant", {}).get("consented_at"),
                user_id=state.get("tenant", {}).get("user_id"),
            ),
        ),
    )


# ─── Cancel ──────────────────────────────────────────────────────────────

@router.post("/{lease_id}/cancel", status_code=200)
def cancel_agreement(
    lease_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: AgreementService = Depends(get_agreement_service),
    supabase: Client = Depends(get_service_client),
):
    """Cancel the current agreement and reset all consent statuses. Manager only."""
    lease, role = _authorized_lease(lease_id, current_user, svc)
    if role != "manager":
        raise HTTPException(status_code=403, detail="Only the manager can cancel agreements")

    result = svc.cancel_agreement(
        lease_id=lease_id,
        actor_user_id=current_user.id,
    )

    _notify_other_party(
        supabase, svc, lease, current_user,
        event_type="agreement_cancelled",
        title="Agreement Cancelled",
        body="The tenancy agreement has been cancelled by the manager.",
        metadata={"lease_id": str(lease_id)},
    )

    return result


# ─── Versions (enhanced) ─────────────────────────────────────────────────

@router.get("/{lease_id}/versions", response_model=AgreementVersionHistoryResponse)
def list_agreement_versions(
    lease_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: AgreementService = Depends(get_agreement_service),
):
    """List all agreement versions with consent and signature status."""
    _authorized_lease(lease_id, current_user, svc)
    versions = svc.list_versions(lease_id)
    active_doc = svc.get_current_document(lease_id)
    active_version = active_doc.get("version") if active_doc else None
    return AgreementVersionHistoryResponse(versions=versions, active_version=active_version)


# ─── Download PDF ────────────────────────────────────────────────────────

@router.get("/{lease_id}/download")
def download_agreement_pdf(
    lease_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: AgreementService = Depends(get_agreement_service),
):
    """Download the current active agreement as a PDF document."""
    _authorized_lease(lease_id, current_user, svc)
    content = svc.get_content(lease_id)
    if not content:
        raise HTTPException(status_code=404, detail="No agreement content found")

    pdf_bytes = AgreementPDFGenerator(content).generate()
    anum = content.get("agreement_number", "agreement")
    safe_name = f"tenancy-agreement-{anum}.pdf".replace(" ", "-")

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.get("/{lease_id}/versions/{version_id}/content")
def get_agreement_version_content(
    lease_id: UUID,
    version_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: AgreementService = Depends(get_agreement_service),
):
    """Get the full agreement content JSON for a specific version."""
    _authorized_lease(lease_id, current_user, svc)
    content = svc.get_content_by_version(lease_id, str(version_id))
    if not content:
        raise HTTPException(status_code=404, detail="Agreement version not found")
    return content


@router.get("/{lease_id}/versions/{version_id}/download")
def download_agreement_version_pdf(
    lease_id: UUID,
    version_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: AgreementService = Depends(get_agreement_service),
):
    """Download a specific version of the agreement as a PDF document."""
    _authorized_lease(lease_id, current_user, svc)
    content = svc.get_content_by_version(lease_id, str(version_id))
    if not content:
        raise HTTPException(status_code=404, detail="Agreement version not found")

    pdf_bytes = AgreementPDFGenerator(content).generate()
    anum = content.get("agreement_number", "agreement")
    version = content.get("version", 1)
    safe_name = f"tenancy-agreement-{anum}-v{version}.pdf".replace(" ", "-")

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


# ─── Legacy endpoints (keep for existing upload flow) ────────────────────

@router.get("/{lease_id}", response_model=AgreementConsentStateResponse)
def get_agreement_state(
    lease_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: AgreementService = Depends(get_agreement_service),
):
    """Get current agreement consent state (legacy — supports both flows)."""
    _authorized_lease(lease_id, current_user, svc)
    document = svc.get_current_document(lease_id)
    state = svc.build_state(document)
    doc_resp = None
    if document:
        doc_resp = AgreementDocumentResponse(
            id=document["id"],
            lease_id=document["lease_id"],
            uploaded_by=document.get("uploaded_by"),
            file_name=document.get("file_name"),
            agreement_type=document.get("agreement_type", "uploaded"),
            agreement_number=document.get("agreement_number"),
            version=document.get("version", 1),
            status=document.get("status", "active"),
            content=document.get("content"),
            created_at=document.get("created_at"),
            updated_at=document.get("updated_at"),
        )
    return AgreementConsentStateResponse(
        current_document=doc_resp,
        manager=PartyConsentState(**state.get("manager", {})),
        tenant=PartyConsentState(**state.get("tenant", {})),
    )


@router.post("/{lease_id}/upload", status_code=501)
def upload_agreement_document():
    """Upload is deprecated. Use POST /{lease_id}/build instead."""
    raise HTTPException(
        status_code=501,
        detail="Direct document upload is deprecated. Use the /build endpoint to create agreements.",
    )
