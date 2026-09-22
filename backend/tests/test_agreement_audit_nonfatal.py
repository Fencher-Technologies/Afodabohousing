# mypy: ignore-errors
"""A failed audit-log write must not fail the user's action.

An event type missing from the audit table's check constraint made every
"request changes" return 500 after the rejection had already been saved, so
tenants saw "Could not submit" while the manager received the comment.
"""
from services.agreements import AgreementService


class _Boom:
    def table(self, _name):
        return self

    def insert(self, _payload):
        return self

    def execute(self):
        raise Exception('violates check constraint "agreement_audit_logs_event_type_check"')


def test_audit_write_failure_is_logged_not_raised(caplog):
    svc = AgreementService(_Boom())
    svc.record_audit_event(
        lease_id="l1", agreement_document_id="d1", actor_user_id="u1",
        event_type="tenant_rejected", evidence_hash="a" * 64, metadata={},
    )
    assert "Agreement audit write failed" in caplog.text
