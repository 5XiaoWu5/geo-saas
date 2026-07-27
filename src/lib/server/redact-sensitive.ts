const SENSITIVE_FIELD = /(^|_)(api_?key|authorization|password|secret|token|credential|encrypted_?api_?key|api_?key_?(iv|auth_?tag))($|_)/i;
const CREDENTIAL_VALUE = /\b(?:sk|key|api|token)-[A-Za-z0-9._-]{8,}\b/g;

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_FIELD.test(key) ? "[REDACTED]" : redactSensitive(item),
      ]),
    );
  }
  if (typeof value === "string") return value.replace(CREDENTIAL_VALUE, "[REDACTED]");
  return value;
}

export function safeErrorCode(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  return /^[A-Z][A-Z0-9_]{2,119}$/.test(message) ? message : fallback;
}
