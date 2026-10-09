import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

/**
 * contact-support — delivers the website "Contact Support" form to the Axis
 * support mailbox.
 *
 * Before this existed the web form only simulated a send with a timeout, so
 * every message the public wrote was silently discarded. The client reported
 * lodging two complaints that never arrived; this is the fix.
 *
 * The function is public (verify_jwt disabled) because the form is open to
 * visitors who are not signed in, so it carries its own abuse controls:
 * field validation, a length cap, a honeypot field and a per-IP rate limit.
 *
 * Required secret: SMTP_PASSWORD (the info@axishousings.com mailbox password,
 * the same one send-email uses).
 * Optional overrides: SMTP_HOST, SMTP_PORT, SMTP_USER, EMAIL_FROM,
 * SUPPORT_EMAIL, SITE_URL.
 */

const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "smtp.dreamhost.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "465");
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "info@axishousings.com";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "Axis Housing <info@axishousings.com>";
const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") ?? "support@axishousings.com";
const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://www.axishousings.com").replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUBJECT_LABELS: Record<string, string> = {
  general: "General Inquiry",
  listing: "Property Listing",
  payment: "Payment Issue",
  tenancy: "Tenancy Problem",
  account: "Account Support",
  report: "Report a Problem",
  fraud: "Report Suspected Fraud",
};

/** In-memory per-IP throttle. Resets whenever the isolate recycles, which is
 *  fine: it exists to blunt bursts, not to be an audit trail. */
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return false;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Strip CR/LF so a hostile value cannot inject extra SMTP headers. */
function oneLine(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

function renderHtml(fields: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): string {
  const rows = [
    ["Name", fields.name],
    ["Email", fields.email],
    ["Phone", fields.phone || "Not provided"],
    ["Topic", fields.subject],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6b756f;white-space:nowrap">${k}</td><td style="padding:4px 0;font-weight:bold">${escapeHtml(v)}</td></tr>`,
    )
    .join("");

  const body = escapeHtml(fields.message).replace(/\n/g, "<br>");

  return `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:Arial,Helvetica,sans-serif;color:#1f2a24">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:#161E31;padding:14px 24px">
<span style="display:inline-block;background:#ffffff;border-radius:6px;padding:5px 8px;vertical-align:middle">
<img src="${SITE_URL}/axis-logo.png" height="30" alt="Axis Housing" style="display:block;border:0">
</span>
</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.5">
<h2 style="margin:0 0 14px;font-size:19px">New message from the website</h2>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;margin:0 0 16px">${rows}</table>
<div style="border-top:1px solid #e6e8e6;padding-top:14px">${body}</div>
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #e6e8e6;font-size:12px;color:#6b756f">
Sent from the Contact Support form on ${SITE_URL}. Reply directly to answer the sender.
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return json({ success: false, error: "Too many messages. Please try again later." }, 429);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ success: false, error: "Body must be JSON" }, 400);
  }

  // Honeypot: a real person never fills a hidden field.
  if (typeof payload.company === "string" && payload.company.trim() !== "") {
    return json({ success: true }, 200);
  }

  const name = oneLine(String(payload.name ?? "")).slice(0, 120);
  const email = oneLine(String(payload.email ?? "")).slice(0, 160);
  const phone = oneLine(String(payload.phone ?? "")).slice(0, 40);
  const subjectKey = oneLine(String(payload.subject ?? "")).slice(0, 40);
  const message = String(payload.message ?? "").trim().slice(0, 5000);

  if (!name || !email || !subjectKey || !message) {
    return json({ success: false, error: "Name, email, topic and message are required." }, 400);
  }
  if (!isEmail(email)) {
    return json({ success: false, error: "That email address does not look right." }, 400);
  }

  const subjectLabel = SUBJECT_LABELS[subjectKey] ?? subjectKey;

  const password = Deno.env.get("SMTP_PASSWORD");
  if (!password) {
    return json({ success: false, error: "Email is not configured (SMTP_PASSWORD secret missing)" }, 503);
  }

  const text = [
    `New message from the Axis Housing website.`,
    ``,
    `Name:  ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    `Topic: ${subjectLabel}`,
    ``,
    message,
  ].join("\n");

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: true,
      auth: { username: SMTP_USER, password },
    },
  });

  try {
    await client.send({
      from: EMAIL_FROM,
      to: SUPPORT_EMAIL,
      // Replying in the mailbox answers the person who wrote in.
      replyTo: `${name} <${email}>`,
      subject: `[${subjectLabel}] Website message from ${name}`,
      content: text,
      html: renderHtml({ name, email, phone, subject: subjectLabel, message }),
    });
    return json({ success: true }, 200);
  } catch (error) {
    console.error("contact-support failed:", error);
    return json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      502,
    );
  } finally {
    try { await client.close(); } catch { /* already closed */ }
  }
});
