const WEB_CRYPTO_ALGORITHM = "AES-GCM";
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

function bytes(value: string) {
  return new TextEncoder().encode(value);
}

function exactArrayBuffer(value: Uint8Array) {
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}

async function cryptoKey(version: number, usage: KeyUsage) {
  const raw = new Uint8Array(encryptionKey(version));
  return crypto.subtle.importKey(
    "raw",
    exactArrayBuffer(raw),
    { name: WEB_CRYPTO_ALGORITHM },
    false,
    [usage],
  );
}

function aad(projectId: string, provider: string) {
  return bytes(`geopilot-provider:${projectId}:${provider}`);
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

export async function encryptProviderApiKey(
  apiKey: string,
  projectId: string,
  provider: string,
  version = activeProviderSecretVersion(),
): Promise<EncryptedProviderSecret> {
  const key = await cryptoKey(version, "encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const combined = new Uint8Array(await crypto.subtle.encrypt(
    {
      name: WEB_CRYPTO_ALGORITHM,
      iv: exactArrayBuffer(iv),
      additionalData: exactArrayBuffer(aad(projectId, provider)),
      tagLength: AUTH_TAG_BYTES * 8,
    },
    key,
    exactArrayBuffer(bytes(apiKey.trim())),
  ));
  const tagOffset = combined.length - AUTH_TAG_BYTES;
  const encrypted = combined.slice(0, tagOffset);
  const authTag = combined.slice(tagOffset);
  return {
    encryptedApiKey: Buffer.from(encrypted).toString("base64"),
    apiKeyIv: Buffer.from(iv).toString("base64"),
    apiKeyAuthTag: Buffer.from(authTag).toString("base64"),
    apiKeyHint: providerApiKeyHint(apiKey),
    secretVersion: version,
  };
}

export async function decryptProviderApiKey(secret: StoredProviderSecret, projectId: string, provider: string) {
  const fields = [secret.encryptedApiKey, secret.apiKeyIv, secret.apiKeyAuthTag];
  if (fields.every(value => value === null || value === undefined || value === "")) return null;
  if (fields.some(value => typeof value !== "string" || !value)) {
    throw new ProviderSecretError("CREDENTIAL_DECRYPTION_FAILED");
  }
  const version = storedProviderSecretVersion(secret.secretVersion);
  const key = await cryptoKey(version, "decrypt");
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
    const combined = new Uint8Array(encrypted.length + authTag.length);
    combined.set(encrypted);
    combined.set(authTag, encrypted.length);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: WEB_CRYPTO_ALGORITHM,
        iv: exactArrayBuffer(iv),
        additionalData: exactArrayBuffer(aad(projectId, provider)),
        tagLength: AUTH_TAG_BYTES * 8,
      },
      key,
      exactArrayBuffer(combined),
    );
    return new TextDecoder().decode(decrypted);
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
