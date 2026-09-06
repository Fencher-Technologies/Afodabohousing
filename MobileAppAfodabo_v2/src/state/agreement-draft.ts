/**
 * In-memory handoff for the agreement builder.
 *
 * The clause list used to be serialised into an expo-router URL parameter on
 * the way from create-agreement -> agreement-summary -> agreement-preview.
 * The default template carries twelve clauses of full legal prose, so that
 * string ran to several kilobytes; when it failed to arrive or failed to
 * parse, the summary screen fell back to the template defaults. That silently
 * re-enabled clauses the manager had switched off and threw away any edits
 * they had made to clause text.
 *
 * Keeping the draft in module scope avoids the size limit entirely. It is
 * deliberately not persisted: a draft only needs to survive the few seconds
 * between screens in a single flow.
 */

import type { AgreementCustomClause, AgreementStandardClause } from "@/src/types";

export interface AgreementDraft {
  leaseId: string;
  standardClauses: AgreementStandardClause[];
  customClauses: AgreementCustomClause[];
}

let draft: AgreementDraft | null = null;

export function setAgreementDraft(next: AgreementDraft): void {
  draft = next;
}

/** Returns the draft only when it belongs to the lease being edited. */
export function getAgreementDraft(leaseId: string | undefined): AgreementDraft | null {
  if (!draft || !leaseId || draft.leaseId !== leaseId) return null;
  return draft;
}

export function clearAgreementDraft(): void {
  draft = null;
}
