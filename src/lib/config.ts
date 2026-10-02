import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import { invalidValue } from "./errors.js";

export type DeviceScope = "READ_ONLY" | "FULL";

export interface Credentials {
  token: string;
  apiUrl: string;
  deviceName: string;
  expiresAt: string;
  // Absent in credential files written before device-auth v2.
  scope?: DeviceScope;
}

export const CONFIG_DIR = process.env.LUCAS_CONFIG_DIR
  ? resolve(process.env.LUCAS_CONFIG_DIR)
  : join(homedir(), ".config", "lucas");
const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json");
const DEFAULT_API_URL = "https://api.lucasapp.app";

export function normalizeApiUrl(apiUrl: string): string {
  return apiUrl.trim().replace(/\/+$/, "");
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

let warnedApiUrl = false;

function validateApiUrl(apiUrl: string, source: string): string {
  const normalized = normalizeApiUrl(apiUrl);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw invalidValue(`${source} is not a valid URL: ${normalized}`, {
      source,
    });
  }
  const insecureAllowed =
    LOOPBACK_HOSTS.has(parsed.hostname) ||
    process.env.LUCAS_ALLOW_INSECURE_API === "1";
  if (
    parsed.protocol !== "https:" &&
    !(parsed.protocol === "http:" && insecureAllowed)
  ) {
    throw invalidValue(
      `${source} must use https:// (http is only allowed for localhost, 127.0.0.1 and ::1, or with LUCAS_ALLOW_INSECURE_API=1): ${normalized}`,
      { source },
    );
  }
  return normalized;
}

function warnApiUrl(apiUrl: string, issuedFor?: string): void {
  const nonDefault = new URL(apiUrl).origin !== DEFAULT_API_URL;
  const mismatch = issuedFor !== undefined && issuedFor !== apiUrl;
  if (warnedApiUrl || (!nonDefault && !mismatch)) return;
  warnedApiUrl = true;
  const reissue = mismatch
    ? ` The stored credentials were issued for ${issuedFor}; run \`lucas auth login\` against this API if this is intentional.`
    : "";
  process.stderr.write(
    `Warning: using LucasApp API ${apiUrl}${nonDefault ? ` (default is ${DEFAULT_API_URL})` : ""}.${reissue}\n`,
  );
}

export function checkApiUrl(apiUrl: string, source: string): string {
  const checked = validateApiUrl(apiUrl, source);
  warnApiUrl(checked);
  return checked;
}

export function getApiUrl(creds?: Pick<Credentials, "apiUrl"> | null): string {
  const envUrl = process.env.LUCAS_API_URL;
  const storedUrl = creds?.apiUrl ? normalizeApiUrl(creds.apiUrl) : undefined;
  const apiUrl = envUrl
    ? validateApiUrl(envUrl, "LUCAS_API_URL")
    : storedUrl
      ? validateApiUrl(storedUrl, "Stored credentials apiUrl")
      : DEFAULT_API_URL;
  warnApiUrl(apiUrl, storedUrl);
  return apiUrl;
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  chmodSync(CONFIG_DIR, 0o700);
}

export function saveCredentials(creds: Credentials): void {
  ensureConfigDir();
  const tmpFile = `${CREDENTIALS_FILE}.${process.pid}.tmp`;
  writeFileSync(tmpFile, JSON.stringify(creds, null, 2), { mode: 0o600 });
  chmodSync(tmpFile, 0o600);
  renameSync(tmpFile, CREDENTIALS_FILE);
  chmodSync(CREDENTIALS_FILE, 0o600);
}

export function loadCredentials(): Credentials | null {
  if (!existsSync(CREDENTIALS_FILE)) return null;
  try {
    const raw = readFileSync(CREDENTIALS_FILE, "utf-8");
    return JSON.parse(raw) as Credentials;
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE);
  }
}
