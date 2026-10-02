import { mkdtemp, readFile, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import { join, relative } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("config credential storage", () => {
  let tempHome: string | undefined;
  const originalConfigDir = process.env.LUCAS_CONFIG_DIR;
  const originalLucasApiUrl = process.env.LUCAS_API_URL;
  const originalAllowInsecure = process.env.LUCAS_ALLOW_INSECURE_API;

  beforeEach(async () => {
    delete process.env.LUCAS_CONFIG_DIR;
    delete process.env.LUCAS_API_URL;
    delete process.env.LUCAS_ALLOW_INSECURE_API;
    tempHome = await mkdtemp(join(tmpdir(), "lucas-cli-home-"));
    vi.resetModules();
    vi.doMock("os", () => ({
      homedir: () => tempHome,
    }));
  });

  afterEach(async () => {
    if (originalConfigDir === undefined) {
      delete process.env.LUCAS_CONFIG_DIR;
    } else {
      process.env.LUCAS_CONFIG_DIR = originalConfigDir;
    }
    vi.doUnmock("os");
    vi.resetModules();
    if (originalLucasApiUrl === undefined) {
      delete process.env.LUCAS_API_URL;
    } else {
      process.env.LUCAS_API_URL = originalLucasApiUrl;
    }
    if (originalAllowInsecure === undefined) {
      delete process.env.LUCAS_ALLOW_INSECURE_API;
    } else {
      process.env.LUCAS_ALLOW_INSECURE_API = originalAllowInsecure;
    }
    vi.restoreAllMocks();
    if (tempHome) {
      await rm(tempHome, { recursive: true, force: true });
      tempHome = undefined;
    }
  });

  it("stores credentials in a private directory and file", async () => {
    const { CONFIG_DIR, saveCredentials } =
      await import("../../src/lib/config.js");

    expect(CONFIG_DIR).toBe(join(tempHome!, ".config", "lucas"));

    saveCredentials({
      token: "token",
      apiUrl: "https://example.test",
      deviceName: "Mac CLI",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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

  it("rejects plain http API URLs outside loopback", async () => {
    process.env.LUCAS_API_URL = "http://192.168.18.13:3301";
    const { getApiUrl } = await import("../../src/lib/config.js");

    expect(() => getApiUrl()).toThrow(
      expect.objectContaining({
        code: "INVALID_VALUE",
        message: expect.stringMatching(/LUCAS_API_URL must use https:\/\//),
      }),
    );
  });

  it("rejects a plain http apiUrl stored in credentials", async () => {
    const { getApiUrl } = await import("../../src/lib/config.js");

    expect(() => getApiUrl({ apiUrl: "http://evil.example" })).toThrow(
      /Stored credentials apiUrl must use https:\/\//,
    );
  });

  it("rejects non-http schemes and malformed URLs", async () => {
    const { checkApiUrl } = await import("../../src/lib/config.js");

    expect(() => checkApiUrl("file:///etc/passwd", "--api-url")).toThrow(
      /must use https/,
    );
    expect(() => checkApiUrl("not a url", "--api-url")).toThrow(
      /not a valid URL/,
    );
  });

  it("allows http for loopback hosts", async () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const { checkApiUrl } = await import("../../src/lib/config.js");

    expect(checkApiUrl("http://127.0.0.1:3301", "--api-url")).toBe(
      "http://127.0.0.1:3301",
    );
    expect(checkApiUrl("http://[::1]:3301/", "--api-url")).toBe(
      "http://[::1]:3301",
    );
  });

  it("allows LAN http with LUCAS_ALLOW_INSECURE_API=1", async () => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    process.env.LUCAS_API_URL = "http://192.168.18.13:3301";
    process.env.LUCAS_ALLOW_INSECURE_API = "1";
    const { getApiUrl } = await import("../../src/lib/config.js");

    expect(getApiUrl()).toBe("http://192.168.18.13:3301");
  });

  it("warns once on stderr when the API is not the default", async () => {
    const stderrWrite = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    process.env.LUCAS_API_URL = "https://staging.example.test";
    const { getApiUrl } = await import("../../src/lib/config.js");

    getApiUrl({ apiUrl: "https://api.lucasapp.app" });
    getApiUrl({ apiUrl: "https://api.lucasapp.app" });

    expect(stderrWrite).toHaveBeenCalledTimes(1);
    const line = String(stderrWrite.mock.calls[0]?.[0]);
    expect(line).toContain("https://staging.example.test");
    expect(line).toContain("issued for https://api.lucasapp.app");
  });

  it("does not warn for the default API", async () => {
    const stderrWrite = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    const { getApiUrl } = await import("../../src/lib/config.js");

    expect(getApiUrl({ apiUrl: "https://api.lucasapp.app/" })).toBe(
      "https://api.lucasapp.app",
    );
    expect(getApiUrl()).toBe("https://api.lucasapp.app");
    expect(stderrWrite).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    "isolates credential reads, writes and deletion with a config override (relative=%s)",
    async (useRelative) => {
      const defaultConfig = await import("../../src/lib/config.js");
      const credentials = {
        token: "test-default-token",
        apiUrl: "https://example.test",
        deviceName: "Test",
        expiresAt: "2099-01-01T00:00:00Z",
      };
      defaultConfig.saveCredentials(credentials);
      const defaultFile = join(defaultConfig.CONFIG_DIR, "credentials.json");
      const original = await readFile(defaultFile, "utf8");
      const isolatedDir = join(tempHome!, "isolated");
      process.env.LUCAS_CONFIG_DIR = useRelative
        ? relative(process.cwd(), isolatedDir)
        : isolatedDir;
      vi.resetModules();
      const isolated = await import("../../src/lib/config.js");
      expect(isolated.CONFIG_DIR).toBe(isolatedDir);
      expect(isolated.loadCredentials()).toBeNull();
      const isolatedCredentials = {
        ...credentials,
        token: "test-isolated-token",
      };
      isolated.saveCredentials(isolatedCredentials);
      expect(isolated.loadCredentials()).toEqual(isolatedCredentials);
      expect((await stat(isolatedDir)).mode & 0o777).toBe(0o700);
      expect(
        (await stat(join(isolatedDir, "credentials.json"))).mode & 0o777,
      ).toBe(0o600);
      isolated.clearCredentials();
      expect(isolated.loadCredentials()).toBeNull();
      expect(await readFile(defaultFile, "utf8")).toBe(original);
    },
  );
});
