export type CrawlResult = {
  url: string;
  status: "completed" | "failed";
  title: string | null;
  description: string | null;
  h1Count: number;
  h2Count: number;
  internalLinkCount: number;
  externalLinkCount: number;
  schemaCount: number;
  schemaTypes: string[];
  robotsExists: boolean;
  sitemapExists: boolean;
};

const CRAWL_TIMEOUT_MS = 12_000;
const AUXILIARY_TIMEOUT_MS = 5_000;
const MAX_HTML_BYTES = 1_500_000;
const TARGET_SCHEMA_TYPES = new Set(["Organization", "Product", "FAQ", "FAQPage", "Article"]);

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

function getTagContent(html: string, tag: string) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1] ? stripHtml(match[1]) : null;
}

function countTags(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}(\\s|>|/)`, "gi"))?.length ?? 0;
}

function getMetaDescription(html: string) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    if (!/name\s*=\s*["']description["']/i.test(tag)) continue;
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content) return decodeHtml(content.trim());
  }
  return null;
}

function extractLinks(html: string, baseUrl: URL) {
  const hrefs = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>/gi)].map((match) => match[1]);
  const internal = new Set<string>();
  const external = new Set<string>();

  for (const href of hrefs) {
    try {
      if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
      const url = new URL(href, baseUrl);
      if (!/^https?:$/.test(url.protocol)) continue;
      if (url.hostname === baseUrl.hostname) internal.add(url.href.split("#")[0]);
      else external.add(url.href.split("#")[0]);
    } catch {
      // Ignore invalid href values.
    }
  }

  return { internalLinkCount: internal.size, externalLinkCount: external.size };
}

function collectTypes(value: unknown, types: Set<string>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectTypes(item, types));
    return;
  }

  const record = value as Record<string, unknown>;
  const typeValue = record["@type"];
  if (typeof typeValue === "string") types.add(typeValue);
  if (Array.isArray(typeValue)) typeValue.filter((item): item is string => typeof item === "string").forEach((item) => types.add(item));

  Object.values(record).forEach((item) => collectTypes(item, types));
}

function extractSchemaTypes(html: string) {
  const scripts = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const schemaTypes = new Set<string>();

  for (const script of scripts) {
    const jsonText = script[1]?.trim();
    if (!jsonText) continue;
    try {
      collectTypes(JSON.parse(jsonText), schemaTypes);
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  const detectedTypes = [...schemaTypes].filter((type) => TARGET_SCHEMA_TYPES.has(type));
  return { schemaCount: scripts.length, schemaTypes: detectedTypes };
}

async function exists(url: URL) {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(AUXILIARY_TIMEOUT_MS),
      headers: { "user-agent": "GeoPilotAI-Crawler/1.0" },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function crawlWebsite(url: string): Promise<CrawlResult> {
  const targetUrl = new URL(url);
  if (!/^https?:$/.test(targetUrl.protocol)) throw new Error("仅支持 HTTP 或 HTTPS 网站地址");

  const response = await fetch(targetUrl, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(CRAWL_TIMEOUT_MS),
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "GeoPilotAI-Crawler/1.0 (+https://geopilotapp.com)",
    },
  });

  if (!response.ok) throw new Error(`网站请求失败，HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.toLowerCase().includes("html")) throw new Error("目标地址没有返回 HTML 内容");

  const html = (await response.text()).slice(0, MAX_HTML_BYTES);
  const finalUrl = new URL(response.url || targetUrl.href);
  const linkCounts = extractLinks(html, finalUrl);
  const schema = extractSchemaTypes(html);
  const origin = new URL(finalUrl.origin);

  const [robotsExists, sitemapExists] = await Promise.all([
    exists(new URL("/robots.txt", origin)),
    exists(new URL("/sitemap.xml", origin)),
  ]);

  return {
    url: finalUrl.href,
    status: "completed",
    title: getTagContent(html, "title"),
    description: getMetaDescription(html),
    h1Count: countTags(html, "h1"),
    h2Count: countTags(html, "h2"),
    internalLinkCount: linkCounts.internalLinkCount,
    externalLinkCount: linkCounts.externalLinkCount,
    schemaCount: schema.schemaCount,
    schemaTypes: schema.schemaTypes,
    robotsExists,
    sitemapExists,
  };
}
