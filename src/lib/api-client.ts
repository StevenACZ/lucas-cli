import { loadCredentials, getApiUrl } from "./config.js";
import { getApiErrorMessage, type ApiErrorPayload } from "./api-errors.js";
import { output } from "./output.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

async function readErrorPayload(
  res: Response,
): Promise<ApiErrorPayload | string> {
  const contentType = res.headers?.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await res.json().catch(() => ({}))) as ApiErrorPayload;
  }

  const jsonSource = typeof res.clone === "function" ? res.clone() : res;
  const json = await jsonSource.json().catch(() => undefined);
  if (json && typeof json === "object") {
    return json as ApiErrorPayload;
  }

  const text =
    typeof res.text === "function" ? await res.text().catch(() => "") : "";
  try {
    return JSON.parse(text) as ApiErrorPayload;
  } catch {
    return text || "Unknown error";
  }
}

const SENSITIVE_KEY_PATTERN =
  /(token|password|secret|authorization|api[-_]?key|cookie|session|credential)/i;

function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveFields);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : redactSensitiveFields(entry),
    ]),
  );
}

function buildSafeErrorDetails(
  payload: ApiErrorPayload | string,
  statusCode: number,
): Record<string, unknown> {
  if (typeof payload === "string") {
    return { message: payload, statusCode };
  }

  const code =
    payload.code ||
    payload.statusMessage ||
    payload.error?.code ||
    payload.error?.statusMessage;
  const message = payload.message || payload.error?.message;
  const safeDetails: Record<string, unknown> = {
    ...(code && { code }),
    ...(message && { message }),
    statusCode,
  };

  if (process.env.LUCAS_DEBUG === "1") {
    safeDetails.details = redactSensitiveFields(payload);
  }

  return safeDetails;
}

export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>,
): Promise<T> {
  const creds = loadCredentials();
  if (!creds) {
    output.error("Not authenticated. Run: lucas auth login");
  }

  if (creds!.expiresAt && new Date(creds!.expiresAt) <= new Date()) {
    output.error("Token expired. Run: lucas auth login");
  }

  const apiUrl = getApiUrl(creds);
  const url = new URL(path, apiUrl);

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${creds!.token}`,
    "Content-Type": "application/json",
  };

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });
  } catch {
    return output.error(
      `Cannot reach LucasApp API at ${apiUrl}. Check your connection or run: lucas auth login`,
      503,
      {
        code: "NETWORK_ERROR",
        apiUrl,
        statusCode: 503,
      },
    );
  }

  if (res.status === 401) {
    output.error("Not authenticated. Run: lucas auth login", 401);
  }

  if (!res.ok) {
    const payload = await readErrorPayload(res);
    output.error(
      getApiErrorMessage(payload),
      res.status,
      buildSafeErrorDetails(payload, res.status),
    );
  }

  return (await res.json()) as T;
}
