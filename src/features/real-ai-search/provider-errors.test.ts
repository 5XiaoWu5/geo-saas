import assert from "node:assert/strict";
import test from "node:test";
import { classifyProviderHttpError, normalizeProviderRuntimeError } from "./provider-errors";
import { providerRegistry } from "./provider-adapters";

test("maps invalid API keys to a user-safe error category", () => {
  assert.equal(classifyProviderHttpError(401, { error: { message: "Invalid API key" } }), "API_KEY_INVALID");
});

test("distinguishes permissions, balance, rate limits, and provider outages", () => {
  assert.equal(classifyProviderHttpError(403, { error: { message: "Permission denied" } }), "API_KEY_PERMISSION_DENIED");
  assert.equal(classifyProviderHttpError(429, { error: { code: "insufficient_quota" } }), "ACCOUNT_BALANCE_INSUFFICIENT");
  assert.equal(classifyProviderHttpError(429, { error: { message: "Rate limit exceeded" } }), "PROVIDER_RATE_LIMITED");
  assert.equal(classifyProviderHttpError(503, {}), "PROVIDER_UNAVAILABLE");
  assert.equal(classifyProviderHttpError(404, { error: { message: "model not found" } }), "MODEL_NOT_FOUND");
  assert.equal(classifyProviderHttpError(400, { error: { message: "unsupported model" } }), "MODEL_UNSUPPORTED");
});

test("maps network and secret configuration failures without exposing details", () => {
  assert.equal(normalizeProviderRuntimeError(new TypeError("fetch failed")), "PROVIDER_NETWORK_ERROR");
  assert.equal(normalizeProviderRuntimeError(new Error("PROVIDER_SECRET_STORAGE_UNAVAILABLE")), "PROVIDER_SERVER_CONFIG_ERROR");
  assert.equal(normalizeProviderRuntimeError(new Error("sensitive provider response")), "PROVIDER_UNKNOWN_ERROR");
});

test("provider adapter returns a real successful response without exposing the key", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "request-1", output_text: "OK" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  try {
    const result = await providerRegistry.OPENAI.query(
      { query: "connection test", intent: "TECHNICAL", targetEntity: "Example", industry: "Testing" },
      { apiKey: "private-test-credential", model: "gpt-test", connectionType: "OPENAI_OFFICIAL", baseUrl: null, signal: new AbortController().signal },
    );
    assert.equal(result.text, "OK");
    assert.doesNotMatch(JSON.stringify(result), /private-test-credential/);
  } finally {
    globalThis.fetch = previous;
  }
});

test("provider adapter converts a real failed response into a safe category", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: "Invalid API key" } }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
  try {
    await assert.rejects(
      providerRegistry.OPENAI.query(
        { query: "connection test", intent: "TECHNICAL", targetEntity: "Example", industry: "Testing" },
        { apiKey: "private-test-credential", model: "gpt-test", connectionType: "OPENAI_OFFICIAL", baseUrl: null, signal: new AbortController().signal },
      ),
      /API_KEY_INVALID/,
    );
  } finally {
    globalThis.fetch = previous;
  }
});

test("provider integration maps billing, permissions, rate limits, outages, and invalid JSON", async () => {
  const previous = globalThis.fetch;
  const cases = [
    { status: 402, body: { error: { message: "payment required" } }, code: "ACCOUNT_BALANCE_INSUFFICIENT" },
    { status: 403, body: { error: { message: "permission denied" } }, code: "API_KEY_PERMISSION_DENIED" },
    { status: 429, body: { error: { message: "rate limit exceeded" } }, code: "PROVIDER_RATE_LIMITED" },
    { status: 503, body: { error: { message: "service unavailable" } }, code: "PROVIDER_UNAVAILABLE" },
  ] as const;
  try {
    for (const item of cases) {
      globalThis.fetch = async () => new Response(JSON.stringify(item.body), {
        status: item.status,
        headers: { "content-type": "application/json" },
      });
      await assert.rejects(queryOpenAI(), new RegExp(item.code));
    }
    globalThis.fetch = async () => new Response("{not-json", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    await assert.rejects(queryOpenAI(), /PROVIDER_INVALID_RESPONSE/);
  } finally {
    globalThis.fetch = previous;
  }
});

test("provider integration maps network interruption and timeout without leaking credentials", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError("connection reset while using private-test-credential"); };
    await assert.rejects(queryOpenAI(), /PROVIDER_NETWORK_ERROR/);
    globalThis.fetch = async () => { throw new DOMException("aborted private-test-credential", "AbortError"); };
    await assert.rejects(queryOpenAI(), /PROVIDER_TIMEOUT/);
  } finally {
    globalThis.fetch = previous;
  }
});

function queryOpenAI() {
  return providerRegistry.OPENAI.query(
    { query: "connection test", intent: "TECHNICAL", targetEntity: "Example", industry: "Testing" },
    { apiKey: "private-test-credential", model: "gpt-test", connectionType: "OPENAI_OFFICIAL", baseUrl: null, signal: new AbortController().signal },
  );
}
