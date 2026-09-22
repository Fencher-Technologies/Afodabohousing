-- Tenant/manager "request changes" writes a {role}_rejected audit event, which
-- the check constraint did not allow. The rejection was saved first, so the
-- manager saw it, but the request then failed and the tenant was told
-- "Could not submit" and never saw the success message.
ALTER TABLE agreement_audit_logs DROP CONSTRAINT IF EXISTS agreement_audit_logs_event_type_check;
ALTER TABLE agreement_audit_logs ADD CONSTRAINT agreement_audit_logs_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'agreement_uploaded','agreement_generated','agreement_edited',
    'tenant_consented','manager_consented',
    'tenant_rejected','manager_rejected',
    'agreement_superseded','agreement_cancelled','pdf_downloaded'
  ]));
