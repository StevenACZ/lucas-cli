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

export interface Credentials {
  token: string;
  apiUrl: string;
  deviceName: string;
  expiresAt: string;
}

export const CONFIG_DIR = join(homedir(), ".config", "lucas");
const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json");
const DEFAULT_API_URL = "https://api.lucasapp.app";
const LEGACY_PRODUCTION_API_URLS = new Set(["https://lucas.stevenacz.com"]);

export function normalizeApiUrl(apiUrl: string): string {
  const normalized = apiUrl.trim().replace(/\/+$/, "");
  if (LEGACY_PRODUCTION_API_URLS.has(normalized)) {
    return DEFAULT_API_URL;
  }
  return normalized;
}

export function getApiUrl(creds?: Pick<Credentials, "apiUrl"> | null): string {
  return normalizeApiUrl(
    process.env.LUCAS_API_URL ?? creds?.apiUrl ?? DEFAULT_API_URL,
  );
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
