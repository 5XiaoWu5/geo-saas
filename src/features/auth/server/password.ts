const HASH_PREFIX = "pbkdf2-sha256";
const ITERATIONS = 210_000;
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

async function derivePasswordKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
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

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await derivePasswordKey(password, salt);
  return `${HASH_PREFIX}$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(key)}`;
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  const [algorithm, iterations, saltValue, keyValue] = hash.split("$");
  if (algorithm !== HASH_PREFIX || Number(iterations) !== ITERATIONS || !saltValue || !keyValue) return false;

  const salt = base64ToBytes(saltValue);
  const expectedKey = base64ToBytes(keyValue);
  const actualKey = new Uint8Array(await derivePasswordKey(password, salt));
  return timingSafeEqual(actualKey, expectedKey);
}