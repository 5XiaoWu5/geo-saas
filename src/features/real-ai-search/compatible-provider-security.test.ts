import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSafeCompatibleBaseUrl,
  isPrivateNetworkAddress,
  normalizeCompatibleBaseUrl,
  safeCompatibleJsonRequest,
} from "./compatible-provider-security";

test("production compatible gateways require HTTPS and reject credentials or sensitive queries", () => {
  assert.throws(() => normalizeCompatibleBaseUrl("http://api.example.com/v1", true), /HTTPS_REQUIRED/);
  assert.throws(() => normalizeCompatibleBaseUrl("https://user:pass@api.example.com/v1", true), /CREDENTIALS_FORBIDDEN/);
  assert.throws(() => normalizeCompatibleBaseUrl("https://api.example.com/v1?token=secret", true), /CREDENTIALS_FORBIDDEN/);
  assert.equal(normalizeCompatibleBaseUrl("https://api.example.com/v1/", true), "https://api.example.com/v1");
});

test("localhost, private IPv4, metadata, IPv6 loopback, and link-local targets are rejected", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "172.16.1.2", "192.168.1.2", "169.254.169.254", "::1", "fe80::1", "fd00::1"]) {
    assert.equal(isPrivateNetworkAddress(address), true, address);
  }
  for (const url of ["https://localhost/v1", "https://127.0.0.1/v1", "https://169.254.169.254/latest", "https://metadata.google.internal/v1"]) {
    assert.throws(() => normalizeCompatibleBaseUrl(url, true), /PRIVATE_NETWORK/);
  }
});

test("DNS resolution to private networks is rejected", async () => {
  await assert.rejects(
    assertSafeCompatibleBaseUrl("https://gateway.example/v1", {
      production: true,
      signal: new AbortController().signal,
      resolveHost: async () => ["10.0.0.5"],
    }),
    /PRIVATE_NETWORK/,
  );
});

test("redirects are revalidated and cannot reach private networks", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, {
    status: 302,
    headers: { location: "https://internal.example/latest" },
  });
  try {
    await assert.rejects(
      safeCompatibleJsonRequest("https://gateway.example/v1/models", { method: "GET" }, {
        production: true,
        signal: new AbortController().signal,
        resolveHost: async hostname => hostname === "internal.example" ? ["192.168.1.8"] : ["203.0.113.10"],
      }),
      /PRIVATE_NETWORK/,
    );
  } finally {
    globalThis.fetch = previous;
  }
});

test("public CDN address rotation is allowed", async () => {
  let resolution = 0;
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [] }), { status: 200 });
  try {
    const result = await safeCompatibleJsonRequest("https://gateway.example/v1/models", { method: "GET" }, {
      production: true,
      signal: new AbortController().signal,
      resolveHost: async () => [resolution++ === 0 ? "203.0.113.10" : "203.0.113.11"],
    });
    assert.deepEqual(result, { data: [] });
  } finally {
    globalThis.fetch = previous;
  }
});

test("a public-to-private DNS switch is rejected as a rebinding risk", async () => {
  let resolution = 0;
  await assert.rejects(
    safeCompatibleJsonRequest("https://gateway.example/v1/models", { method: "GET" }, {
      production: true,
      signal: new AbortController().signal,
      resolveHost: async () => [resolution++ === 0 ? "203.0.113.10" : "10.0.0.8"],
    }),
    /PRIVATE_NETWORK/,
  );
});

test("a public HTTPS gateway can return bounded JSON", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ id: "model-1" }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  try {
    const result = await safeCompatibleJsonRequest("https://gateway.example/v1/models", { method: "GET" }, {
      production: true,
      signal: new AbortController().signal,
      resolveHost: async () => ["203.0.113.10"],
    });
    assert.deepEqual(result, { data: [{ id: "model-1" }] });
  } finally {
    globalThis.fetch = previous;
  }
});
