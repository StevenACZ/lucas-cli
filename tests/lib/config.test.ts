import { mkdtemp, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("config credential storage", () => {
  let tempHome: string | undefined;
  const originalLucasApiUrl = process.env.LUCAS_API_URL;

  beforeEach(async () => {
    delete process.env.LUCAS_API_URL;
    tempHome = await mkdtemp(join(tmpdir(), "lucas-cli-home-"));
    vi.resetModules();
    vi.doMock("os", () => ({
      homedir: () => tempHome,
    }));
  });

  afterEach(async () => {
    vi.doUnmock("os");
    vi.resetModules();
    if (originalLucasApiUrl === undefined) {
      delete process.env.LUCAS_API_URL;
    } else {
      process.env.LUCAS_API_URL = originalLucasApiUrl;
    }
    if (tempHome) {
      await rm(tempHome, { recursive: true, force: true });
      tempHome = undefined;
    }
  });

  it("stores credentials in a private directory and file", async () => {
    const { CONFIG_DIR, saveCredentials } =
      await import("../../src/lib/config.js");

    saveCredentials({
      token: "token",
      apiUrl: "https://example.test",
      deviceName: "Mac CLI",
      expiresAt: "2999-01-01T00:00:00.000Z",
    });

    const credentialsPath = join(CONFIG_DIR, "credentials.json");
    const dirMode = (await stat(CONFIG_DIR)).mode & 0o777;
    const fileMode = (await stat(credentialsPath)).mode & 0o777;

    expect(dirMode).toBe(0o700);
    expect(fileMode).toBe(0o600);
  });

  it("normalizes stored credential API URLs", async () => {
    const { getApiUrl } = await import("../../src/lib/config.js");

    expect(getApiUrl({ apiUrl: " https://api.lucasapp.app/ " })).toBe(
      "https://api.lucasapp.app",
    );
  });

  it("lets LUCAS_API_URL override stored credentials", async () => {
    process.env.LUCAS_API_URL = "http://localhost:3301";
    const { getApiUrl } = await import("../../src/lib/config.js");

    expect(getApiUrl({ apiUrl: "https://example.test" })).toBe(
      "http://localhost:3301",
    );
  });
});
