import assert from "node:assert/strict";
import test from "node:test";
import { safePublicTextRequest } from "./safe-public-fetch";

const publicResolver = async () => ["203.0.113.10"];

test("public fetch rejects private and metadata targets", async () => {
  const signal = new AbortController().signal;
  await assert.rejects(
    safePublicTextRequest("http://127.0.0.1/private", {}, { signal, resolveHost: publicResolver }),
    /PUBLIC_URL_PRIVATE_NETWORK/,
  );
  await assert.rejects(
    safePublicTextRequest("http://metadata.google.internal/", {}, { signal, resolveHost: publicResolver }),
    /PUBLIC_URL_PRIVATE_NETWORK/,
  );
});

test("redirect destinations are revalidated", async () => {
  const signal = new AbortController().signal;
  await assert.rejects(
    safePublicTextRequest("https://example.com", {}, {
      signal,
      resolveHost: async hostname => hostname === "internal.example" ? ["10.0.0.2"] : ["203.0.113.10"],
      fetcher: async () => new Response(null, { status: 302, headers: { location: "http://internal.example/" } }),
    }),
    /PUBLIC_URL_PRIVATE_NETWORK/,
  );
});

test("public HTML response records real status and body", async () => {
  const signal = new AbortController().signal;
  const result = await safePublicTextRequest("https://example.com", {}, {
    signal,
    resolveHost: publicResolver,
    fetcher: async () => new Response("<html lang=\"en\">Example</html>", { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.ok, true);
  assert.match(result.body, /Example/);
});
