import { loadCredentials, getApiUrl } from "./config.js";
import {
  getApiErrorCode,
  getApiErrorMessage,
  type ApiErrorPayload,
} from "./api-errors.js";
import { output } from "./output.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

const DEFAULT_TIMEOUT_MS = 30_000;
// AI endpoints run model calls server-side and can legitimately take minutes.
const AI_TIMEOUT_MS = 120_000;

function requestTimeoutMs(path: string): number {
  return path.startsWith("/api/ai/") ? AI_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

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
  requestId?: string | null,
): Record<string, unknown> {
  if (typeof payload === "string") {
    return {
      message: payload,
      statusCode,
      ...(requestId && { requestId }),
    };
  }

  const code = getApiErrorCode(payload);
  const message = payload.message || payload.error?.message;
  const safeDetails: Record<string, unknown> = {
    ...(code && { code }),
    ...(message && { message }),
    ...("data" in payload && { data: redactSensitiveFields(payload.data) }),
    statusCode,
    ...(requestId && { requestId }),
  };

  if (process.env.LUCAS_DEBUG === "1") {
    safeDetails.details = redactSensitiveFields(payload);
  }

  return safeDetails;
}

export class ApiError extends Error {
  readonly statusCode?: number;
  readonly details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

type FailHandler = (
  message: string,
  statusCode?: number,
  details?: unknown,
) => never;

const throwApiError: FailHandler = (message, statusCode, details) => {
  throw new ApiError(message, statusCode, details);
};

async function performRequest<T>(
  method: HttpMethod,
  path: string,
  body: Record<string, unknown> | undefined,
  queryParams: Record<string, string> | undefined,
  fail: FailHandler,
): Promise<T> {
  const creds = loadCredentials();
  if (!creds) {
    fail("Not authenticated. Run: lucas auth login");
  }

  if (creds.expiresAt && new Date(creds.expiresAt) <= new Date()) {
    fail("Token expired. Run: lucas auth login");
  }

  const apiUrl = getApiUrl(creds);
  const url = new URL(path, apiUrl);

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${creds.token}`,
    "Content-Type": "application/json",
  };

  const timeoutMs = requestTimeoutMs(path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      signal: controller.signal,
      ...(body && { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      fail(
        `Request timed out after ${timeoutMs / 1000}s. Try again or check the API status.`,
        504,
        { code: "TIMEOUT", timeoutMs, statusCode: 504 },
      );
    }
    fail(
      `Cannot reach LucasApp API at ${apiUrl}. Check your connection or run: lucas auth login`,
      503,
      {
        code: "NETWORK_ERROR",
        apiUrl,
        statusCode: 503,
      },
    );
  } finally {
    clearTimeout(timeout);
  }

  const requestId = res.headers?.get("x-request-id");

  if (res.status === 401) {
    fail("Not authenticated. Run: lucas auth login", 401, {
      code: "UNAUTHORIZED",
      statusCode: 401,
      ...(requestId && { requestId }),
    });
  }

  if (res.status === 429) {
    const payload = await readErrorPayload(res);
    const retryAfterHeader = res.headers?.get("retry-after");
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10)
      : undefined;
    fail(
      retryAfterSeconds
        ? `Rate limited. Retry in ${retryAfterSeconds}s.`
        : "Rate limited. Retry later.",
      429,
      {
        ...buildSafeErrorDetails(payload, 429, requestId),
        code: "RATE_LIMITED",
        ...(Number.isFinite(retryAfterSeconds) && { retryAfterSeconds }),
      },
    );
  }

  if (!res.ok) {
    const payload = await readErrorPayload(res);
    fail(
      getApiErrorMessage(payload),
      res.status,
      buildSafeErrorDetails(payload, res.status, requestId),
    );
  }

  return (await res.json()) as T;
}

export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>,
): Promise<T> {
  return performRequest<T>(method, path, body, queryParams, output.error);
}

/**
 * Rejects with an ApiError instead of exiting the process. Reserved for reads
 * that run after a write already succeeded: exiting there reports a persisted
 * mutation as a failure and invites a non-idempotent retry.
 */
export async function apiRequestOrThrow<T>(
  method: HttpMethod,
  path: string,
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>,
): Promise<T> {
  return performRequest<T>(method, path, body, queryParams, throwApiError);
}
