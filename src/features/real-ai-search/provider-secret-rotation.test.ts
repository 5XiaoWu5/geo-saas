import assert from "node:assert/strict";
import test from "node:test";
import { rotateProviderCredentials, type ProviderCredentialRotationRecord } from "./provider-secret-rotation";
import { decryptProviderApiKey, encryptProviderApiKey } from "./provider-secret";

const key = (byte: number) => Buffer.alloc(32, byte).toString("base64");
const record = (encrypted: ReturnType<typeof encryptProviderApiKey>): ProviderCredentialRotationRecord => ({
  id: "credential-1",
  projectId: "project-1",
  provider: "OPENAI",
  encryptedApiKey: encrypted.encryptedApiKey,
  apiKeyIv: encrypted.apiKeyIv,
  apiKeyAuthTag: encrypted.apiKeyAuthTag,
  secretVersion: encrypted.secretVersion,
});

test("rotation dry run does not write and apply is idempotent", async () => {
  const previous = { ...process.env };
  process.env.PROVIDER_SECRET_ENCRYPTION_KEY_V1 = key(1);
  process.env.PROVIDER_SECRET_ENCRYPTION_KEY_V2 = key(2);
  process.env.PROVIDER_SECRET_ACTIVE_KEY_VERSION = "2";
  delete process.env.PROVIDER_SECRET_ENCRYPTION_KEY;
  try {
    let current = record(encryptProviderApiKey("secret-value", "project-1", "OPENAI", 1));
    let writes = 0;
    const dryRun = await rotateProviderCredentials([current], {
      dryRun: true,
      update: async () => {
        writes += 1;
        return true;
      },
    });
    assert.equal(dryRun.wouldRotate, 1);
    assert.equal(dryRun.rotated, 0);
    assert.equal(writes, 0);

    const applied = await rotateProviderCredentials([current], {
      dryRun: false,
      update: async (_old, next) => {
        writes += 1;
        current = record(next);
        return true;
      },
    });
    assert.equal(applied.rotated, 1);
    assert.equal(writes, 1);
    assert.equal(current.secretVersion, 2);
    assert.equal(decryptProviderApiKey(current, "project-1", "OPENAI"), "secret-value");

    const repeated = await rotateProviderCredentials([current], {
      dryRun: false,
      update: async () => {
        writes += 1;
        return true;
      },
    });
    assert.equal(repeated.skipped, 1);
    assert.equal(repeated.rotated, 0);
    assert.equal(writes, 1);
  } finally {
    for (const name of Object.keys(process.env)) {
      if (!(name in previous)) delete process.env[name];
    }
    Object.assign(process.env, previous);
  }
});

test("missing old key fails without updating ciphertext", async () => {
  const previous = { ...process.env };
  process.env.PROVIDER_SECRET_ENCRYPTION_KEY_V1 = key(1);
  const old = record(encryptProviderApiKey("secret-value", "project-1", "OPENAI", 1));
  delete process.env.PROVIDER_SECRET_ENCRYPTION_KEY_V1;
  delete process.env.PROVIDER_SECRET_ENCRYPTION_KEY;
  process.env.PROVIDER_SECRET_ENCRYPTION_KEY_V2 = key(2);
  process.env.PROVIDER_SECRET_ACTIVE_KEY_VERSION = "2";
  let writes = 0;
  try {
    const result = await rotateProviderCredentials([old], {
      dryRun: false,
      update: async () => {
        writes += 1;
        return true;
      },
    });
    assert.equal(result.failed, 1);
    assert.equal(result.failures[0]?.code, "ENCRYPTION_KEY_VERSION_MISSING");
    assert.equal(writes, 0);
  } finally {
    for (const name of Object.keys(process.env)) {
      if (!(name in previous)) delete process.env[name];
    }
    Object.assign(process.env, previous);
  }
});
