from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel


class TermsVersion(BaseModel):
    id: UUID
    version: int
    title: str
    content: str
    is_active: bool
    effective_from: date
    created_at: datetime


class TermsConsentRequest(BaseModel):
    terms_version_id: UUID


class TermsConsentResponse(BaseModel):
    id: UUID
    user_id: UUID
    terms_version_id: UUID
    consented_at: datetime


class TermsStatusResponse(BaseModel):
    has_consented: bool
    current_version: TermsVersion | None
    consented_version: int | None
