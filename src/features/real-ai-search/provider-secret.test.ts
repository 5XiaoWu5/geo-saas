import assert from "node:assert/strict";
import { createCipheriv } from "node:crypto";
import test from "node:test";
import {
  ProviderSecretError,
  activeProviderSecretVersion,
  decryptProviderApiKey,
  encryptProviderApiKey,
  providerApiKeyHint,
} from "./provider-secret";

const ENV_NAMES = [
  "PROVIDER_SECRET_ENCRYPTION_KEY",
  "PROVIDER_SECRET_ENCRYPTION_KEY_V1",
  "PROVIDER_SECRET_ENCRYPTION_KEY_V2",
  "PROVIDER_SECRET_ACTIVE_KEY_VERSION",
] as const;

async function withEnvironment(
  values: Partial<Record<(typeof ENV_NAMES)[number], string>>,
  run: () => Promise<void> | void,
) {
  const previous = Object.fromEntries(ENV_NAMES.map(name => [name, process.env[name]]));
  for (const name of ENV_NAMES) delete process.env[name];
  Object.assign(process.env, values);
  try {
    await run();
  } finally {
    for (const name of ENV_NAMES) {
      const value = previous[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

const key = (byte: number) => Buffer.alloc(32, byte).toString("base64");
const secret = "key-project-example-secret-8K2M";

test("provider key hint never contains the complete secret", () => {
  const hint = providerApiKeyHint(secret);
  assert.equal(hint, "••••••••••••8K2M");
  assert.doesNotMatch(hint, /project-example-secret/);
});

test("legacy single-key configuration decrypts V1 credentials and missing versions default to V1", async () => {
  await withEnvironment({ PROVIDER_SECRET_ENCRYPTION_KEY: key(1) }, async () => {
    const encrypted = await encryptProviderApiKey(secret, "project-1", "OPENAI");
    assert.equal(encrypted.secretVersion, 1);
    assert.equal(await decryptProviderApiKey({ ...encrypted, secretVersion: undefined }, "project-1", "OPENAI"), secret);
  });
});

test("Web Crypto decrypts existing Node AES-GCM ciphertext without re-encryption", async () => {
  await withEnvironment({ PROVIDER_SECRET_ENCRYPTION_KEY: key(1) }, async () => {
    const iv = Buffer.alloc(12, 4);
    const cipher = createCipheriv("aes-256-gcm", Buffer.alloc(32, 1), iv);
    cipher.setAAD(Buffer.from("geopilot-provider:project-1:OPENAI", "utf8"));
    const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    assert.equal(await decryptProviderApiKey({
      encryptedApiKey: encrypted.toString("base64"),
      apiKeyIv: iv.toString("base64"),
      apiKeyAuthTag: cipher.getAuthTag().toString("base64"),
      secretVersion: null,
    }, "project-1", "OPENAI"), secret);
  });
});

test("V1-specific key takes precedence over the compatibility alias", async () => {
  await withEnvironment({
    PROVIDER_SECRET_ENCRYPTION_KEY: key(2),
    PROVIDER_SECRET_ENCRYPTION_KEY_V1: key(1),
  }, async () => {
    const encrypted = await encryptProviderApiKey(secret, "project-1", "OPENAI", 1);
    assert.equal(await decryptProviderApiKey(encrypted, "project-1", "OPENAI"), secret);
  });
});

test("V1 falls back to the compatibility alias when the V1-specific key is absent", async () => {
  await withEnvironment({ PROVIDER_SECRET_ENCRYPTION_KEY: key(3) }, async () => {
    const encrypted = await encryptProviderApiKey(secret, "project-1", "OPENAI", 1);
    assert.equal(await decryptProviderApiKey(encrypted, "project-1", "OPENAI"), secret);
  });
});

test("new credentials use the configured active key version", async () => {
  await withEnvironment({
    PROVIDER_SECRET_ENCRYPTION_KEY_V1: key(1),
    PROVIDER_SECRET_ENCRYPTION_KEY_V2: key(2),
    PROVIDER_SECRET_ACTIVE_KEY_VERSION: "2",
  }, async () => {
    assert.equal(activeProviderSecretVersion(), 2);
    const encrypted = await encryptProviderApiKey(secret, "project-1", "GEMINI");
    assert.equal(encrypted.secretVersion, 2);
    assert.equal(await decryptProviderApiKey(encrypted, "project-1", "GEMINI"), secret);
  });
});

test("old and new credentials can be decrypted at the same time", async () => {
  await withEnvironment({
    PROVIDER_SECRET_ENCRYPTION_KEY_V1: key(1),
    PROVIDER_SECRET_ENCRYPTION_KEY_V2: key(2),
    PROVIDER_SECRET_ACTIVE_KEY_VERSION: "2",
  }, async () => {
    const oldCredential = await encryptProviderApiKey(secret, "project-1", "CLAUDE", 1);
    const newCredential = await encryptProviderApiKey(secret, "project-1", "PERPLEXITY");
    assert.equal(await decryptProviderApiKey(oldCredential, "project-1", "CLAUDE"), secret);
    assert.equal(await decryptProviderApiKey(newCredential, "project-1", "PERPLEXITY"), secret);
  });
});

test("missing version keys and invalid active versions fail safely", async () => {
  await withEnvironment({ PROVIDER_SECRET_ENCRYPTION_KEY_V1: key(1) }, async () => {
    const encrypted = await encryptProviderApiKey(secret, "project-1", "OPENAI", 1);
    await assert.rejects(
      decryptProviderApiKey({ ...encrypted, secretVersion: 2 }, "project-1", "OPENAI"),
      (error: unknown) => error instanceof ProviderSecretError && error.code === "ENCRYPTION_KEY_VERSION_MISSING",
    );
  });
  await withEnvironment({
    PROVIDER_SECRET_ENCRYPTION_KEY_V2: key(2),
    PROVIDER_SECRET_ACTIVE_KEY_VERSION: "invalid",
  }, async () => {
    await assert.rejects(
      encryptProviderApiKey(secret, "project-1", "OPENAI"),
      (error: unknown) => error instanceof ProviderSecretError && error.code === "ENCRYPTION_KEY_INVALID",
    );
  });
});

test("AES-GCM integrity failures and malformed credentials use distinct safe codes", async () => {
  await withEnvironment({ PROVIDER_SECRET_ENCRYPTION_KEY: key(7) }, async () => {
    const encrypted = await encryptProviderApiKey(secret, "project-1", "OPENAI");
    await assert.rejects(
      decryptProviderApiKey({ ...encrypted, apiKeyAuthTag: Buffer.alloc(16, 8).toString("base64") }, "project-1", "OPENAI"),
      (error: unknown) => error instanceof ProviderSecretError && error.code === "CREDENTIAL_INTEGRITY_CHECK_FAILED",
    );
    await assert.rejects(
      decryptProviderApiKey({ ...encrypted, apiKeyIv: "invalid" }, "project-1", "OPENAI"),
      (error: unknown) => error instanceof ProviderSecretError && error.code === "CREDENTIAL_DECRYPTION_FAILED",
    );
    await assert.rejects(
      decryptProviderApiKey(encrypted, "project-2", "OPENAI"),
      (error: unknown) => error instanceof ProviderSecretError && error.code === "CREDENTIAL_INTEGRITY_CHECK_FAILED",
    );
  });
});
