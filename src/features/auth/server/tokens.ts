function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function createToken(bytes = 32): string {
  const randomBytes = new Uint8Array(bytes);
  crypto.getRandomValues(randomBytes);
  return bytesToBase64Url(randomBytes);
}

export function createNumericCode(length = 6): string {
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, (byte) => String(byte % 10)).join("");
}

export async function sha256(value: string): Promise<string> {
  const input = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
