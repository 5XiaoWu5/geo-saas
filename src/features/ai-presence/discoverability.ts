import { safePublicTextRequest } from "@/lib/server/safe-public-fetch";
import type {
  CorePageEvidence,
  CorePageKind,
  CrawlerAccess,
  DiscoverabilityEvidence,
} from "./types";

const DESKTOP_AGENT = "GeoPilotAI-Presence/1.0 (+https://geopilotapp.com)";
const MOBILE_AGENT = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Mobile Safari/537.36 GeoPilotAI-Presence/1.0";
const CRAWLERS = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Googlebot"] as const;
const PAGE_PATTERNS: Record<CorePageKind, RegExp[]> = {
  HOME: [/^\/?\s*$/i],
  ABOUT: [/about/i, /company/i, /关于|公司介绍|企业介绍/],
  CONTACT: [/contact/i, /联系我们|联系方式/],
  PRODUCT_LIST: [/products?\/?$/i, /产品中心|产品列表/],
  PRODUCT_DETAIL: [/products?\/[^/]+/i, /product-detail/i, /产品详情/],
  SERVICE_LIST: [/services?\/?$/i, /服务中心|服务列表/],
  SERVICE_DETAIL: [/services?\/[^/]+/i, /service-detail/i, /服务详情/],
  QUALIFICATIONS: [/qualification/i, /资质|荣誉/],
  CUSTOMER_CASES: [/cases?/i, /customers?/i, /客户案例|成功案例/],
  FAQ: [/faq/i, /常见问题|问答/],
  PRIVACY: [/privacy/i, /隐私政策/],
  FACTORY_PROFILE: [/factory/i, /工厂介绍|工厂实力/],
  PRODUCTION_CAPACITY: [/capacity/i, /production/i, /生产能力|产能/],
  QUALITY_CONTROL: [/quality/i, /质量控制|品控/],
  CERTIFICATIONS: [/certificat/i, /认证|证书/],
  EQUIPMENT: [/equipment/i, /facility/i, /设备|生产线/],
  EXPORT_MARKETS: [/export/i, /出口市场|海外市场/],
  CUSTOMIZATION: [/custom/i, /oem/i, /odm/i, /定制/],
};

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeHtml((match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim()) || null;
}

function metaContents(html: string, name: string) {
  return (html.match(/<meta\b[^>]*>/gi) ?? [])
    .filter(tag => attribute(tag, "name")?.toLowerCase() === name.toLowerCase())
    .map(tag => attribute(tag, "content"))
    .filter((value): value is string => Boolean(value))
    .flatMap(value => value.toLowerCase().split(",").map(item => item.trim()).filter(Boolean));
}

