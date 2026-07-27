import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const SECRET_VERSION = 1;

export type EncryptedProviderSecret = {
  encryptedApiKey: string;
  apiKeyIv: string;
  apiKeyAuthTag: string;
  apiKeyHint: string;
  secretVersion: number;
};

type StoredProviderSecret = {
  encryptedApiKey?: unknown;
  apiKeyIv?: unknown;
  apiKeyAuthTag?: unknown;
  secretVersion?: unknown;
};

function encryptionKey(version = SECRET_VERSION) {
  const value = (
    process.env[`PROVIDER_SECRET_ENCRYPTION_KEY_V${version}`]
    ?? process.env.PROVIDER_SECRET_ENCRYPTION_KEY
    ?? ""
  ).trim();
  if (!value) return null;
  if (/^[a-f0-9]{64}$/i.test(value)) return Buffer.from(value, "hex");
  const decoded = Buffer.from(value, "base64");
  return decoded.length === 32 ? decoded : null;
}

function aad(projectId: string, provider: string) {
  return Buffer.from(`geopilot-provider:${projectId}:${provider}`, "utf8");
}

export function providerSecretStorageAvailable() {
  return encryptionKey() !== null;
}

export function providerApiKeyHint(apiKey: string) {
  const trimmed = apiKey.trim();
  const separator = trimmed.indexOf("-");
  const prefix = separator >= 1 && separator <= 10
    ? trimmed.slice(0, separator + 1)
    : trimmed.slice(0, Math.min(3, trimmed.length));
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••••••${suffix}`;
}

export function encryptProviderApiKey(apiKey: string, projectId: string, provider: string): EncryptedProviderSecret {
  const key = encryptionKey();
  if (!key) throw new Error("PROVIDER_SECRET_STORAGE_UNAVAILABLE");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(aad(projectId, provider));
  const encrypted = Buffer.concat([cipher.update(apiKey.trim(), "utf8"), cipher.final()]);
  return {
    encryptedApiKey: encrypted.toString("base64"),
    apiKeyIv: iv.toString("base64"),
    apiKeyAuthTag: cipher.getAuthTag().toString("base64"),
    apiKeyHint: providerApiKeyHint(apiKey),
    secretVersion: SECRET_VERSION,
  };
}

export function decryptProviderApiKey(secret: StoredProviderSecret, projectId: string, provider: string) {
  if (
    typeof secret.encryptedApiKey !== "string"
    || typeof secret.apiKeyIv !== "string"
    || typeof secret.apiKeyAuthTag !== "string"
  ) return null;
  const version = Number(secret.secretVersion ?? SECRET_VERSION);
  const key = encryptionKey(version);
  if (!key) throw new Error("PROVIDER_SECRET_STORAGE_UNAVAILABLE");
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(secret.apiKeyIv, "base64"));
    decipher.setAAD(aad(projectId, provider));
    decipher.setAuthTag(Buffer.from(secret.apiKeyAuthTag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(secret.encryptedApiKey, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("PROVIDER_SECRET_DECRYPTION_FAILED");
  }
}
