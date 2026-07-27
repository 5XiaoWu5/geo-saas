import assert from "node:assert/strict";
import test from "node:test";
import { providerRegistry } from "./provider-adapters";

test("OpenAI model options come from the current provider response", async () => {
  const previous = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async input => {
    calls.push(String(input));
    return new Response(JSON.stringify({
      data: [{ id: "gpt-test-b" }, { id: "gpt-test-a" }],
    }), { status: 200 });
  };
  try {
    const models = await providerRegistry.OPENAI.listModels({
      apiKey: "private-test-key",
      connectionType: "OPENAI_OFFICIAL",
      baseUrl: null,
      signal: new AbortController().signal,
    });
    assert.deepEqual(models.map(model => model.modelId), ["gpt-test-a", "gpt-test-b"]);
    assert.deepEqual(calls, ["https://api.openai.com/v1/models"]);
    assert.ok(models.every(model => model.availability === "LISTED_NOT_TESTED"));
    assert.doesNotMatch(JSON.stringify(models), /private-test-key/);
  } finally {
    globalThis.fetch = previous;
  }
});

test("compatible OpenAI calls the gateway chat completion endpoint without fabricating citations", async () => {
  const previous = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async input => {
    calls.push(String(input));
    if (String(input).includes("cloudflare-dns.com")) {
      return new Response(JSON.stringify({ Answer: [{ type: 1, data: "203.0.113.20" }] }), { status: 200 });
    }
    return new Response(JSON.stringify({
      id: "gateway-request",
      choices: [{ message: { content: "OK https://unverified.example/source" } }],
    }), { status: 200 });
  };
  try {
    const response = await providerRegistry.OPENAI.query(
      { query: "test", intent: "TECHNICAL", targetEntity: "Example", industry: "Testing" },
      {
        apiKey: "private-test-key",
        model: "gateway-model",
        connectionType: "OPENAI_COMPATIBLE",
        baseUrl: "https://gateway.example/v1",
        verificationOnly: true,
        signal: new AbortController().signal,
      },
    );
    assert.ok(calls.some(url => url === "https://gateway.example/v1/chat/completions"));
    assert.deepEqual(response.citations, []);
  } finally {
    globalThis.fetch = previous;
  }
});
