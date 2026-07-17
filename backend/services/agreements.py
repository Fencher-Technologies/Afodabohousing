# mypy: ignore-errors
import hashlib
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from supabase import Client

from .base import with_retry

AGREEMENT_BUCKET = "tenancy-agreements"
AGREEMENT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30
ALLOWED_AGREEMENT_MIME_TYPES = {
    "application/pdf",
    "image/heic",
    "image/heif",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}


def _safe_filename(filename: str | None) -> str:
    candidate = Path(filename or "tenancy-agreement.pdf").name
    return candidate.replace(" ", "-")


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class AgreementService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    @with_retry
    def get_lease(self, lease_id: UUID) -> dict[str, Any] | None:
        response = self.supabase.table("leases").select("*").eq("id", str(lease_id)).execute()
        return response.data[0] if response.data else None

    @with_retry
    def get_party_role(self, lease: dict[str, Any], user_id: str) -> str:
        if str(lease.get("owner_id")) == str(user_id):
            return "manager"

        tenant = (
            self.supabase.table("tenants")
            .select("id")
            .eq("id", str(lease.get("tenant_id")))
            .eq("user_id", str(user_id))
            .execute()
        )
        if tenant.data:
            return "tenant"

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    @with_retry
    def get_current_document(self, lease_id: UUID) -> dict[str, Any] | None:
        response = (
            self.supabase.table("agreement_documents")
            .select("*")
            .eq("lease_id", str(lease_id))
            .eq("is_active", True)
            .order("version", desc=True)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    @with_retry
    def get_all_documents(self, lease_id: UUID) -> list[dict[str, Any]]:
        response = (
            self.supabase.table("agreement_documents")
            .select("*")
            .eq("lease_id", str(lease_id))
            .order("version", desc=True)
            .execute()
        )
        return response.data or []

    @with_retry
    def list_versions(self, lease_id: UUID) -> list[dict[str, Any]]:
        documents = self.get_all_documents(lease_id)
        versions: list[dict[str, Any]] = []
        for doc in documents:
            consents = self.list_consents(str(doc["id"]))
            roles = {c.get("party_role") for c in consents}
            versions.append({
                "id": doc["id"],
                "version": doc.get("version", 1),
                "file_name": doc.get("file_name"),
                "agreement_url": doc.get("agreement_url"),
                "status": doc.get("status", "active"),
                "tenant_consented": "tenant" in roles,
                "manager_consented": "manager" in roles,
                "created_at": doc.get("created_at"),
            })
        return versions

    @with_retry
    def list_consents(self, document_id: str) -> list[dict[str, Any]]:
        response = (
            self.supabase.table("agreement_consents")
            .select("*")
            .eq("agreement_document_id", document_id)
            .eq("consent_status", True)
            .order("consented_at", desc=True)
            .execute()
        )
        return response.data or []

    def build_state(self, document: dict[str, Any] | None) -> dict[str, Any]:
        state = {
            "current_document": document,
            "manager": {"consented": False, "consented_at": None, "user_id": None},
            "tenant": {"consented": False, "consented_at": None, "user_id": None},
        }
        if document:
            state["version"] = document.get("version", 1)
            state["status"] = document.get("status", "active")
        if not document:
            return state

        for consent in self.list_consents(str(document["id"])):
            role = consent.get("party_role")
            if role not in {"manager", "tenant"} or state[role]["consented"]:
                continue
            state[role] = {
                "consented": True,
                "consented_at": consent.get("consented_at"),
                "user_id": consent.get("user_id"),
            }
        return state

    @with_retry
    def upload_document(
        self,
        *,
        lease: dict[str, Any],
        user_id: str,
        file_name: str | None,
        mime_type: str | None,
        file_bytes: bytes,
    ) -> dict[str, Any]:
        content_type = (mime_type or "application/octet-stream").lower()
        if content_type not in ALLOWED_AGREEMENT_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agreement must be a PDF or image file.",
            )
        if not file_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

        digest = hashlib.sha256(file_bytes).hexdigest()
        safe_name = _safe_filename(file_name)

        # Archive any previously active version for this lease. Consent records
        # remain tied to their original document, so archiving a version never
        # carries its consent forward to the new version.
        existing = (
            self.supabase.table("agreement_documents")
            .select("id, version")
            .eq("lease_id", str(lease["id"]))
            .eq("is_active", True)
            .execute()
        )
        next_version = 1
        for prev in existing.data or []:
            try:
                next_version = max(next_version, int(prev.get("version", 0)) + 1)
            except (TypeError, ValueError):
                next_version = max(next_version, 1)
            self.supabase.table("agreement_documents").update(
                {"is_active": False, "status": "archived"}
            ).eq("id", str(prev["id"])).execute()

        storage_path = f"{lease['id']}/v{next_version}-{digest[:16]}-{safe_name}"
        self.supabase.storage.from_(AGREEMENT_BUCKET).upload(
            storage_path,
            file_bytes,
            {"content-type": content_type, "upsert": "true"},
        )
        signed = self.supabase.storage.from_(AGREEMENT_BUCKET).create_signed_url(
            storage_path,
            AGREEMENT_SIGNED_URL_TTL_SECONDS,
        )
        agreement_url = signed.get("signedURL") or signed.get("signedUrl")
        if not agreement_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create signed agreement URL",
            )

        payload = {
            "lease_id": str(lease["id"]),
            "uploaded_by": str(user_id),
            "file_name": safe_name,
            "file_mime_type": content_type,
            "file_size": len(file_bytes),
            "storage_path": storage_path,
            "agreement_url": agreement_url,
            "agreement_hash": digest,
            "version": next_version,
            "is_active": True,
            "status": "active",
        }
        response = self.supabase.table("agreement_documents").insert(payload).execute()
        document = response.data[0]
        self.record_audit_event(
            lease_id=str(lease["id"]),
            agreement_document_id=str(document["id"]),
            actor_user_id=str(user_id),
            event_type="agreement_uploaded",
            evidence_hash=digest,
            metadata={"file_name": safe_name, "file_mime_type": content_type, "file_size": len(file_bytes), "version": next_version},
        )
        return document

    @with_retry
    def record_consent(
        self,
        *,
        lease: dict[str, Any],
        document: dict[str, Any],
        party_role: str,
        user_id: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> dict[str, Any]:
        payload = {
            "lease_id": str(lease["id"]),
            "agreement_document_id": str(document["id"]),
            "agreement_hash": document["agreement_hash"],
            "party_role": party_role,
            "user_id": str(user_id),
            "consent_status": True,
            "consented_at": _now_iso(),
            "ip_address": ip_address,
            "user_agent": user_agent,
        }
        response = self.supabase.table("agreement_consents").insert(payload).execute()
        consent = response.data[0]

        # If both parties have now consented on this version, mark it executed.
        consents = self.list_consents(str(document["id"]))
        roles = {c.get("party_role") for c in consents}
        if {"manager", "tenant"}.issubset(roles):
            self.supabase.table("agreement_documents").update(
                {"status": "fully_executed"}
            ).eq("id", str(document["id"])).execute()

        self.record_audit_event(
            lease_id=str(lease["id"]),
            agreement_document_id=str(document["id"]),
            actor_user_id=str(user_id),
            event_type=f"{party_role}_consented",
            evidence_hash=document["agreement_hash"],
            metadata={
                "agreement_consent_id": consent["id"],
                "party_role": party_role,
                "ip_address": ip_address,
                "user_agent": user_agent,
            },
        )
        return consent

    @with_retry
    def record_audit_event(
        self,
        *,
        lease_id: str,
        agreement_document_id: str,
        actor_user_id: str,
        event_type: str,
        evidence_hash: str,
        metadata: dict[str, Any],
    ) -> None:
        self.supabase.table("agreement_audit_logs").insert({
            "lease_id": lease_id,
            "agreement_document_id": agreement_document_id,
            "actor_user_id": actor_user_id,
            "event_type": event_type,
            "evidence_hash": evidence_hash,
            "metadata": metadata,
        }).execute()


def get_agreement_service(supabase: Client) -> AgreementService:
    return AgreementService(supabase)
