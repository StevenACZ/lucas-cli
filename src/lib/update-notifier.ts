import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { CONFIG_DIR, ensureConfigDir } from "./config.js";

const UPDATE_CACHE_FILE = join(CONFIG_DIR, "update-check.json");
const UPDATE_CHECK_INTERVAL_MS = 1000 * 60 * 60 * 12;
const PACKAGE_NAME = "lucasapp-cli";

interface UpdateCache {
  lastCheckedAt: string;
  latestVersion?: string;
}

export function parseVersion(version: string): number[] {
  return version
    .trim()
    .replace(/^v/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
}

export function isVersionNewer(
  currentVersion: string,
  latestVersion: string,
): boolean {
  const current = parseVersion(currentVersion);
  const latest = parseVersion(latestVersion);
  const length = Math.max(current.length, latest.length);

  for (let index = 0; index < length; index += 1) {
    const currentPart = current[index] ?? 0;
    const latestPart = latest[index] ?? 0;

    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }

  return false;
}

export function shouldRefreshUpdateCheck(
  cache: UpdateCache | null,
  nowMs: number = Date.now(),
): boolean {
  if (!cache?.lastCheckedAt) return true;

  const lastCheckedAtMs = new Date(cache.lastCheckedAt).getTime();
  if (!Number.isFinite(lastCheckedAtMs)) return true;

  return nowMs - lastCheckedAtMs >= UPDATE_CHECK_INTERVAL_MS;
}

function isInteractiveTerminal(): boolean {
  return (
    Boolean(process.stdout.isTTY && process.stderr.isTTY) &&
    process.env.CI !== "true" &&
    process.env.LUCAS_DISABLE_UPDATE_NOTIFIER !== "1"
  );
}

function loadUpdateCache(): UpdateCache | null {
  if (!existsSync(UPDATE_CACHE_FILE)) return null;

  try {
    return JSON.parse(readFileSync(UPDATE_CACHE_FILE, "utf-8")) as UpdateCache;
  } catch {
    return null;
  }
}

function saveUpdateCache(cache: UpdateCache): void {
  ensureConfigDir();
  writeFileSync(UPDATE_CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function fetchLatestVersion(): Promise<string | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(
      `https://registry.npmjs.org/${PACKAGE_NAME}/latest`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) return undefined;

    const payload = (await response.json()) as { version?: unknown };
    return typeof payload.version === "string" ? payload.version : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export async function maybeNotifyForUpdate(
  currentVersion: string,
): Promise<void> {
  if (!isInteractiveTerminal()) return;

  const cache = loadUpdateCache();
  let latestVersion = cache?.latestVersion;

  if (shouldRefreshUpdateCheck(cache)) {
    latestVersion = await fetchLatestVersion();
    saveUpdateCache({
      lastCheckedAt: new Date().toISOString(),
      ...(latestVersion && { latestVersion }),
    });
  }

  if (!latestVersion || !isVersionNewer(currentVersion, latestVersion)) return;

  console.error(
    `Update available for lucas: ${currentVersion} -> ${latestVersion}`,
  );
  console.error("Run: npm install -g lucasapp-cli@latest");
}
