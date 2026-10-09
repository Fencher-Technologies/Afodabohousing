import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

/**
 * send-email — transactional email for the Axis backend, sent through the
 * info@axishousings.com mailbox on DreamHost (the same SMTP account Supabase
 * Auth uses for password resets).
 *
 * Previously this called Resend, which was never set up, so every email
 * returned 503 and no notification email was ever delivered.
 *
 * Required secret (Supabase dashboard -> Edge Functions -> Secrets):
 *   SMTP_PASSWORD    password of the info@axishousings.com mailbox
 * Optional overrides: SMTP_HOST, SMTP_PORT, SMTP_USER, EMAIL_FROM, SITE_URL
 *
 * Port 465 (implicit TLS) is used because Supabase Edge Functions block
 * outbound ports 25 and 587.
 *
 * verify_jwt is enabled; the backend authenticates with the service role key.
 *
 * Request:  { "to": "a@b.com", "subject": "...", "text": "...", "html"?: "..." }
 * Response: { "success": true } | { "success": false, "error": "..." }
 */

const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "smtp.dreamhost.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "465");
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "info@axishousings.com";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "Axis Housing <info@axishousings.com>";
const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://www.axishousings.com").replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain notification text wrapped in a simple branded layout.
 *
 * Notifications read as one tight block, the way a message from X or Facebook
 * does. Runs of blank lines are collapsed and each paragraph is trimmed, so a
 * stray newline in the source copy cannot open a gap mid-message, and the
 * paragraph margin is kept small.
 */
function renderHtml(subject: string, text: string): string {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p !== "")
    .map((p) => `<p style="margin:0 0 8px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f5f4;font-family:Arial,Helvetica,sans-serif;color:#1f2a24">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="background:#161E31;padding:14px 24px">
<span style="display:inline-block;background:#ffffff;border-radius:6px;padding:5px 8px;vertical-align:middle">
<img src="${SITE_URL}/axis-logo.png" height="30" alt="Axis Housing" style="display:block;border:0">
</span>
</td></tr>
<tr><td style="padding:20px 24px;font-size:15px;line-height:1.45">
<h2 style="margin:0 0 10px;font-size:18px">${escapeHtml(subject)}</h2>
${paragraphs}
<p style="margin:16px 0 0"><a href="${SITE_URL}/login" style="background:#161E31;color:#ffffff;padding:11px 18px;border-radius:6px;text-decoration:none;display:inline-block">Open Axis</a></p>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e6e8e6;font-size:12px;color:#6b756f">
You received this because you have an Axis account. Questions? Reply to this email or write to support@axishousings.com.
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const password = Deno.env.get("SMTP_PASSWORD");
  if (!password) {
    // 503 so the caller records a failed delivery rather than a false success.
    return json({ success: false, error: "Email is not configured (SMTP_PASSWORD secret missing)" }, 503);
  }

  let payload: { to?: string; subject?: string; text?: string; html?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ success: false, error: "Body must be JSON" }, 400);
  }

  const { to, subject, text, html } = payload;
  if (!to || !subject || (!text && !html)) {
    return json({ success: false, error: "to, subject and one of text/html are required" }, 400);
  }

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
      to,
      replyTo: SMTP_USER,
      subject,
      content: text ?? "",
      html: html ?? renderHtml(subject, text ?? ""),
    });
    return json({ success: true }, 200);
  } catch (error) {
    console.error("send-email failed:", error);
    return json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      502,
    );
  } finally {
    try { await client.close(); } catch { /* already closed */ }
  }
});
