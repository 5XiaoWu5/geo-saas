import assert from "node:assert/strict";
import test from "node:test";
import { decryptProviderApiKey, encryptProviderApiKey, providerApiKeyHint } from "./provider-secret";

test("provider key hint never contains the complete secret", () => {
  const secret = "key-project-example-secret-8K2M";
  const hint = providerApiKeyHint(secret);
  assert.equal(hint, "key-••••••••••••8K2M");
  assert.doesNotMatch(hint, /project-example-secret/);
});

test("provider keys round trip through project-bound AES-GCM encryption", () => {
  const previous = process.env.PROVIDER_SECRET_ENCRYPTION_KEY;
  process.env.PROVIDER_SECRET_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  try {
    const secret = "key-project-example-secret-8K2M";
    const encrypted = encryptProviderApiKey(secret, "project-1", "OPENAI");
    assert.notEqual(encrypted.encryptedApiKey, secret);
    assert.equal(decryptProviderApiKey(encrypted, "project-1", "OPENAI"), secret);
    assert.throws(() => decryptProviderApiKey(encrypted, "project-2", "OPENAI"), /PROVIDER_SECRET_DECRYPTION_FAILED/);
  } finally {
    if (previous === undefined) delete process.env.PROVIDER_SECRET_ENCRYPTION_KEY;
    else process.env.PROVIDER_SECRET_ENCRYPTION_KEY = previous;
  }
});
