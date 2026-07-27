import type {
  AISearchConnectionType,
  AISearchProviderType,
  ProviderCapabilities,
  ProviderCompatibilityLevel,
} from "./types";

export type ProviderVerificationClaims = {
  projectId: string;
  provider: AISearchProviderType;
  connectionType: AISearchConnectionType;
  baseUrl: string | null;
  modelId: string;
  credentialFingerprint: string;
  capabilities: ProviderCapabilities;
  compatibilityLevel: ProviderCompatibilityLevel;
  verifiedAt: string;
  expiresAt: string;
};

function secret() {
  const value = process.env.PROVIDER_MODEL_VERIFICATION_SECRET
    ?? process.env.BETTER_AUTH_SECRET
    ?? process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("PROVIDER_VERIFICATION_SECRET_UNAVAILABLE");
  return value;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function hmac(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

export async function providerCredentialFingerprint(
  apiKey: string,
  connectionType: AISearchConnectionType,
  baseUrl: string | null,
) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${apiKey}\u0000${connectionType}\u0000${baseUrl ?? ""}`),
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function issueProviderVerificationToken(
  claims: Omit<ProviderVerificationClaims, "expiresAt">,
) {
  const payload = {
    ...claims,
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  } satisfies ProviderVerificationClaims;
  const encoded = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${await hmac(encoded)}`;
}

export async function verifyProviderVerificationToken(token: string) {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra || signature !== await hmac(encoded)) {
    throw new Error("PROVIDER_VERIFICATION_TOKEN_INVALID");
  }
  let claims: ProviderVerificationClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as ProviderVerificationClaims;
  } catch {
    throw new Error("PROVIDER_VERIFICATION_TOKEN_INVALID");
  }
  if (new Date(claims.expiresAt).getTime() <= Date.now()) {
    throw new Error("PROVIDER_VERIFICATION_TOKEN_EXPIRED");
  }
  return claims;
}
