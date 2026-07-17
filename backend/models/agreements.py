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
    version: int = 1
    is_active: bool = True
    status: str = "active"
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


class AgreementVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    version: int
    file_name: str
    agreement_url: str
    status: str
    tenant_consented: bool = False
    manager_consented: bool = False
    created_at: datetime


class AgreementVersionsResponse(BaseModel):
    versions: list[AgreementVersionResponse]
    active_version: int | None = None
