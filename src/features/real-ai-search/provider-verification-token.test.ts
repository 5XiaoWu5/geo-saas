import assert from "node:assert/strict";
import test from "node:test";
import {
  issueProviderVerificationToken,
  providerCredentialFingerprint,
  verifyProviderVerificationToken,
} from "./provider-verification-token";

test("verification tokens bind project, provider, model, endpoint, and credential without exposing the key", async () => {
  const previous = process.env.PROVIDER_MODEL_VERIFICATION_SECRET;
  process.env.PROVIDER_MODEL_VERIFICATION_SECRET = "test-only-provider-verification-secret-32";
  try {
    const fingerprint = await providerCredentialFingerprint("private-key", "OPENAI_COMPATIBLE", "https://gateway.example/v1");
    const token = await issueProviderVerificationToken({
      projectId: "project-1",
      provider: "OPENAI",
      connectionType: "OPENAI_COMPATIBLE",
      baseUrl: "https://gateway.example/v1",
      modelId: "model-1",
      credentialFingerprint: fingerprint,
      capabilities: {
        textGeneration: "SUPPORTED",
        structuredOutput: "NOT_TESTED",
        streaming: "NOT_TESTED",
        toolCalling: "NOT_TESTED",
        webSearch: "NOT_TESTED",
        citationSources: "NOT_TESTED",
      },
      compatibilityLevel: "BASIC",
      verifiedAt: new Date().toISOString(),
    });
    assert.doesNotMatch(token, /private-key/);
    const claims = await verifyProviderVerificationToken(token);
    assert.equal(claims.projectId, "project-1");
    assert.equal(claims.modelId, "model-1");
    await assert.rejects(verifyProviderVerificationToken(`${token}tampered`), /TOKEN_INVALID/);
  } finally {
    if (previous === undefined) delete process.env.PROVIDER_MODEL_VERIFICATION_SECRET;
    else process.env.PROVIDER_MODEL_VERIFICATION_SECRET = previous;
  }
});