function parseCanonical(html: string, baseUrl: string) {
  const tag = (html.match(/<link\b[^>]*>/gi) ?? [])
    .find(item => attribute(item, "rel")?.toLowerCase().split(/\s+/).includes("canonical"));
  const href = tag ? attribute(tag, "href") : null;
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function parseLanguage(html: string) {
  const tag = html.match(/<html\b[^>]*>/i)?.[0] ?? "";
  return attribute(tag, "lang");
}

function extractLinks(html: string, baseUrl: string) {
  const links: Array<{ url: string; text: string }> = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attribute(`<a ${match[1] ?? ""}>`, "href");
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    try {
      const url = new URL(href, baseUrl);
      if (url.origin !== new URL(baseUrl).origin) continue;
      const text = decodeHtml((match[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      links.push({ url: url.toString().split("#")[0]!, text });
    } catch {
      // Invalid links are ignored as unusable evidence.
    }
  }
  return links;
}

export function parseSchemaEvidence(html: string) {
  const scripts = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const types = new Set<string>();
  let malformedCount = 0;
  function collect(value: unknown) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(collect);
    const record = value as Record<string, unknown>;
    const current = record["@type"];
    if (typeof current === "string") types.add(current);
    if (Array.isArray(current)) current.filter((item): item is string => typeof item === "string").forEach(item => types.add(item));
    Object.values(record).forEach(collect);
  }
  for (const script of scripts) {
    try {
      collect(JSON.parse(script[1] ?? ""));
    } catch {
      malformedCount += 1;
    }
  }
  return { count: scripts.length, types: [...types].sort(), malformedCount };
}

type RobotsGroup = { agents: string[]; rules: Array<{ directive: "allow" | "disallow"; path: string }> };

export function parseRobotsAccess(content: string, path = "/"): CrawlerAccess[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let rulesStarted = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (!current || rulesStarted) {
        current = { agents: [], rules: [] };
        groups.push(current);
        rulesStarted = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if ((key === "allow" || key === "disallow") && current) {
      current.rules.push({ directive: key, path: value });
      rulesStarted = true;
    }
  }

  return CRAWLERS.map(crawler => {
    const token = crawler.toLowerCase();
    const exact = groups.filter(group => group.agents.includes(token));
    const applicable = exact.length ? exact : groups.filter(group => group.agents.includes("*"));
    const rules = applicable.flatMap(group => group.rules)
      .filter(rule => rule.path && path.startsWith(rule.path))
      .sort((a, b) => b.path.length - a.path.length || (a.directive === "allow" ? -1 : 1));
    const matched = rules[0] ?? null;
    return {
      crawler,
      status: matched?.directive === "disallow" ? "BLOCKED" : matched ? "ALLOWED" : "NO_RULES",
      matchedRule: matched ? `${matched.directive}: ${matched.path}` : null,
    };
  });
}

export function parseSitemapUrls(xml: string) {
  const urls: string[] = [];
  for (const match of xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)) {
    const value = decodeHtml((match[1] ?? "").trim());
    try {
      const url = new URL(value);
      if (["http:", "https:"].includes(url.protocol)) urls.push(url.toString());
    } catch {
      // Invalid sitemap entries are not evidence.
    }
  }
  return [...new Set(urls)].slice(0, 5000);
}

export function detectCorePages(
  homepageUrl: string,
  links: Array<{ url: string; text: string }>,
  sitemapUrls: string[],
) {
  const candidates = [
    { url: homepageUrl, text: "", source: "PROJECT" as const },
    ...links.map(item => ({ ...item, source: "HOME" as const })),
    ...sitemapUrls.map(url => ({ url, text: "", source: "SITEMAP" as const })),
  ];
  return (Object.keys(PAGE_PATTERNS) as CorePageKind[]).map(kind => {
    const found = candidates.find(item => PAGE_PATTERNS[kind].some(pattern => pattern.test(`${new URL(item.url).pathname} ${item.text}`)));
    return { kind, found: Boolean(found), url: found?.url ?? null, source: found?.source ?? "PROJECT" } satisfies CorePageEvidence;
  });
}

function normalizedFact(value: string) {
  return value.toLowerCase().replace(/[\s\-–—(),.，。/\\]+/g, "");
}

export function evaluateCompanyConsistency(
  facts: { legalName?: string; phone?: string; address?: string; businessHours?: string },
  documents: Array<{ url: string; body: string }>,
): DiscoverabilityEvidence["companyConsistency"] {
  return (["legalName", "phone", "address", "businessHours"] as const).map(field => {
    const expected = normalizedFact(facts[field] ?? "");
    if (!expected) return { field, status: "UNAVAILABLE", checkedUrls: documents.map(item => item.url), matchedUrls: [] };
    const matchedUrls = documents
      .filter(item => normalizedFact(item.body.replace(/<[^>]+>/g, " ")).includes(expected))
      .map(item => item.url);
    const status = matchedUrls.length === documents.length && documents.length > 0
      ? "CONSISTENT"
      : matchedUrls.length > 0
        ? "PARTIAL"
        : "NOT_FOUND";
    return { field, status, checkedUrls: documents.map(item => item.url), matchedUrls };
  });
}

function emptyCrawlerEvidence(): CrawlerAccess[] {
  return CRAWLERS.map(crawler => ({ crawler, status: "UNAVAILABLE", matchedRule: null }));
}

function safeErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : "DISCOVERABILITY_CHECK_FAILED";
  return /^[A-Z][A-Z0-9_]+$/.test(message) ? message : "DISCOVERABILITY_CHECK_FAILED";
}

