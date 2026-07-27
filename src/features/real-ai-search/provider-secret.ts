import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const LEGACY_SECRET_VERSION = 1;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const ACTIVE_VERSION_ENV = "PROVIDER_SECRET_ACTIVE_KEY_VERSION";

export const PROVIDER_SECRET_ERROR_CODES = [
  "ENCRYPTION_KEY_VERSION_MISSING",
  "ENCRYPTION_KEY_INVALID",
  "CREDENTIAL_DECRYPTION_FAILED",
  "CREDENTIAL_INTEGRITY_CHECK_FAILED",
] as const;

export type ProviderSecretErrorCode = (typeof PROVIDER_SECRET_ERROR_CODES)[number];

export class ProviderSecretError extends Error {
  constructor(public readonly code: ProviderSecretErrorCode) {
    super(code);
    this.name = "ProviderSecretError";
  }
}

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

function configuredKeyValue(version: number) {
  const versioned = process.env[`PROVIDER_SECRET_ENCRYPTION_KEY_V${version}`]?.trim();
  if (versioned) return versioned;
  if (version === LEGACY_SECRET_VERSION) {
    return process.env.PROVIDER_SECRET_ENCRYPTION_KEY?.trim() || null;
  }
  return null;
}

function encryptionKey(version: number) {
  const value = configuredKeyValue(version);
  if (!value) throw new ProviderSecretError("ENCRYPTION_KEY_VERSION_MISSING");
  if (/^[a-f0-9]{64}$/i.test(value)) return Buffer.from(value, "hex");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length === 32) return decoded;
  throw new ProviderSecretError("ENCRYPTION_KEY_INVALID");
}

export function activeProviderSecretVersion() {
  const raw = process.env[ACTIVE_VERSION_ENV]?.trim() || String(LEGACY_SECRET_VERSION);
  if (!/^[1-9]\d*$/.test(raw)) throw new ProviderSecretError("ENCRYPTION_KEY_INVALID");
  const version = Number(raw);
  if (!Number.isSafeInteger(version)) throw new ProviderSecretError("ENCRYPTION_KEY_INVALID");
  encryptionKey(version);
  return version;
}

export function storedProviderSecretVersion(value: unknown) {
  if (value === null || value === undefined || value === "") return LEGACY_SECRET_VERSION;
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new ProviderSecretError("ENCRYPTION_KEY_INVALID");
  }
  return version;
}

function aad(projectId: string, provider: string) {
  return Buffer.from(`geopilot-provider:${projectId}:${provider}`, "utf8");
}

export function providerSecretStorageAvailable() {
  try {
    activeProviderSecretVersion();
    return true;
  } catch {
    return false;
  }
}

export function providerApiKeyHint(apiKey: string) {
  const trimmed = apiKey.trim();
  const suffix = trimmed.slice(-4);
  return `••••••••••••${suffix}`;
}

export function encryptProviderApiKey(
  apiKey: string,
  projectId: string,
  provider: string,
  version = activeProviderSecretVersion(),
): EncryptedProviderSecret {
  const key = encryptionKey(version);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(aad(projectId, provider));
  const encrypted = Buffer.concat([cipher.update(apiKey.trim(), "utf8"), cipher.final()]);
  return {
    encryptedApiKey: encrypted.toString("base64"),
    apiKeyIv: iv.toString("base64"),
    apiKeyAuthTag: cipher.getAuthTag().toString("base64"),
    apiKeyHint: providerApiKeyHint(apiKey),
    secretVersion: version,
  };
}

export function decryptProviderApiKey(secret: StoredProviderSecret, projectId: string, provider: string) {
  const fields = [secret.encryptedApiKey, secret.apiKeyIv, secret.apiKeyAuthTag];
  if (fields.every(value => value === null || value === undefined || value === "")) return null;
  if (fields.some(value => typeof value !== "string" || !value)) {
    throw new ProviderSecretError("CREDENTIAL_DECRYPTION_FAILED");
  }
  const version = storedProviderSecretVersion(secret.secretVersion);
  const key = encryptionKey(version);
  let encrypted: Buffer;
  let iv: Buffer;
  let authTag: Buffer;
  try {
    encrypted = decodeBase64(String(secret.encryptedApiKey));
    iv = decodeBase64(String(secret.apiKeyIv));
    authTag = decodeBase64(String(secret.apiKeyAuthTag));
    if (!encrypted.length || iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES) {
      throw new Error("INVALID_CREDENTIAL_ENCODING");
    }
  } catch {
    throw new ProviderSecretError("CREDENTIAL_DECRYPTION_FAILED");
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(aad(projectId, provider));
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new ProviderSecretError("CREDENTIAL_INTEGRITY_CHECK_FAILED");
  }
}

function decodeBase64(value: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error("INVALID_BASE64");
  }
  return Buffer.from(value, "base64");
}
