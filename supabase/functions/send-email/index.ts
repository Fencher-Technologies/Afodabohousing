import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * send-email — transactional email for the Axis backend.
 *
 * Why this lives in Supabase rather than the FastAPI backend: the backend's
 * NotificationDispatcher needs a provider URL and API key, and those are
 * backend environment variables on Render. Routing through here instead means
 * the provider key is a Supabase secret, and the backend authenticates with
 * the SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY it already holds. No new
 * Render configuration is required.
 *
 * Secrets required (Supabase dashboard -> Edge Functions -> Secrets):
 *   RESEND_API_KEY   API key from resend.com
 *   EMAIL_FROM       verified sender, e.g. "Axis <no-reply@axishousings.com>"
 *
 * verify_jwt is enabled, so a caller must present a valid Supabase JWT. The
 * backend passes the service role key.
 *
 * Request:  { "to": "a@b.com", "subject": "...", "text": "...", "html"?: "..." }
 * Response: { "success": true, "id": "..." } | { "success": false, "error": "..." }
 */

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!apiKey || !from) {
    // Surfaced as a 503 so the caller records a failed delivery rather than
    // treating a missing secret as a successful send.
    return json(
      { success: false, error: "Email provider is not configured (RESEND_API_KEY / EMAIL_FROM)" },
      503,
    );
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

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        ...(text ? { text } : {}),
        ...(html ? { html } : {}),
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Resend rejected the message:", response.status, result);
      return json(
        { success: false, error: result?.message ?? `Provider returned ${response.status}` },
        502,
      );
    }
    return json({ success: true, id: result?.id ?? null }, 200);
  } catch (error) {
    console.error("send-email failed:", error);
    return json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      502,
    );
  }
});