export async function checkDiscoverability(
  targetUrl: string,
  companyFacts: { legalName?: string; phone?: string; address?: string; businessHours?: string } = {},
): Promise<DiscoverabilityEvidence> {
  const checkedAt = new Date().toISOString();
  const evidence: DiscoverabilityEvidence = {
    version: "ai-presence-check-v1",
    checkedAt,
    targetUrl,
    homepage: {
      finalUrl: null,
      statusCode: null,
      accessible: false,
      https: false,
      contentType: null,
      durationMs: null,
      mobileStatusCode: null,
      language: null,
      canonical: null,
      canonicalStatus: "UNAVAILABLE",
      metaRobots: [],
      xRobotsTag: [],
      indexingAllowed: null,
      loginRequired: null,
      rendering: "UNAVAILABLE",
    },
    robots: { url: "", statusCode: null, readable: false, crawlers: emptyCrawlerEvidence() },
    sitemap: { url: "", statusCode: null, readable: false, urlCount: null },
    schema: { count: 0, types: [], malformedCount: 0 },
    corePages: [],
    companyConsistency: [],
    errorCode: null,
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const homepage = await safePublicTextRequest(
      targetUrl,
      { headers: { accept: "text/html,application/xhtml+xml", "user-agent": DESKTOP_AGENT } },
      { signal: controller.signal },
    );
    const finalUrl = homepage.finalUrl;
    const origin = new URL(finalUrl).origin;
    const metaRobots = metaContents(homepage.body, "robots");
    const xRobotsTag = (homepage.xRobotsTag ?? "").toLowerCase().split(",").map(value => value.trim()).filter(Boolean);
    const canonical = parseCanonical(homepage.body, finalUrl);
    const textLength = homepage.body.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
    const scriptCount = homepage.body.match(/<script\b/gi)?.length ?? 0;
    const indexingBlocked = [...metaRobots, ...xRobotsTag].some(value => value === "noindex" || value === "none");
    const mobilePromise = safePublicTextRequest(
      finalUrl,
      { headers: { accept: "text/html,application/xhtml+xml", "user-agent": MOBILE_AGENT } },
      { signal: controller.signal, maxBytes: 250_000 },
    ).catch(() => null);
    const robotsUrl = new URL("/robots.txt", origin).toString();
    const robotsPromise = safePublicTextRequest(
      robotsUrl,
      { headers: { accept: "text/plain", "user-agent": DESKTOP_AGENT } },
      { signal: controller.signal, maxBytes: 500_000 },
    ).catch(() => null);
    const [mobile, robots] = await Promise.all([mobilePromise, robotsPromise]);
    const declaredSitemap = robots?.body.match(/^\s*sitemap\s*:\s*(\S+)/im)?.[1];
    const sitemapUrl = declaredSitemap ? new URL(declaredSitemap, origin).toString() : new URL("/sitemap.xml", origin).toString();
    const sitemap = await safePublicTextRequest(
      sitemapUrl,
      { headers: { accept: "application/xml,text/xml,text/plain", "user-agent": DESKTOP_AGENT } },
      { signal: controller.signal, maxBytes: 1_500_000 },
    ).catch(() => null);
    const sitemapUrls = sitemap?.ok ? parseSitemapUrls(sitemap.body) : [];
    const links = extractLinks(homepage.body, finalUrl);
    const schema = parseSchemaEvidence(homepage.body);

    evidence.homepage = {
      finalUrl,
      statusCode: homepage.status,
      accessible: homepage.ok,
      https: new URL(finalUrl).protocol === "https:",
      contentType: homepage.contentType,
      durationMs: homepage.durationMs,
      mobileStatusCode: mobile?.status ?? null,
      language: parseLanguage(homepage.body),
      canonical,
      canonicalStatus: !canonical ? "MISSING" : canonical === finalUrl ? "VALID" : "CONFLICT",
      metaRobots,
      xRobotsTag,
      indexingAllowed: homepage.ok ? !indexingBlocked : null,
      loginRequired: [401, 403].includes(homepage.status) || /type=["']password["']|sign in|log in|登录/i.test(homepage.body.slice(0, 250_000)),
      rendering: textLength < 180 && scriptCount >= 5 ? "LIKELY_CLIENT_RENDERED" : "SERVER_CONTENT",
    };
    evidence.robots = {
      url: robotsUrl,
      statusCode: robots?.status ?? null,
      readable: Boolean(robots?.ok),
      crawlers: robots?.ok ? parseRobotsAccess(robots.body) : emptyCrawlerEvidence(),
    };
    evidence.sitemap = {
      url: sitemapUrl,
      statusCode: sitemap?.status ?? null,
      readable: Boolean(sitemap?.ok),
      urlCount: sitemap?.ok ? sitemapUrls.length : null,
    };
    evidence.schema = schema;
    evidence.corePages = detectCorePages(finalUrl, links, sitemapUrls);
    const supportingUrls = evidence.corePages
      .filter(item => item.found && (item.kind === "ABOUT" || item.kind === "CONTACT"))
      .map(item => item.url)
      .filter((value): value is string => Boolean(value))
      .slice(0, 2);
    const supportingDocuments = await Promise.all(supportingUrls.map(async url => {
      const page = await safePublicTextRequest(
        url,
        { headers: { accept: "text/html,application/xhtml+xml", "user-agent": DESKTOP_AGENT } },
        { signal: controller.signal, maxBytes: 750_000 },
      ).catch(() => null);
      return page?.ok ? { url: page.finalUrl, body: page.body } : null;
    }));
    evidence.companyConsistency = evaluateCompanyConsistency(companyFacts, [
      { url: finalUrl, body: homepage.body },
      ...supportingDocuments.filter((item): item is { url: string; body: string } => Boolean(item)),
    ]);
    return evidence;
  } catch (error) {
    evidence.errorCode = safeErrorCode(error);
    return evidence;
  } finally {
    clearTimeout(timeout);
  }
}
