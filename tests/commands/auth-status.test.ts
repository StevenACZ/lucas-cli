import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const loadCredentials = vi.fn();
const outputSuccess = vi.fn();
const outputError = vi.fn((message: string) => {
  throw new Error(message);
});

vi.mock("../../src/lib/api-client.js", () => ({
  apiRequest,
}));

vi.mock("../../src/lib/config.js", () => ({
  loadCredentials,
  getApiUrl: () => "https://api.lucasapp.app",
}));

vi.mock("../../src/lib/output.js", () => ({
  output: {
    success: outputSuccess,
    error: outputError,
  },
}));

const { statusCommand } = await import("../../src/commands/auth/status.js");

function credentials(expiresAt: string) {
  return {
    token: "token",
    apiUrl: "https://api.lucasapp.app",
    deviceName: "test-device",
    scope: "READ_ONLY",
    expiresAt,
  };
}

describe("auth status", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    loadCredentials.mockReset();
    outputSuccess.mockReset();
    outputError.mockClear();
  });

  it("reports an expired token as not authenticated", async () => {
    loadCredentials.mockReturnValue(credentials("2020-01-01T00:00:00.000Z"));

    await statusCommand.parseAsync([], { from: "user" });

    expect(outputSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ authenticated: false, expired: true }),
    );
  });

  it("reports a token that is still valid as authenticated", async () => {
    loadCredentials.mockReturnValue(credentials("2099-01-01T00:00:00.000Z"));

    await statusCommand.parseAsync([], { from: "user" });

    expect(outputSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ authenticated: true, expired: false }),
    );
  });
});
