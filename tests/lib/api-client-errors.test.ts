import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const outputError = vi.fn((message: string) => {
  throw new Error(message);
});

vi.mock("../../src/lib/config.js", () => ({
  getApiUrl: () => "https://example.test",
  loadCredentials: () => ({
    token: "token",
    apiUrl: "https://example.test",
    deviceName: "test",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    scope: "FULL",
  }),
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    error: outputError,
  },
}));

const { apiRequest } = await import("../../src/lib/api-client.js");

function headersOf(entries: Record<string, string>) {
  return {
    get: (key: string) => entries[key.toLowerCase()] ?? null,
  };
}

describe("apiRequest backend error codes", () => {
  const originalDebug = process.env.LUCAS_DEBUG;

  beforeEach(() => {
    outputError.mockClear();
    delete process.env.LUCAS_DEBUG;
  });

  afterEach(() => {
    if (originalDebug === undefined) {
      delete process.env.LUCAS_DEBUG;
    } else {
      process.env.LUCAS_DEBUG = originalDebug;
    }
  });

  it("passes backend error messages through instead of hardcoded plan copy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({
          code: "AI_PLAN_REQUIRED",
          message: "raw backend message",
          details: {
            token: "secret-token",
            nested: { password: "super-secret" },
          },
        }),
      })),
    );

    await expect(apiRequest("GET", "/api/ai/usage")).rejects.toThrow(
      "raw backend message",
    );
    expect(outputError).toHaveBeenCalledWith("raw backend message", 403, {
      code: "AI_PLAN_REQUIRED",
      message: "raw backend message",
      statusCode: 403,
    });
  });

  it("maps CLI_READ_ONLY to an actionable message even when the backend sends its own", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({
          code: "CLI_READ_ONLY",
          message: "Token de solo lectura",
        }),
      })),
    );

    await expect(apiRequest("POST", "/api/transactions", {})).rejects.toThrow(
      "Your CLI token is read-only. Re-link with full access from the app to use write commands.",
    );
  });

  it("maps CLI_FORBIDDEN_ENDPOINT to an actionable message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({
          code: "CLI_FORBIDDEN_ENDPOINT",
          message: "Endpoint no disponible",
        }),
      })),
    );

    await expect(apiRequest("GET", "/api/devices")).rejects.toThrow(
      "This endpoint is not available from the CLI.",
    );
  });

  it("redacts backend details when LUCAS_DEBUG is enabled", async () => {
    process.env.LUCAS_DEBUG = "1";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({
          code: "INTERNAL_ERROR",
          message: "Backend failed",
          details: {
            accessToken: "secret-token",
            nested: { password: "super-secret", hint: "keep" },
          },
        }),
      })),
    );

    await expect(apiRequest("GET", "/api/accounts")).rejects.toThrow(
      "Backend failed",
    );

    expect(outputError).toHaveBeenCalledWith("Backend failed", 500, {
      code: "INTERNAL_ERROR",
      message: "Backend failed",
      statusCode: 500,
      details: {
        code: "INTERNAL_ERROR",
        message: "Backend failed",
        details: {
          accessToken: "[REDACTED]",
          nested: { password: "[REDACTED]", hint: "keep" },
        },
      },
    });
  });

  it("keeps safe backend error data visible without debug mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 409,
        json: async () => ({
          statusMessage: "INVESTMENT_INSTRUMENT_AMBIGUOUS",
          message: "Instrument is ambiguous",
          data: {
            symbol: "ASML",
            candidates: [{ id: "inst-1", symbol: "ASML" }],
            token: "secret-token",
          },
        }),
      })),
    );

    await expect(apiRequest("GET", "/api/investments")).rejects.toThrow(
      "Instrument is ambiguous",
    );

    expect(outputError).toHaveBeenCalledWith("Instrument is ambiguous", 409, {
      code: "INVESTMENT_INSTRUMENT_AMBIGUOUS",
      message: "Instrument is ambiguous",
      data: {
        symbol: "ASML",
        candidates: [{ id: "inst-1", symbol: "ASML" }],
        token: "[REDACTED]",
      },
      statusCode: 409,
    });
  });

  it("exposes the backend x-request-id in error details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 404,
        headers: headersOf({ "x-request-id": "req-abc-123" }),
        json: async () => ({
          code: "RESOURCE_NOT_FOUND",
          message: "No encontrado",
        }),
      })),
    );

    await expect(apiRequest("GET", "/api/accounts/nope")).rejects.toThrow(
      "No encontrado",
    );

    expect(outputError).toHaveBeenCalledWith("No encontrado", 404, {
      code: "RESOURCE_NOT_FOUND",
      message: "No encontrado",
      statusCode: 404,
      requestId: "req-abc-123",
    });
  });

  it("surfaces Retry-After and request id on 429 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 429,
        headers: headersOf({
          "retry-after": "30",
          "x-request-id": "req-rate-1",
        }),
        json: async () => ({
          message: "Demasiadas solicitudes",
          data: { retryAfterSeconds: 30 },
        }),
      })),
    );

    await expect(apiRequest("GET", "/api/accounts")).rejects.toThrow(
      "Rate limited. Retry in 30s.",
    );

    expect(outputError).toHaveBeenCalledWith(
      "Rate limited. Retry in 30s.",
      429,
      expect.objectContaining({
        code: "RATE_LIMITED",
        retryAfterSeconds: 30,
        requestId: "req-rate-1",
        statusCode: 429,
      }),
    );
  });

  it("maps aborted requests to a structured timeout error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const error = new Error("This operation was aborted");
        error.name = "AbortError";
        throw error;
      }),
    );

    await expect(apiRequest("GET", "/api/accounts")).rejects.toThrow(
      "Request timed out after 30s. Try again or check the API status.",
    );

    expect(outputError).toHaveBeenCalledWith(
      "Request timed out after 30s. Try again or check the API status.",
      504,
      { code: "TIMEOUT", timeoutMs: 30000, statusCode: 504 },
    );
  });

  it("maps network failures to a CLI-friendly message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(apiRequest("GET", "/api/accounts")).rejects.toThrow(
      "Cannot reach LucasApp API at https://example.test. Check your connection or run: lucas auth login",
    );

    expect(outputError).toHaveBeenCalledWith(
      "Cannot reach LucasApp API at https://example.test. Check your connection or run: lucas auth login",
      503,
      {
        code: "NETWORK_ERROR",
        apiUrl: "https://example.test",
        statusCode: 503,
      },
    );
  });

  it.each([
    [
      "AI_PLAN_REQUIRED",
      "Your current plan does not include this AI feature. Check LucasApp for upgrade options.",
    ],
    [
      "AI_LIMIT_REACHED",
      "AI usage limit reached. Try again after your quota resets.",
    ],
    ["SUBSCRIPTION_REQUIRED", "This feature requires Premium."],
    [
      "ACCOUNT_LIMIT_EXCEEDED",
      "Active account limit reached for your plan. Upgrade to add more accounts.",
    ],
  ])(
    "falls back to neutral copy for %s when the backend sends no message",
    async (code, message) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: false,
          status: 402,
          json: async () => ({ statusMessage: code }),
        })),
      );

      await expect(apiRequest("GET", "/api/subscriptions")).rejects.toThrow(
        message,
      );
    },
  );
});
