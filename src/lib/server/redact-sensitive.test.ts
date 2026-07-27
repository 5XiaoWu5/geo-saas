import assert from "node:assert/strict";
import test from "node:test";
import { redactSensitive, safeErrorCode } from "./redact-sensitive";

test("sensitive fields and credential-like values are redacted recursively", () => {
  const secret = "sk-project-secret-123456789";
  const redacted = redactSensitive({
    apiKey: secret,
    nested: { authorization: `Bearer ${secret}`, message: `request failed for ${secret}` },
    safe: "OPENAI",
  });
  const serialized = JSON.stringify(redacted);
  assert.doesNotMatch(serialized, /project-secret/);
  assert.match(serialized, /\[REDACTED\]/);
  assert.match(serialized, /OPENAI/);
});

test("safe error codes never expose arbitrary exception messages", () => {
  assert.equal(safeErrorCode(new Error("API_KEY_INVALID"), "FAILED"), "API_KEY_INVALID");
  assert.equal(safeErrorCode(new Error("request failed for sk-secret-value"), "FAILED"), "FAILED");
});
