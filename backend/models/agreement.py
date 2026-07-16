from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AgreementDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lease_id: UUID
    uploaded_by: UUID
    file_name: str
    file_mime_type: str
    file_size: int
    storage_path: str
    agreement_url: str
    agreement_hash: str
    created_at: datetime


class AgreementConsentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lease_id: UUID
    agreement_document_id: UUID
    agreement_hash: str
    party_role: str
    user_id: UUID
    consent_status: bool
    consented_at: datetime
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime


class PartyConsentState(BaseModel):
    consented: bool
    consented_at: datetime | None = None
    user_id: UUID | None = None


class AgreementConsentStateResponse(BaseModel):
    current_document: AgreementDocumentResponse | None = None
    manager: PartyConsentState
    tenant: PartyConsentState


class AgreementConsentRecordResponse(BaseModel):
    consent: AgreementConsentResponse
    state: AgreementConsentStateResponse
