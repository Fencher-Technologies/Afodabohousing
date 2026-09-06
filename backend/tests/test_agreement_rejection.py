"""Tenant-initiated agreement rejection.

Covers the parts of reject_agreement that are easy to get wrong: the document
must land in `changes_requested` with the comment stored, and any consent the
other party already gave must be cleared — they signed a version that is now
under objection, so it has to be re-signed after the manager revises it.
"""

from unittest.mock import MagicMock

import pytest

from services.agreements import AgreementService


class _Table:
    """Minimal stand-in for the supabase table builder used by the service."""

    def __init__(self, recorder, name):
        self._recorder = recorder
        self._name = name
        self._payload = None

    def insert(self, payload):
        self._payload = payload
        self._recorder.setdefault("inserts", []).append((self._name, payload))
        return self

    def update(self, payload):
        self._payload = payload
        self._recorder.setdefault("updates", []).append((self._name, payload))
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def execute(self):
        result = MagicMock()
        if self._name == "agreement_consents":
            row = dict(self._payload or {})
            row.setdefault("id", "consent-1")
            result.data = [row]
        else:
            result.data = [{}]
        return result


@pytest.fixture
def service_and_calls():
    calls: dict = {}
    supabase = MagicMock()
    supabase.table.side_effect = lambda name: _Table(calls, name)
    svc = AgreementService(supabase)
    svc.record_audit_event = MagicMock()
    return svc, calls


def _document(*, manager_approved: bool):
    signatures = {
        "tenant": {"consent_status": "pending", "consent_version": 0},
        "manager": {
            "consent_status": "approved" if manager_approved else "pending",
            "signed_name": "Micheal" if manager_approved else None,
            "signed_at": "2026-09-01T10:00:00Z" if manager_approved else None,
            "consent_version": 1 if manager_approved else 0,
        },
    }
    return {
        "id": "doc-1",
        "lease_id": "lease-1",
        "status": "awaiting_tenant_consent",
        "content": {"version": 2, "agreement_number": "AGR-1", "signatures": signatures},
    }


def test_rejection_sets_changes_requested_and_stores_reason(service_and_calls):
    svc, calls = service_and_calls
    reason = "The notice period in clause 5 should be two months."

    consent = svc.reject_agreement(
        lease={"id": "lease-1"},
        document=_document(manager_approved=False),
        party_role="tenant",
        user_id="user-1",
        reason=reason,
        ip_address="127.0.0.1",
        user_agent="pytest",
    )

    assert consent["consent_status"] == "declined"
    assert consent["rejection_reason"] == reason

    doc_updates = [p for name, p in calls["updates"] if name == "agreement_documents"]
    assert len(doc_updates) == 1
    update = doc_updates[0]
    assert update["status"] == "changes_requested"
    assert update["rejection_reason"] == reason
    assert update["rejected_by"] == "user-1"
    assert update["rejected_at"]

    tenant_sig = update["content"]["signatures"]["tenant"]
    assert tenant_sig["consent_status"] == "declined"
    assert tenant_sig["rejection_reason"] == reason


def test_rejection_clears_the_other_partys_consent(service_and_calls):
    svc, calls = service_and_calls

    svc.reject_agreement(
        lease={"id": "lease-1"},
        document=_document(manager_approved=True),
        party_role="tenant",
        user_id="user-1",
        reason="Rent figure is wrong.",
        ip_address=None,
        user_agent=None,
    )

    update = [p for name, p in calls["updates"] if name == "agreement_documents"][0]
    manager_sig = update["content"]["signatures"]["manager"]
    assert manager_sig["consent_status"] == "pending"
    assert manager_sig["signed_name"] is None
    assert manager_sig["signed_at"] is None


def test_rejection_is_audited(service_and_calls):
    svc, _calls = service_and_calls

    svc.reject_agreement(
        lease={"id": "lease-1"},
        document=_document(manager_approved=False),
        party_role="tenant",
        user_id="user-1",
        reason="Please add the parking space.",
        ip_address=None,
        user_agent=None,
    )

    svc.record_audit_event.assert_called_once()
    kwargs = svc.record_audit_event.call_args.kwargs
    assert kwargs["event_type"] == "tenant_rejected"
    assert kwargs["metadata"]["rejection_reason"] == "Please add the parking space."
