import { beforeEach, describe, expect, it, vi } from "vitest";

const outputError = vi.fn((message: string) => {
  throw new Error(message);
});

vi.mock("../../src/lib/config.js", () => ({
  getApiUrl: () => "https://example.test",
  loadCredentials: () => ({
    token: "token",
    apiUrl: "https://example.test",
    deviceName: "test",
    expiresAt: "2999-01-01T00:00:00.000Z",
  }),
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    error: outputError,
  },
}));

const { apiRequest } = await import("../../src/lib/api-client.js");

describe("apiRequest backend error codes", () => {
  beforeEach(() => {
    outputError.mockClear();
  });

  it("maps AI_PLAN_REQUIRED to a CLI-friendly message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 403,
        json: async () => ({
          code: "AI_PLAN_REQUIRED",
          message: "raw backend message",
        }),
      })),
    );

    await expect(apiRequest("GET", "/api/ai/usage")).rejects.toThrow(
      "Free plan includes 0 AI calls. Upgrade to Premium to use AI.",
    );
    expect(outputError).toHaveBeenCalledWith(
      "Free plan includes 0 AI calls. Upgrade to Premium to use AI.",
      403,
      expect.objectContaining({ code: "AI_PLAN_REQUIRED" }),
    );
  });

  it.each([
    [
      "AI_LIMIT_REACHED",
      "Premium AI limit reached. Try again after your quota resets.",
    ],
    ["SUBSCRIPTION_REQUIRED", "Subscriptions require Premium."],
    [
      "ACCOUNT_LIMIT_EXCEEDED",
      "Free plan allows up to 3 active accounts. Upgrade to Premium for unlimited accounts.",
    ],
  ])("maps %s to a CLI-friendly message", async (code, message) => {
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
  });
});
