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
import { join } from "path";

export type DeviceScope = "READ_ONLY" | "FULL";

export interface Credentials {
  token: string;
  apiUrl: string;
  deviceName: string;
  expiresAt: string;
  // Absent in credential files written before device-auth v2.
  scope?: DeviceScope;
}

export const CONFIG_DIR = join(homedir(), ".config", "lucas");
const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json");
const DEFAULT_API_URL = "https://api.lucasapp.app";

export function normalizeApiUrl(apiUrl: string): string {
  return apiUrl.trim().replace(/\/+$/, "");
}

let warnedApiUrlOverride = false;

export function getApiUrl(creds?: Pick<Credentials, "apiUrl"> | null): string {
  const envUrl = process.env.LUCAS_API_URL;
  if (
    envUrl &&
    creds?.apiUrl &&
    normalizeApiUrl(envUrl) !== normalizeApiUrl(creds.apiUrl) &&
    !warnedApiUrlOverride
  ) {
    // The stored token was issued by creds.apiUrl; sending it elsewhere is
    // almost always a mistake (or an exfiltration attempt via env).
    warnedApiUrlOverride = true;
    process.stderr.write(
      `Warning: LUCAS_API_URL overrides the API these credentials were issued for (${creds.apiUrl}). Run \`lucas auth login\` against the new API if this is intentional.\n`,
    );
  }
  return normalizeApiUrl(envUrl ?? creds?.apiUrl ?? DEFAULT_API_URL);
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
