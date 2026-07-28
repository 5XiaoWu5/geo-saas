import assert from "node:assert/strict";
import test from "node:test";
import {
  detectCorePages,
  evaluateCompanyConsistency,
  parseRobotsAccess,
  parseSchemaEvidence,
  parseSitemapUrls,
} from "./discoverability";

test("robots rules distinguish OpenAI, Anthropic, Google, and user-triggered access", () => {
  const result = parseRobotsAccess(`
User-agent: *
Disallow: /private

User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-SearchBot
Disallow: /

User-agent: Googlebot
Allow: /
`);
  assert.equal(result.find(item => item.crawler === "OAI-SearchBot")?.status, "ALLOWED");
  assert.equal(result.find(item => item.crawler === "Claude-SearchBot")?.status, "BLOCKED");
  assert.equal(result.find(item => item.crawler === "Googlebot")?.status, "ALLOWED");
  assert.equal(result.find(item => item.crawler === "ChatGPT-User")?.status, "NO_RULES");
});

test("robots longest matching rule allows a more specific path", () => {
  const result = parseRobotsAccess("User-agent: *\nDisallow: /\nAllow: /public", "/public/company");
  assert.equal(result.every(item => item.status === "ALLOWED"), true);
});

test("sitemap parsing keeps unique public URLs", () => {
  const urls = parseSitemapUrls(`
    <urlset>
      <url><loc>https://example.com/</loc></url>
      <url><loc>https://example.com/contact</loc></url>
      <url><loc>https://example.com/contact</loc></url>
      <url><loc>javascript:alert(1)</loc></url>
    </urlset>
  `);
  assert.deepEqual(urls, ["https://example.com/", "https://example.com/contact"]);
});

test("core pages are derived from homepage and sitemap evidence", () => {
  const pages = detectCorePages(
    "https://example.com/",
    [{ url: "https://example.com/contact", text: "联系我们" }],
    ["https://example.com/products/widget", "https://example.com/privacy"],
  );
  assert.equal(pages.find(item => item.kind === "HOME")?.found, true);
  assert.equal(pages.find(item => item.kind === "CONTACT")?.source, "HOME");
  assert.equal(pages.find(item => item.kind === "PRODUCT_DETAIL")?.source, "SITEMAP");
  assert.equal(pages.find(item => item.kind === "FAQ")?.found, false);
});

test("schema parser reports malformed data without inventing types", () => {
  const schema = parseSchemaEvidence(`
    <script type="application/ld+json">{"@type":"Organization","name":"Example"}</script>
    <script type="application/ld+json">{invalid}</script>
  `);
  assert.deepEqual(schema.types, ["Organization"]);
  assert.equal(schema.count, 2);
  assert.equal(schema.malformedCount, 1);
});

test("company facts are checked consistently across real page bodies", () => {
  const consistency = evaluateCompanyConsistency(
    { legalName: "Example Manufacturing Ltd", phone: "+86 20 1234 5678", address: "Guangzhou" },
    [
      { url: "https://example.com/", body: "<p>Example Manufacturing Ltd +86 20 1234 5678 Guangzhou</p>" },
      { url: "https://example.com/contact", body: "<p>Example Manufacturing Ltd +86 20 1234 5678</p>" },
    ],
  );
  assert.equal(consistency.find(item => item.field === "legalName")?.status, "CONSISTENT");
  assert.equal(consistency.find(item => item.field === "phone")?.status, "CONSISTENT");
  assert.equal(consistency.find(item => item.field === "address")?.status, "PARTIAL");
  assert.equal(consistency.find(item => item.field === "businessHours")?.status, "UNAVAILABLE");
});
