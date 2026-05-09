export type ApiErrorCode =
  | "AI_PLAN_REQUIRED"
  | "AI_LIMIT_REACHED"
  | "SUBSCRIPTION_REQUIRED"
  | "ACCOUNT_LIMIT_EXCEEDED";

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

const API_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  AI_PLAN_REQUIRED:
    "Free plan includes 0 AI calls. Upgrade to Premium to use AI.",
  AI_LIMIT_REACHED:
    "Premium AI limit reached. Try again after your quota resets.",
  SUBSCRIPTION_REQUIRED: "Subscriptions require Premium.",
  ACCOUNT_LIMIT_EXCEEDED:
    "Free plan allows up to 3 active accounts. Upgrade to Premium for unlimited accounts.",
};

export function getApiErrorCode(
  payload: ApiErrorPayload | string,
): ApiErrorCode | null {
  if (typeof payload === "string") return null;

  const code =
    payload.code ||
    payload.statusMessage ||
    payload.error?.code ||
    payload.error?.statusMessage;

  if (!code) return null;
  return code in API_ERROR_MESSAGES ? (code as ApiErrorCode) : null;
}

export function getApiErrorMessage(
  payload: ApiErrorPayload | string,
  fallback = "Request failed",
): string {
  if (typeof payload === "string") return payload || fallback;

  const code = getApiErrorCode(payload);
  if (code) return API_ERROR_MESSAGES[code];

  return payload.message || payload.error?.message || fallback;
}
