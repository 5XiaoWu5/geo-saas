const HASH_PREFIX = "pbkdf2-sha256";
const HMAC_PREFIX = "hmac-sha256";
const ITERATIONS = 210_000;
const HMAC_ITERATIONS = 120_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function derivePbkdf2Key(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const passwordBytes = new TextEncoder().encode(password);
  const baseKey = await crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations: ITERATIONS,
    },
    baseKey,
    KEY_BYTES * 8,
  );
}

async function deriveHmacKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  let digest = new Uint8Array(salt);

  for (let index = 0; index < HMAC_ITERATIONS; index += 1) {
    digest = new Uint8Array(await crypto.subtle.sign("HMAC", keyMaterial, digest));
  }

  return digest.slice(0, KEY_BYTES);
}

function logPasswordError(stage: string, error: unknown) {
  console.error(`[AUTH PASSWORD] ${stage}`, {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
    subtlePresent: Boolean(globalThis.crypto?.subtle),
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));

  try {
    const key = await derivePbkdf2Key(password, salt);
    return `${HASH_PREFIX}$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(key)}`;
  } catch (error) {
    logPasswordError("pbkdf2 hash failed, falling back to hmac", error);
    const key = await deriveHmacKey(password, salt);
    return `${HMAC_PREFIX}$${HMAC_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(key)}`;
  }
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  const [algorithm, iterations, saltValue, keyValue] = hash.split("$");
  if (!saltValue || !keyValue) return false;

  const salt = base64ToBytes(saltValue);
  const expectedKey = base64ToBytes(keyValue);

  if (algorithm === HASH_PREFIX && Number(iterations) === ITERATIONS) {
    const actualKey = new Uint8Array(await derivePbkdf2Key(password, salt));
    return timingSafeEqual(actualKey, expectedKey);
  }

  if (algorithm === HMAC_PREFIX && Number(iterations) === HMAC_ITERATIONS) {
    const actualKey = await deriveHmacKey(password, salt);
    return timingSafeEqual(actualKey, expectedKey);
  }

  return false;
}
