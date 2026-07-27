export const PROVIDER_USER_ERROR_CODES = [
  "API_KEY_INVALID",
  "API_KEY_PERMISSION_DENIED",
  "ACCOUNT_BALANCE_INSUFFICIENT",
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_NETWORK_ERROR",
  "PROVIDER_SERVER_CONFIG_ERROR",
  "PROVIDER_TIMEOUT",
  "PROVIDER_INVALID_RESPONSE",
  "PROVIDER_EMPTY_RESPONSE",
  "MODEL_NOT_FOUND",
  "MODEL_UNSUPPORTED",
  "PROVIDER_UNKNOWN_ERROR",
] as const;

export type ProviderUserErrorCode = (typeof PROVIDER_USER_ERROR_CODES)[number];

function providerMessage(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const record = body as Record<string, unknown>;
  const error = record.error && typeof record.error === "object"
    ? record.error as Record<string, unknown>
    : record;
  return [error.code, error.type, error.status, error.message]
    .filter(value => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

export function classifyProviderHttpError(status: number, body: unknown): ProviderUserErrorCode {
  const message = providerMessage(body);
  if (
    status === 402
    || /insufficient[_ -]?quota|billing|credit|balance|payment|required/.test(message)
  ) return "ACCOUNT_BALANCE_INSUFFICIENT";
  if (status === 401 || /invalid[_ -]?(api[_ -]?)?key|authentication|unauthorized/.test(message)) {
    return "API_KEY_INVALID";
  }
  if (status === 403 || /permission|forbidden|not allowed|access denied/.test(message)) {
    return "API_KEY_PERMISSION_DENIED";
  }
  if (status === 429 || /rate[_ -]?limit|too many requests/.test(message)) {
    return "PROVIDER_RATE_LIMITED";
  }
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  if (status === 404 || /model.+not found|unknown model|does not exist/.test(message)) {
    return "MODEL_NOT_FOUND";
  }
  if (status === 400 && /unsupported model|not supported/.test(message)) {
    return "MODEL_UNSUPPORTED";
  }
  return "PROVIDER_UNKNOWN_ERROR";
}

export function normalizeProviderRuntimeError(error: unknown): ProviderUserErrorCode {
  if (error instanceof DOMException && error.name === "AbortError") return "PROVIDER_TIMEOUT";
  if (error instanceof TypeError) return "PROVIDER_NETWORK_ERROR";
  const code = error instanceof Error ? error.message : "";
  if (PROVIDER_USER_ERROR_CODES.includes(code as ProviderUserErrorCode)) return code as ProviderUserErrorCode;
  if (
    /SECRET_STORAGE|SECRET_DECRYPTION|API_KEY_REFERENCE_UNRESOLVED|ENCRYPTION_KEY_|CREDENTIAL_(DECRYPTION|INTEGRITY_CHECK)_FAILED/.test(code)
  ) {
    return "PROVIDER_SERVER_CONFIG_ERROR";
  }
  return "PROVIDER_UNKNOWN_ERROR";
}
