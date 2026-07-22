import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from supabase import Client
from dependencies import CurrentUser, get_current_user, get_service_client
from models.terms import TermsConsentRequest, TermsConsentResponse, TermsStatusResponse, TermsVersion

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/terms", tags=["terms"])


@router.get("/current", response_model=TermsVersion)
def get_current_terms(supabase: Client = Depends(get_service_client)) -> TermsVersion:
    result = supabase.table("terms_versions").select("*").eq("is_active", True).order("version", desc=True).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No terms version found")
    return TermsVersion(**result.data[0])


@router.get("/consent-status", response_model=TermsStatusResponse)
def get_consent_status(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> TermsStatusResponse:
    current = supabase.table("terms_versions").select("*").eq("is_active", True).order("version", desc=True).limit(1).execute()
    if not current.data:
        return TermsStatusResponse(has_consented=False, current_version=None, consented_version=None)
    version = TermsVersion(**current.data[0])
    consent = supabase.table("terms_consents").select("*").eq("user_id", current_user.id).eq("terms_version_id", version.id).execute()
    has_consented = bool(consent.data)
    return TermsStatusResponse(
        has_consented=has_consented,
        current_version=version,
        consented_version=version.version if has_consented else None,
    )


@router.post("/accept", response_model=TermsConsentResponse, status_code=status.HTTP_201_CREATED)
def accept_terms(
    data: TermsConsentRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> TermsConsentResponse:
    version = supabase.table("terms_versions").select("*").eq("id", str(data.terms_version_id)).execute()
    if not version.data:
        raise HTTPException(status_code=404, detail="Terms version not found")
    existing = supabase.table("terms_consents").select("*").eq("user_id", current_user.id).eq("terms_version_id", str(data.terms_version_id)).execute()
    if existing.data:
        return TermsConsentResponse(**existing.data[0])
    payload = {
        "user_id": current_user.id,
        "terms_version_id": str(data.terms_version_id),
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }
    result = supabase.table("terms_consents").insert(payload).execute()
    return TermsConsentResponse(**result.data[0])
