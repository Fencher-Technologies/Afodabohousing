import type { AgreementContent } from "@/src/types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d: string): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d.slice(0, 10);
  }
}

function formatMoney(v: string | number): string {
  const n = typeof v === "string" ? parseInt(v, 10) : v;
  return `UGX ${n.toLocaleString("en-UG")}`;
}

export function buildAgreementHtml(content: AgreementContent): string {
  const { tenant, manager, property, tenancy, standard_clauses, custom_clauses, signatures } = content;

  const tenantSig = signatures?.tenant;
  const managerSig = signatures?.manager;

  // ── Standard clauses (only enabled) ───────────────────────────────
  const enabledClauses = (standard_clauses || []).filter((c) => c.enabled);
  const stdClausesHtml = enabledClauses
    .map(
      (c, i) => `
    <div class="clause">
      <div class="clause-title">${i + 1}. ${esc(c.title)}</div>
      <div class="clause-body">${esc(c.content)}</div>
    </div>`
    )
    .join("");

  // ── Custom clauses ────────────────────────────────────────────────
  const customClausesHtml = (custom_clauses || [])
    .map(
      (c, i) => `
    <div class="clause">
      <div class="clause-title">${i + 1}. ${esc(c.title)}</div>
      <div class="clause-body">${esc(c.content)}</div>
    </div>`
    )
    .join("");

  // ── Signature blocks ──────────────────────────────────────────────
  const tenantSigHtml = tenantSig?.signed_name
    ? `<div class="sig-name">${esc(tenantSig.signed_name)}</div>
       <div class="sig-meta">Signed: ${formatDate(tenantSig.signed_at || "")}</div>
       <div class="sig-meta">Consent v${tenantSig.consent_version || 0} | Agreement v${content.version}</div>`
    : `<div class="sig-line">__________________________</div>
       <div class="sig-pending">Awaiting signature</div>`;

  const managerSigHtml = managerSig?.signed_name
    ? `<div class="sig-name">${esc(managerSig.signed_name)}</div>
       <div class="sig-meta">Signed: ${formatDate(managerSig.signed_at || "")}</div>
       <div class="sig-meta">Consent v${managerSig.consent_version || 0} | Agreement v${content.version}</div>`
    : `<div class="sig-line">__________________________</div>
       <div class="sig-pending">Awaiting signature</div>`;

  // ── Amenities ─────────────────────────────────────────────────────
  const amenities = (property?.amenities || []).join(", ");

  // ── Full HTML ─────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Tenancy Agreement ${esc(content.agreement_number || "")}</title>
  <style>
    @page { margin: 16mm 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, Helvetica, Arial, sans-serif;
      color: #1A1F1C;
      font-size: 13px;
      line-height: 1.45;
    }

    /* ── Header ─────────────────────────────────────────────────── */
    .header {
      text-align: center;
      padding-bottom: 14px;
      border-bottom: 2px solid #1A1F1C;
      margin-bottom: 14px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1A1F1C;
      margin: 0 0 4px;
    }
    .header .meta {
      font-size: 11px;
      color: #8A9089;
    }
    .header .meta + .meta { margin-top: 0; }

    /* ── Sections ───────────────────────────────────────────────── */
    .section { margin-bottom: 14px; }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #236048;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 6px;
    }
    .subheading {
      font-size: 11px;
      font-weight: 700;
      color: #5A635E;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-top: 6px;
      margin-bottom: 2px;
    }
    .body-text {
      font-size: 13px;
      color: #1A1F1C;
      line-height: 1.5;
    }

    /* ── Terms table ────────────────────────────────────────────── */
    .terms { width: 100%; border-collapse: collapse; margin-top: 4px; }
    .terms td {
      padding: 3px 0;
      font-size: 13px;
    }
    .terms td:first-child {
      color: #8A9089;
      width: 45%;
    }
    .terms td:last-child {
      font-weight: 600;
      color: #1A1F1C;
      text-align: right;
    }

    /* ── Clauses ───────────────────────────────────────────────── */
    .clause { margin-bottom: 6px; }
    .clause-title {
      font-weight: 700;
      font-size: 13px;
      color: #1A1F1C;
      margin-bottom: 1px;
    }
    .clause-body {
      font-size: 13px;
      color: #1A1F1C;
      line-height: 1.5;
    }

    /* ── Signatures ─────────────────────────────────────────────── */
    .sig-section { margin-top: 20px; }
    .sig-block {
      padding-top: 12px;
      border-top: 1px solid #E5E1DA;
      margin-bottom: 16px;
    }
    .sig-label {
      font-size: 11px;
      font-weight: 700;
      color: #5A635E;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .sig-name {
      font-size: 16px;
      font-weight: 700;
      color: #1A1F1C;
      text-transform: lowercase;
      font-variant: small-caps;
      padding: 6px 0;
    }
    .sig-meta {
      font-size: 10px;
      color: #8A9089;
    }
    .sig-line {
      font-size: 13px;
      color: #8A9089;
      font-style: italic;
      padding: 6px 0;
    }
    .sig-pending {
      font-size: 11px;
      color: #8A9089;
      font-style: italic;
    }
    .sig-intro {
      font-size: 13px;
      color: #1A1F1C;
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .footer {
      text-align: center;
      font-size: 9px;
      color: #8A9089;
      margin-top: 24px;
      border-top: 1px solid #E5E1DA;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <!-- ═══ Header ═══ -->
  <div class="header">
    <h1>TENANCY AGREEMENT</h1>
    ${content.agreement_number ? `<div class="meta">No. ${esc(content.agreement_number)}</div>` : ""}
    <div class="meta">Version ${content.version}</div>
    ${content.generated_at ? `<div class="meta">Generated: ${formatDate(content.generated_at)}</div>` : ""}
  </div>

  <!-- ═══ Section 1: Parties and Property ═══ -->
  <div class="section">
    <div class="section-title">1. Parties and Property</div>

    <div class="subheading">Tenant</div>
    <div class="body-text">${esc(tenant?.full_name || "")}</div>
    ${tenant?.email ? `<div class="body-text">Email: ${esc(tenant.email)}</div>` : ""}
    ${tenant?.phone ? `<div class="body-text">Phone: ${esc(tenant.phone)}</div>` : ""}

    <div class="subheading">Landlord / Manager</div>
    <div class="body-text">${esc(manager?.full_name || "")}</div>
    ${manager?.email ? `<div class="body-text">Email: ${esc(manager.email)}</div>` : ""}
    ${manager?.phone ? `<div class="body-text">Phone: ${esc(manager.phone)}</div>` : ""}

    <div class="subheading">Property</div>
    <div class="body-text">${esc(property?.title || "")}</div>
    ${property?.address ? `<div class="body-text">${esc(property.address)}</div>` : ""}
    ${property?.city ? `<div class="body-text">${esc(property.city)}</div>` : ""}
    ${property?.description ? `<div class="body-text">${esc(property.description)}</div>` : ""}
    ${amenities ? `<div class="subheading">Amenities</div><div class="body-text">${esc(amenities)}</div>` : ""}
  </div>

  <!-- ═══ Section 2: Tenancy Terms ═══ -->
  <div class="section">
    <div class="section-title">2. Tenancy Terms</div>
    <table class="terms">
      <tr><td>Monthly Rent</td><td>${formatMoney(tenancy?.monthly_rent)}</td></tr>
      <tr><td>Security Deposit</td><td>${formatMoney(tenancy?.security_deposit)}</td></tr>
      <tr><td>Payment Frequency</td><td>${esc(tenancy?.payment_frequency || "monthly")}</td></tr>
      <tr><td>Start Date</td><td>${formatDate(tenancy?.start_date || "")}</td></tr>
      <tr><td>End Date</td><td>${formatDate(tenancy?.end_date || "")}</td></tr>
    </table>
  </div>

  <!-- ═══ Section 3: Standard Clauses ═══ -->
  ${stdClausesHtml ? `
  <div class="section">
    <div class="section-title">3. Standard Terms and Conditions</div>
    ${stdClausesHtml}
  </div>` : ""}

  <!-- ═══ Section 4: Custom Clauses ═══ -->
  ${customClausesHtml ? `
  <div class="section">
    <div class="section-title">4. Additional Terms</div>
    ${customClausesHtml}
  </div>` : ""}

  <!-- ═══ Section 5: Signatures ═══ -->
  <div class="section sig-section">
    <div class="section-title">5. Signatures</div>
    <div class="sig-intro">
      By signing below, the parties acknowledge that they have read and agree to the terms of this tenancy agreement.
    </div>

    <div class="sig-block">
      <div class="sig-label">Tenant</div>
      ${tenantSigHtml}
    </div>

    <div class="sig-block">
      <div class="sig-label">Landlord / Manager</div>
      ${managerSigHtml}
    </div>
  </div>

  <div class="footer">
    Generated digitally by Afodabo Housing &mdash; ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
  </div>

</body>
</html>`;
}
