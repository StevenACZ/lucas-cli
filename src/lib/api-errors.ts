export interface ApiErrorPayload {
  code?: string;
  statusMessage?: string;
  message?: string;
  error?: {
    code?: string;
    statusMessage?: string;
    message?: string;
  };
  [key: string]: unknown;
}

// Codes that always map to an actionable CLI message, even when the backend
// sends its own (Spanish-first) message.
const OVERRIDE_MESSAGES: Record<string, string> = {
  CLI_READ_ONLY:
    "Your CLI token is read-only. Re-link with full access from the app to use write commands.",
  CLI_FORBIDDEN_ENDPOINT: "This endpoint is not available from the CLI.",
};

// Fallbacks used only when the backend response carries no message. Plan
// limits and prices are backend-owned; never hardcode numbers here.
const FALLBACK_MESSAGES: Record<string, string> = {
  AI_PLAN_REQUIRED:
    "Your current plan does not include this AI feature. Check LucasApp for upgrade options.",
  AI_LIMIT_REACHED:
    "AI usage limit reached. Try again after your quota resets.",
  SUBSCRIPTION_REQUIRED: "This feature requires Premium.",
  ACCOUNT_LIMIT_EXCEEDED:
    "Active account limit reached for your plan. Upgrade to add more accounts.",
};

export function getApiErrorCode(
  payload: ApiErrorPayload | string,
): string | null {
  if (typeof payload === "string") return null;

  return (
    payload.code ||
    payload.statusMessage ||
    payload.error?.code ||
    payload.error?.statusMessage ||
    null
  );
}

export function getApiErrorMessage(
  payload: ApiErrorPayload | string,
  fallback = "Request failed",
): string {
  if (typeof payload === "string") return payload || fallback;

  const code = getApiErrorCode(payload);
  if (code && code in OVERRIDE_MESSAGES) return OVERRIDE_MESSAGES[code];

  const backendMessage = payload.message || payload.error?.message;
  if (backendMessage) return backendMessage;

  if (code && code in FALLBACK_MESSAGES) return FALLBACK_MESSAGES[code];
  return fallback;
}
