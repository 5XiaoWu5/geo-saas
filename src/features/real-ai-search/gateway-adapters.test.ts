import assert from "node:assert/strict";
import test from "node:test";
import { discoverGatewayModels } from "./gateway-adapters";

test("a root OpenAI-compatible gateway discovers models through /v1/models", async () => {
  const previous = globalThis.fetch;
  const requests: Array<{ url: string; redirect?: RequestRedirect; authorization?: string }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({
      url,
      redirect: init?.redirect,
      authorization: new Headers(init?.headers).get("authorization") ?? undefined,
    });
    if (url.startsWith("https://cloudflare-dns.com/")) {
      return new Response(JSON.stringify({
        Answer: [{ type: 1, data: "203.0.113.10" }],
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      data: [
        { id: "claude-3-7-sonnet" },
        { id: "gemini-2.5-pro" },
        { id: "gpt-5-mini" },
      ],
    }), { status: 200 });
  };
  try {
    const models = await discoverGatewayModels({
      protocol: "OPENAI_COMPATIBLE",
      baseUrl: "https://gateway.example",
      apiKey: "secret-value",
      signal: new AbortController().signal,
    });
    assert.deepEqual(models.map(model => model.family), ["CLAUDE", "GEMINI", "OPENAI"]);
    const gatewayRequest = requests.find(request => request.url === "https://gateway.example/v1/models");
    assert.equal(gatewayRequest?.authorization, "Bearer secret-value");
    assert.equal(requests.filter(request => request.url.startsWith("https://cloudflare-dns.com/")).every(
      request => request.redirect === "manual",
    ), true);
  } finally {
    globalThis.fetch = previous;
  }
});

test("a URL that already contains /v1 is not duplicated", async () => {
  const previous = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requested.push(url);
    if (url.startsWith("https://cloudflare-dns.com/")) {
      return new Response(JSON.stringify({ Answer: [{ type: 1, data: "203.0.113.10" }] }), { status: 200 });
    }
    return new Response(JSON.stringify({ data: [{ id: "sonar" }] }), { status: 200 });
  };
  try {
    await discoverGatewayModels({
      protocol: "OPENAI_COMPATIBLE",
      baseUrl: "https://gateway.example/v1",
      apiKey: "secret-value",
      signal: new AbortController().signal,
    });
    assert.ok(requested.includes("https://gateway.example/v1/models"));
    assert.equal(requested.some(url => url.includes("/v1/v1/")), false);
  } finally {
    globalThis.fetch = previous;
  }
});
