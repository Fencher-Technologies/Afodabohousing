from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ─── Template ────────────────────────────────────────────────────────────

class StandardClause(BaseModel):
    key: str
    title: str
    content: str
    optional: bool = False
    enabled_by_default: bool = True


class AgreementTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    is_default: bool = False
    standard_clauses: list[StandardClause] = []
    created_at: datetime
    updated_at: datetime


# ─── Content ─────────────────────────────────────────────────────────────

class TenantInfo(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None


class ManagerInfo(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None


class PropertyInfo(BaseModel):
    title: str
    address: str | None = None
    city: str | None = None
    description: str | None = None
    amenities: list[str] = []


class TenancyInfo(BaseModel):
    monthly_rent: Decimal
    security_deposit: Decimal = Decimal("0")
    start_date: date
    end_date: date
    payment_frequency: str = "monthly"


class StandardClauseEntry(BaseModel):
    key: str
    title: str
    content: str
    enabled: bool = True


class CustomClause(BaseModel):
    title: str
    content: str


class SignatureInfo(BaseModel):
    signed_name: str | None = None
    signed_at: datetime | None = None
    consent_status: str = "pending"
    consent_version: int = 0


class AgreementContent(BaseModel):
    agreement_number: str | None = None
    version: int = 1
    generated_at: datetime | None = None

    tenant: TenantInfo
    manager: ManagerInfo
    property: PropertyInfo
    tenancy: TenancyInfo

    standard_clauses: list[StandardClauseEntry] = []
    custom_clauses: list[CustomClause] = []

    signatures: dict[str, SignatureInfo] = {}


# ─── Build / Edit ────────────────────────────────────────────────────────

class BuildAgreementRequest(BaseModel):
    standard_clauses: list[StandardClauseEntry] = []
    custom_clauses: list[CustomClause] = []


class EditAgreementRequest(BaseModel):
    standard_clauses: list[StandardClauseEntry] = []
    custom_clauses: list[CustomClause] = []


class BuildAgreementResponse(BaseModel):
    id: UUID
    lease_id: UUID
    version: int
    agreement_number: str
    status: str
    content: AgreementContent
    created_at: datetime


# ─── Consent ─────────────────────────────────────────────────────────────

class ConsentRequest(BaseModel):
    signed_name: str = Field(..., min_length=1)


class ConsentState(BaseModel):
    signed_name: str | None = None
    signed_at: datetime | None = None
    consent_status: str = "pending"
    consent_version: int = 0
    user_id: UUID | None = None


class ConsentStateResponse(BaseModel):
    current_document: "AgreementDocumentResponse | None" = None
    manager: ConsentState
    tenant: ConsentState
    content: AgreementContent | None = None


# ─── Document / History ──────────────────────────────────────────────────

class AgreementDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lease_id: UUID
    uploaded_by: UUID | None = None
    file_name: str | None = None
    agreement_type: str = "uploaded"
    agreement_number: str | None = None
    version: int = 1
    status: str = "draft"
    content: dict | None = None
    created_at: datetime
    updated_at: datetime | None = None


class AgreementDocumentMinimal(BaseModel):
    id: UUID
    version: int
    agreement_number: str | None = None
    status: str
    tenant_signed: bool = False
    manager_signed: bool = False
    tenant_signed_name: str | None = None
    manager_signed_name: str | None = None
    created_at: datetime


class AgreementVersionHistoryResponse(BaseModel):
    versions: list[AgreementDocumentMinimal] = []
    active_version: int | None = None


# ─── Existing (kept for backward compat with old upload flow) ────────────

class AgreementConsentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lease_id: UUID
    agreement_document_id: UUID
    agreement_hash: str | None = None
    party_role: str
    user_id: UUID
    consent_status: str = "approved"
    signed_name: str | None = None
    consent_version: int = 1
    consented_at: datetime
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime


class PartyConsentState(BaseModel):
    consented: bool = False
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
    file_name: str | None = None
    agreement_url: str | None = None
    status: str
    tenant_consented: bool = False
    manager_consented: bool = False
    created_at: datetime


class AgreementVersionsResponse(BaseModel):
    versions: list[AgreementVersionResponse] = []
    active_version: int | None = None
