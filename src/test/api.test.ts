import { describe, it, expect } from "vitest";
import { ApiError, toApiError } from "@/services/api";

function failure(status: number, body: string, headers: Record<string, string> = {}) {
  return new Response(body, { status, headers });
}

describe("toApiError", () => {
  it("reads a string detail and keeps the structured fields", async () => {
    const err = await toApiError(
      failure(403, JSON.stringify({ detail: "House manager access required", error: "http_error", request_id: "req-1", status_code: 403 }))
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("House manager access required");
    expect(err.status).toBe(403);
    expect(err.code).toBe("http_error");
    expect(err.requestId).toBe("req-1");
  });

  it("never shows raw JSON as the message", async () => {
    const err = await toApiError(failure(400, JSON.stringify({ detail: "Bad", error: "x", request_id: "r", status_code: 400 })));
    expect(err.message.startsWith("{")).toBe(false);
  });

  it("uses an object detail's message and exposes the detail for plan-limit handling", async () => {
    const detail = { code: "property_limit_reached", message: "Your plan allows 3 properties." };
    const err = await toApiError(failure(403, JSON.stringify({ detail })));
    expect(err.message).toBe("Your plan allows 3 properties.");
    expect(err.detail).toEqual(detail);
  });

  it("summarises FastAPI validation errors with the field name", async () => {
    const detail = [
      { loc: ["body", "monthly_rent"], msg: "Input should be greater than 0", type: "greater_than" },
      { loc: ["query", "limit"], msg: "Field required", type: "missing" },
    ];
    const err = await toApiError(failure(422, JSON.stringify({ detail })));
    expect(err.message).toBe("monthly_rent: Input should be greater than 0; limit: Field required");
  });

  it("falls back to the error code, then to the status", async () => {
    expect((await toApiError(failure(429, JSON.stringify({ error: "rate_limit_exceeded" })))).message).toBe("rate_limit_exceeded");
    expect((await toApiError(failure(500, JSON.stringify({})))).message).toBe("Request failed (500)");
  });

  it("does not leak a proxy's HTML error page into the message", async () => {
    const err = await toApiError(failure(502, "<html><body>Bad gateway</body></html>"));
    expect(err.message).toBe("Request failed (502)");
    expect(err.body).toBeNull();
  });

  it("keeps a short plain-text body", async () => {
    expect((await toApiError(failure(503, "Service unavailable"))).message).toBe("Service unavailable");
  });

  it("takes the request id from the header when the body has none", async () => {
    const err = await toApiError(failure(500, "", { "x-request-id": "hdr-9" }));
    expect(err.requestId).toBe("hdr-9");
  });
});
