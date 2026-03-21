import { loadCredentials, getApiUrl } from "./config.js";
import { output } from "./output.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

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
    const text = await res.text().catch(() => "Unknown error");
    output.error(text, res.status);
  }

  return (await res.json()) as T;
}
