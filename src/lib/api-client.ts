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

  const apiUrl = creds!.apiUrl ?? getApiUrl();
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

  const res = await fetch(url.toString(), {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  });

  if (res.status === 401) {
    output.error("Not authenticated. Run: lucas auth login", 401);
  }

  if (!res.ok) {
    const payload = await readErrorPayload(res);
    output.error(getApiErrorMessage(payload), res.status, payload);
  }

  return (await res.json()) as T;
}
