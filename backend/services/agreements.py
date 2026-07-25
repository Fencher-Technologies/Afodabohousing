# mypy: ignore-errors
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from supabase import Client

from dependencies.database import get_service_client

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

# Fields that trigger a new version and consent reset when changed
SIGNIFICANT_FIELDS = {
    "monthly_rent", "security_deposit", "start_date", "end_date",
    "property_id", "standard_clauses", "custom_clauses",
}


def _safe_filename(filename: str | None) -> str:
    candidate = Path(filename or "tenancy-agreement.pdf").name
    return candidate.replace(" ", "-")


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _now() -> datetime:
    return datetime.now(UTC)


class AgreementService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    # ─── Helpers ────────────────────────────────────────────────────────────

    @with_retry
    def get_lease(self, lease_id: UUID) -> dict[str, Any] | None:
        response = self.supabase.table("leases").select("*").eq("id", str(lease_id)).execute()
        return response.data[0] if response.data else None

    @with_retry
    def get_lease_with_relations(self, lease_id: UUID) -> dict[str, Any]:
        lease = self.get_lease(lease_id)
        if not lease:
            raise HTTPException(status_code=404, detail="Lease not found")

        # Tenant info
        tenant = None
        try:
            tr = self.supabase.table("tenants").select("*").eq("id", str(lease["tenant_id"])).execute()
            if tr.data:
                tenant = tr.data[0]
        except Exception:
            pass

        # Property info
        prop = None
        try:
            pr = self.supabase.table("properties").select("*").eq("id", str(lease["property_id"])).execute()
            if pr.data:
                prop = pr.data[0]
        except Exception:
            pass

        # Manager profile
        manager = None
        try:
            mr = self.supabase.table("profiles").select("user_id, full_name, email, phone").eq("user_id", str(lease["owner_id"])).execute()
            if mr.data:
                manager = mr.data[0]
        except Exception:
            pass

        return {
            "lease": lease,
            "tenant": tenant,
            "property": prop,
            "manager": manager,
        }

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
    def get_tenant_user_id(self, lease: dict[str, Any]) -> str | None:
        try:
            r = self.supabase.table("tenants").select("user_id").eq("id", str(lease["tenant_id"])).execute()
            if r.data and r.data[0].get("user_id"):
                return str(r.data[0]["user_id"])
        except Exception:
            pass
        return None

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
    def get_document_by_id(self, document_id: str) -> dict[str, Any] | None:
        response = (
            self.supabase.table("agreement_documents")
            .select("*")
            .eq("id", document_id)
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

    # ─── Template ──────────────────────────────────────────────────────────

    @with_retry
    def get_default_template(self) -> dict[str, Any] | None:
        response = (
            self.supabase.table("agreement_templates")
            .select("*")
            .eq("is_default", True)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    # ─── Build Agreement ───────────────────────────────────────────────────

    def _build_content(
        self,
        lease_id: UUID,
        standard_clauses: list[dict[str, Any]],
        custom_clauses: list[dict[str, Any]],
        existing_version: int | None = None,
        existing_number: str | None = None,
    ) -> dict[str, Any]:
        rel = self.get_lease_with_relations(lease_id)
        lease = rel["lease"]
        tenant = rel["tenant"]
        prop = rel["property"]
        manager = rel["manager"]

        tenant_name = ""
        if tenant:
            parts = [tenant.get("first_name", ""), tenant.get("last_name", "")]
            tenant_name = " ".join(p for p in parts if p).strip()

        manager_name = (manager or {}).get("full_name") or ""

        next_version = (existing_version or 0) + 1
        agreement_number = existing_number
        if not agreement_number:
            seq = self.supabase.rpc("get_next_agreement_number").execute()
            seq_val = seq.data if hasattr(seq, "data") else 1
            year = _now().year
            agreement_number = f"AGR-{year}-{str(seq_val).zfill(4)}"

        amenities = []
        if prop:
            raw = prop.get("amenities") or []
            amenities = list(raw) if isinstance(raw, (list, tuple)) else json.loads(raw) if isinstance(raw, str) else []

        content = {
            "agreement_number": agreement_number,
            "version": next_version,
            "generated_at": _now_iso(),
            "tenant": {
                "full_name": tenant_name,
                "email": (tenant or {}).get("email"),
                "phone": (tenant or {}).get("phone"),
            },
            "manager": {
                "full_name": manager_name,
                "email": (manager or {}).get("email"),
                "phone": (manager or {}).get("phone"),
            },
            "property": {
                "title": (prop or {}).get("title", ""),
                "address": (prop or {}).get("address", ""),
                "city": (prop or {}).get("city", ""),
                "description": (prop or {}).get("description", ""),
                "amenities": amenities,
            },
            "tenancy": {
                "monthly_rent": str(lease.get("monthly_rent", 0)),
                "security_deposit": str(lease.get("security_deposit", 0)),
                "start_date": str(lease.get("start_date", "")),
                "end_date": str(lease.get("end_date", "")),
                "payment_frequency": "monthly",
            },
            "standard_clauses": standard_clauses,
            "custom_clauses": custom_clauses,
            "signatures": {
                "tenant": {
                    "signed_name": None,
                    "signed_at": None,
                    "consent_status": "pending",
                    "consent_version": 0,
                },
                "manager": {
                    "signed_name": None,
                    "signed_at": None,
                    "consent_status": "pending",
                    "consent_version": 0,
                },
            },
        }
        return content

    def _check_significant_changes(
        self, old_content: dict[str, Any], new_content: dict[str, Any]
    ) -> bool:
        old_ten = old_content.get("tenancy", {})
        new_ten = new_content.get("tenancy", {})
        for f in ("monthly_rent", "security_deposit", "start_date", "end_date"):
            if str(old_ten.get(f, "")) != str(new_ten.get(f, "")):
                return True
        old_prop = old_content.get("property", {})
        new_prop = new_content.get("property", {})
        if str(old_prop.get("title", "")) != str(new_prop.get("title", "")):
            return True
        if sorted(old_prop.get("amenities", []) or []) != sorted(new_prop.get("amenities", []) or []):
            return True
        if json.dumps(old_content.get("standard_clauses", []), sort_keys=True) != json.dumps(new_content.get("standard_clauses", []), sort_keys=True):
            return True
        if json.dumps(old_content.get("custom_clauses", []), sort_keys=True) != json.dumps(new_content.get("custom_clauses", []), sort_keys=True):
            return True
        return False

    @with_retry
    def build_agreement(
        self,
        lease_id: UUID,
        standard_clauses: list[dict[str, Any]],
        custom_clauses: list[dict[str, Any]],
        actor_user_id: str,
    ) -> dict[str, Any]:
        """Create a new agreement. Fails if an active generated agreement exists."""
        existing = self.get_current_document(lease_id)
        if existing and existing.get("agreement_type") == "generated" and existing.get("status") not in ("superseded", "cancelled"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An active agreement already exists. Use edit instead.",
            )

        self.get_lease_with_relations(lease_id)

        content = self._build_content(lease_id, standard_clauses, custom_clauses)

        # Archive any old uploaded-only documents
        if existing:
            self.supabase.table("agreement_documents").update(
                {"is_active": False, "status": "superseded"}
            ).eq("id", str(existing["id"])).execute()

        content_json = json.dumps(content, default=str)
        evidence_hash = hashlib.sha256(content_json.encode()).hexdigest()

        payload = {
            "lease_id": str(lease_id),
            "uploaded_by": str(actor_user_id),
            "file_name": f"agreement-v{content['version']}.json",
            "file_mime_type": "application/json",
            "file_size": len(content_json),
            "agreement_hash": evidence_hash,
            "agreement_type": "generated",
            "agreement_number": content["agreement_number"],
            "content": content,
            "version": content["version"],
            "is_active": True,
            "status": "awaiting_tenant_consent",
        }
        response = self.supabase.table("agreement_documents").insert(payload).execute()
        document = response.data[0]

        self.record_audit_event(
            lease_id=str(lease_id),
            agreement_document_id=str(document["id"]),
            actor_user_id=str(actor_user_id),
            event_type="agreement_generated",
            evidence_hash=evidence_hash,
            metadata={"version": content["version"], "agreement_number": content["agreement_number"]},
        )
        return {**document, "content": content}

    @with_retry
    def edit_agreement(
        self,
        lease_id: UUID,
        standard_clauses: list[dict[str, Any]],
        custom_clauses: list[dict[str, Any]],
        actor_user_id: str,
    ) -> dict[str, Any]:
        """Edit an existing agreement. Always updates in-place and resets all signatures + consent records."""
        current = self.get_current_document(lease_id)
        if not current or current.get("agreement_type") != "generated":
            raise HTTPException(status_code=404, detail="No generated agreement found to edit")

        old_content = current.get("content")
        if not old_content:
            raise HTTPException(status_code=400, detail="Agreement has no content")

        prev_version = old_content.get("version", 1) or 1
        new_version = prev_version + 1

        new_content = self._build_content(
            lease_id,
            standard_clauses,
            custom_clauses,
            existing_version=prev_version,
            existing_number=old_content.get("agreement_number"),
        )
        new_content["version"] = new_version
        new_content["generated_at"] = _now_iso()

        # Reset signatures for both parties — the agreement stays, consent is withdrawn
        new_content["signatures"]["tenant"] = {
            "signed_name": None, "signed_at": None, "consent_status": "pending", "consent_version": 0,
        }
        new_content["signatures"]["manager"] = {
            "signed_name": None, "signed_at": None, "consent_status": "pending", "consent_version": 0,
        }

        # Update the same document in-place (no new document, no superseding)
        self.supabase.table("agreement_documents").update({
            "content": new_content,
            "version": new_version,
            "status": "awaiting_tenant_consent",
            "updated_at": _now_iso(),
        }).eq("id", str(current["id"])).execute()
        document = self.get_document_by_id(str(current["id"]))

        # Reset consent records for this document
        self.supabase.table("agreement_consents").update({
            "consent_status": "pending",
            "signed_name": None,
        }).eq("agreement_document_id", str(current["id"])).execute()

        self.record_audit_event(
            lease_id=str(lease_id),
            agreement_document_id=str(current["id"]),
            actor_user_id=str(actor_user_id),
            event_type="agreement_edited",
            evidence_hash=hashlib.sha256(json.dumps(new_content, default=str).encode()).hexdigest(),
            metadata={
                "previous_version": prev_version,
                "new_version": new_version,
                "agreement_number": new_content["agreement_number"],
            },
        )

        return {**document, "content": new_content}

    # ─── Content ───────────────────────────────────────────────────────────

    @with_retry
    def get_content(self, lease_id: UUID) -> dict[str, Any] | None:
        doc = self.get_current_document(lease_id)
        if doc:
            return doc.get("content")
        return None

    # ─── Consent ───────────────────────────────────────────────────────────

    @with_retry
    def record_consent(
        self,
        *,
        lease: dict[str, Any],
        document: dict[str, Any],
        party_role: str,
        user_id: str,
        signed_name: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> dict[str, Any]:
        content = document.get("content")
        if not content:
            raise HTTPException(status_code=400, detail="Agreement has no content")

        signatures = content.get("signatures", {})
        role_signature = signatures.get(party_role, {})

        new_consent_version = (role_signature.get("consent_version", 0) or 0) + 1

        evidence_hash = hashlib.sha256(json.dumps(content, default=str).encode()).hexdigest()

        payload = {
            "lease_id": str(lease["id"]),
            "agreement_document_id": str(document["id"]),
            "agreement_hash": evidence_hash,
            "party_role": party_role,
            "user_id": str(user_id),
            "consent_status": "approved",
            "signed_name": signed_name,
            "consent_version": new_consent_version,
            "consented_at": _now_iso(),
            "ip_address": ip_address,
            "user_agent": user_agent,
        }
        response = self.supabase.table("agreement_consents").insert(payload).execute()
        consent = response.data[0]

        # Update content JSON with signature
        role_signature["signed_name"] = signed_name
        role_signature["signed_at"] = _now_iso()
        role_signature["consent_status"] = "approved"
        role_signature["consent_version"] = new_consent_version
        signatures[party_role] = role_signature
        content["signatures"] = signatures

        # Determine new agreement status
        other_role = "manager" if party_role == "tenant" else "tenant"
        other_signed = (
            signatures.get(other_role, {}).get("consent_status") == "approved"
        )

        if other_signed:
            new_status = "executed"
        elif party_role == "manager":
            new_status = "awaiting_tenant_consent"
        else:
            new_status = "awaiting_manager_consent"

        self.supabase.table("agreement_documents").update({
            "content": content,
            "status": new_status,
            "updated_at": _now_iso(),
        }).eq("id", str(document["id"])).execute()

        self.record_audit_event(
            lease_id=str(lease["id"]),
            agreement_document_id=str(document["id"]),
            actor_user_id=str(user_id),
            event_type=f"{party_role}_consented",
            evidence_hash=evidence_hash,
            metadata={
                "agreement_consent_id": consent["id"],
                "signed_name": signed_name,
                "consent_version": new_consent_version,
                "agreement_version": content.get("version"),
                "party_role": party_role,
            },
        )
        return consent

    def build_consent_state(self, document: dict[str, Any] | None) -> dict[str, Any]:
        state = {
            "current_document": document,
            "manager": {
                "signed_name": None, "signed_at": None,
                "consent_status": "pending", "consent_version": 0, "user_id": None,
            },
            "tenant": {
                "signed_name": None, "signed_at": None,
                "consent_status": "pending", "consent_version": 0, "user_id": None,
            },
            "content": None,
        }
        if document:
            content = document.get("content")
            if content:
                state["content"] = content
                sigs = content.get("signatures", {})
                for role in ("manager", "tenant"):
                    rs = sigs.get(role, {})
                    state[role] = {
                        "signed_name": rs.get("signed_name"),
                        "signed_at": rs.get("signed_at"),
                        "consent_status": rs.get("consent_status", "pending"),
                        "consent_version": rs.get("consent_version", 0),
                        "user_id": None,
                    }
                # Also fetch user_ids from consents table
                try:
                    consents = self.list_consents(str(document["id"]))
                    for c in consents:
                        role = c.get("party_role")
                        if role in state:
                            state[role]["user_id"] = c.get("user_id")
                except Exception:
                    pass
        return state

    # ─── Cancel ──────────────────────────────────────────────────────────────

    @with_retry
    def cancel_agreement(self, lease_id: UUID, actor_user_id: str) -> dict[str, Any]:
        """Cancel the current agreement and reset all consent statuses."""
        current = self.get_current_document(lease_id)
        if not current:
            raise HTTPException(status_code=404, detail="No active agreement found to cancel")

        content = current.get("content")
        if content:
            sigs = content.get("signatures", {})
            for role in ("tenant", "manager"):
                if role in sigs:
                    sigs[role]["signed_name"] = None
                    sigs[role]["signed_at"] = None
                    sigs[role]["consent_status"] = "pending"
                    sigs[role]["consent_version"] = 0
            content["signatures"] = sigs

        self.supabase.table("agreement_documents").update({
            "is_active": False,
            "status": "cancelled",
            "content": content,
            "updated_at": _now_iso(),
        }).eq("id", str(current["id"])).execute()

        # Reset consent records in agreement_consents table
        self.supabase.table("agreement_consents").update({
            "consent_status": "pending",
            "signed_name": None,
        }).eq("agreement_document_id", str(current["id"])).execute()

        self.record_audit_event(
            lease_id=str(lease_id),
            agreement_document_id=str(current["id"]),
            actor_user_id=str(actor_user_id),
            event_type="agreement_cancelled",
            evidence_hash=hashlib.sha256(json.dumps(content or {}, default=str).encode()).hexdigest(),
            metadata={"previous_status": current.get("status"), "version": current.get("version")},
        )

        return {"success": True, "status": "cancelled"}

    # ─── Legacy (upload flow) ──────────────────────────────────────────────

    @with_retry
    def list_versions(self, lease_id: UUID) -> list[dict[str, Any]]:
        documents = self.get_all_documents(lease_id)
        versions: list[dict[str, Any]] = []
        for doc in documents:
            content = doc.get("content") or {}
            sigs = content.get("signatures", {}) if content else {}
            versions.append({
                "id": doc["id"],
                "version": doc.get("version", 1),
                "agreement_number": doc.get("agreement_number"),
                "agreement_type": doc.get("agreement_type", "uploaded"),
                "status": doc.get("status", "active"),
                "tenant_signed": sigs.get("tenant", {}).get("consent_status") == "approved" if sigs else False,
                "manager_signed": sigs.get("manager", {}).get("consent_status") == "approved" if sigs else False,
                "tenant_signed_name": (sigs.get("tenant", {}) or {}).get("signed_name") if sigs else None,
                "manager_signed_name": (sigs.get("manager", {}) or {}).get("signed_name") if sigs else None,
                "created_at": doc.get("created_at"),
            })
        return versions

    @with_retry
    def list_consents(self, document_id: str) -> list[dict[str, Any]]:
        response = (
            self.supabase.table("agreement_consents")
            .select("*")
            .eq("agreement_document_id", document_id)
            .eq("consent_status", "approved")
            .order("consented_at", desc=True)
            .execute()
        )
        return response.data or []

    def build_state(self, document: dict[str, Any] | None) -> dict[str, Any]:
        """Legacy state builder for upload flow — returns boolean consent flags."""
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
        self, *, lease: dict[str, Any], user_id: str,
        file_name: str | None, mime_type: str | None, file_bytes: bytes,
    ) -> dict[str, Any]:
        content_type = (mime_type or "application/octet-stream").lower()
        if content_type not in ALLOWED_AGREEMENT_MIME_TYPES:
            raise HTTPException(status_code=400, detail="Agreement must be a PDF or image file.")
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        digest = hashlib.sha256(file_bytes).hexdigest()
        safe_name = _safe_filename(file_name)

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
                {"is_active": False, "status": "superseded"}
            ).eq("id", str(prev["id"])).execute()

        storage_path = f"{lease['id']}/v{next_version}-{digest[:16]}-{safe_name}"
        self.supabase.storage.from_(AGREEMENT_BUCKET).upload(
            storage_path, file_bytes,
            {"content-type": content_type, "upsert": "true"},
        )
        signed = self.supabase.storage.from_(AGREEMENT_BUCKET).create_signed_url(
            storage_path, AGREEMENT_SIGNED_URL_TTL_SECONDS,
        )
        agreement_url = signed.get("signedURL") or signed.get("signedUrl")
        if not agreement_url:
            raise HTTPException(status_code=500, detail="Failed to create signed agreement URL")

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
            "agreement_type": "uploaded",
        }
        response = self.supabase.table("agreement_documents").insert(payload).execute()
        document = response.data[0]
        self.record_audit_event(
            lease_id=str(lease["id"]),
            agreement_document_id=str(document["id"]),
            actor_user_id=str(user_id),
            event_type="agreement_uploaded",
            evidence_hash=digest,
            metadata={"file_name": safe_name, "file_mime_type": content_type, "version": next_version},
        )
        return document

    # ─── Audit ─────────────────────────────────────────────────────────────

    @with_retry
    def record_audit_event(
        self, *, lease_id: str, agreement_document_id: str,
        actor_user_id: str, event_type: str, evidence_hash: str,
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


def get_agreement_service(supabase: Client = Depends(get_service_client)) -> AgreementService:
    return AgreementService(supabase)
