import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loadCredentials = vi.fn();
const clearCredentials = vi.fn();
const getApiUrl = vi.fn();
const outputSuccess = vi.fn();

vi.mock("../../src/lib/config.js", () => ({
  loadCredentials,
  clearCredentials,
  getApiUrl,
}));

vi.mock("../../src/lib/output.js", () => ({
  output: { success: outputSuccess },
}));

const { runLogout } = await import("../../src/commands/auth/logout.js");

function credentials(expiresAt = "2099-01-01T00:00:00.000Z") {
  return {
    token: "token",
    apiUrl: "https://api.lucasapp.app",
    deviceName: "test-device",
    scope: "FULL",
    expiresAt,
  };
}

function stubFetch(result: { status: number } | Error) {
  const fetchMock = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return { ok: result.status < 300, status: result.status };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("auth logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadCredentials.mockReturnValue(credentials());
    getApiUrl.mockReturnValue("https://api.lucasapp.app");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("revokes the device and clears the credentials", async () => {
    const fetchMock = stubFetch({ status: 200 });

    await runLogout();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.lucasapp.app/api/cli/logout",
      expect.objectContaining({ method: "POST" }),
    );
    expect(clearCredentials).toHaveBeenCalledTimes(1);
    expect(outputSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ revoked: true }),
    );
  });

  it("keeps the credentials when the API cannot be reached", async () => {
    stubFetch(new Error("offline"));

    await expect(runLogout()).rejects.toMatchObject({ code: "REVOKE_FAILED" });

    expect(clearCredentials).not.toHaveBeenCalled();
    expect(outputSuccess).not.toHaveBeenCalled();
  });

  it("keeps the credentials when the server refuses the revocation", async () => {
    stubFetch({ status: 503 });

    await expect(runLogout()).rejects.toMatchObject({
      code: "REVOKE_FAILED",
      details: { status: 503 },
    });
    expect(clearCredentials).not.toHaveBeenCalled();
  });

  it("clears a token the server already rejects", async () => {
    stubFetch({ status: 401 });

    await runLogout();

    expect(clearCredentials).toHaveBeenCalledTimes(1);
    expect(outputSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ revoked: false }),
    );
  });

  it("clears an expired token without calling the API", async () => {
    loadCredentials.mockReturnValue(credentials("2020-01-01T00:00:00.000Z"));
    const fetchMock = stubFetch({ status: 200 });

    await runLogout();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(clearCredentials).toHaveBeenCalledTimes(1);
  });

  it("does not send the token to a mismatched API", async () => {
    const mismatch = Object.assign(new Error("mismatch"), {
      code: "API_URL_MISMATCH",
    });
    getApiUrl.mockImplementation(() => {
      throw mismatch;
    });
    const fetchMock = stubFetch({ status: 200 });

    await expect(runLogout()).rejects.toBe(mismatch);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(clearCredentials).not.toHaveBeenCalled();
  });

  it("removes the credentials with --force even if revocation fails", async () => {
    stubFetch(new Error("offline"));

    await runLogout({ force: true });

    expect(clearCredentials).toHaveBeenCalledTimes(1);
    expect(outputSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ revoked: false }),
    );
  });
});
