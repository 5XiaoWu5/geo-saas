import assert from "node:assert/strict";
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

function withEnvironment(values: Partial<Record<(typeof ENV_NAMES)[number], string>>, run: () => void) {
  const previous = Object.fromEntries(ENV_NAMES.map(name => [name, process.env[name]]));
  for (const name of ENV_NAMES) delete process.env[name];
  Object.assign(process.env, values);
  try {
    run();
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

test("legacy single-key configuration decrypts V1 credentials and missing versions default to V1", () => {
  withEnvironment({ PROVIDER_SECRET_ENCRYPTION_KEY: key(1) }, () => {
    const encrypted = encryptProviderApiKey(secret, "project-1", "OPENAI");
    assert.equal(encrypted.secretVersion, 1);
    assert.equal(decryptProviderApiKey({ ...encrypted, secretVersion: undefined }, "project-1", "OPENAI"), secret);
  });
});

test("V1-specific key takes precedence over the compatibility alias", () => {
  withEnvironment({
    PROVIDER_SECRET_ENCRYPTION_KEY: key(2),
    PROVIDER_SECRET_ENCRYPTION_KEY_V1: key(1),
  }, () => {
    const encrypted = encryptProviderApiKey(secret, "project-1", "OPENAI", 1);
    assert.equal(decryptProviderApiKey(encrypted, "project-1", "OPENAI"), secret);
  });
});

test("V1 falls back to the compatibility alias when the V1-specific key is absent", () => {
  withEnvironment({ PROVIDER_SECRET_ENCRYPTION_KEY: key(3) }, () => {
    const encrypted = encryptProviderApiKey(secret, "project-1", "OPENAI", 1);
    assert.equal(decryptProviderApiKey(encrypted, "project-1", "OPENAI"), secret);
  });
});

test("new credentials use the configured active key version", () => {
  withEnvironment({
    PROVIDER_SECRET_ENCRYPTION_KEY_V1: key(1),
    PROVIDER_SECRET_ENCRYPTION_KEY_V2: key(2),
    PROVIDER_SECRET_ACTIVE_KEY_VERSION: "2",
  }, () => {
    assert.equal(activeProviderSecretVersion(), 2);
    const encrypted = encryptProviderApiKey(secret, "project-1", "GEMINI");
    assert.equal(encrypted.secretVersion, 2);
    assert.equal(decryptProviderApiKey(encrypted, "project-1", "GEMINI"), secret);
  });
});

test("old and new credentials can be decrypted at the same time", () => {
  withEnvironment({
    PROVIDER_SECRET_ENCRYPTION_KEY_V1: key(1),
    PROVIDER_SECRET_ENCRYPTION_KEY_V2: key(2),
    PROVIDER_SECRET_ACTIVE_KEY_VERSION: "2",
  }, () => {
    const oldCredential = encryptProviderApiKey(secret, "project-1", "CLAUDE", 1);
    const newCredential = encryptProviderApiKey(secret, "project-1", "PERPLEXITY");
    assert.equal(decryptProviderApiKey(oldCredential, "project-1", "CLAUDE"), secret);
    assert.equal(decryptProviderApiKey(newCredential, "project-1", "PERPLEXITY"), secret);
  });
});

test("missing version keys and invalid active versions fail safely", () => {
  withEnvironment({ PROVIDER_SECRET_ENCRYPTION_KEY_V1: key(1) }, () => {
    const encrypted = encryptProviderApiKey(secret, "project-1", "OPENAI", 1);
    assert.throws(
      () => decryptProviderApiKey({ ...encrypted, secretVersion: 2 }, "project-1", "OPENAI"),
      (error: unknown) => error instanceof ProviderSecretError && error.code === "ENCRYPTION_KEY_VERSION_MISSING",
    );
  });
  withEnvironment({
    PROVIDER_SECRET_ENCRYPTION_KEY_V2: key(2),
    PROVIDER_SECRET_ACTIVE_KEY_VERSION: "invalid",
  }, () => {
    assert.throws(
      () => encryptProviderApiKey(secret, "project-1", "OPENAI"),
      (error: unknown) => error instanceof ProviderSecretError && error.code === "ENCRYPTION_KEY_INVALID",
    );
  });
});

test("AES-GCM integrity failures and malformed credentials use distinct safe codes", () => {
  withEnvironment({ PROVIDER_SECRET_ENCRYPTION_KEY: key(7) }, () => {
    const encrypted = encryptProviderApiKey(secret, "project-1", "OPENAI");
    assert.throws(
      () => decryptProviderApiKey({ ...encrypted, apiKeyAuthTag: Buffer.alloc(16, 8).toString("base64") }, "project-1", "OPENAI"),
      (error: unknown) => error instanceof ProviderSecretError && error.code === "CREDENTIAL_INTEGRITY_CHECK_FAILED",
    );
    assert.throws(
      () => decryptProviderApiKey({ ...encrypted, apiKeyIv: "invalid" }, "project-1", "OPENAI"),
      (error: unknown) => error instanceof ProviderSecretError && error.code === "CREDENTIAL_DECRYPTION_FAILED",
    );
    assert.throws(
      () => decryptProviderApiKey(encrypted, "project-2", "OPENAI"),
      (error: unknown) => error instanceof ProviderSecretError && error.code === "CREDENTIAL_INTEGRITY_CHECK_FAILED",
    );
  });
});
