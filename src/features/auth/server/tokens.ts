import crypto from "crypto";

export function createToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function createNumericCode(length = 6): string {
  return Array.from({ length }, () => crypto.randomInt(0, 10)).join("");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
