import type { NormalizedPageSnapshot, RawHtmlSnapshot } from "@/features/geo-engine/types/scan.types";

const mockPaths = ["/", "/about", "/products/jewelry-display", "/cases", "/faq", "/contact", "/blog/how-to-choose-display-cabinet"];
const resourceExtensions = /\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|css|js|woff2?)$/i;

export async function fetchRawHtml(url: string): Promise<RawHtmlSnapshot> {
  const pathname = new URL(url).pathname;
  const pageName = pathname === "/" ? "首页" : pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") ?? "page";

  return {
    url,
    headers: { "content-type": "text/html; charset=utf-8", "x-geo-mock": "true" },
    html: `<html><head><title>${pageName} | 广州星河展示柜</title><meta name="description" content="广州展示柜厂家，提供珠宝展示柜、化妆品展示柜和商业空间展示解决方案。"><script type="application/ld+json">{"@type":"Organization"}</script></head><body><h1>${pageName}</h1><h2>珠宝展示柜定制</h2><p>广州星河展示柜有限公司提供展示柜设计、生产、安装与售后服务，具备客户案例、工厂能力与商业空间交付经验。</p>${mockPaths.map((path) => `<a href="${new URL(path, url).toString()}">${path}</a>`).join("")}<a href="https://external.example.com/news">新闻报道</a><a href="/assets/catalog.pdf">PDF</a></body></html>`,
  };
}

export function extractLinks(raw: RawHtmlSnapshot, maxPages = 50) {
  const base = new URL(raw.url);
  const hrefs = [...raw.html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  const uniqueUrls = new Set<string>();

  for (const href of hrefs) {
    const nextUrl = new URL(href, base);
    if (nextUrl.hostname !== base.hostname) continue;
    if (resourceExtensions.test(nextUrl.pathname)) continue;
    uniqueUrls.add(nextUrl.toString());
    if (uniqueUrls.size >= maxPages) break;
  }

  return [...uniqueUrls];
}

export function normalizeSnapshot(raw: RawHtmlSnapshot): NormalizedPageSnapshot {
  const title = raw.html.match(/<title>(.*?)<\/title>/)?.[1] ?? "Untitled";
  const description = raw.html.match(/name="description" content="([^"]+)"/)?.[1] ?? "";
  const headings = [...raw.html.matchAll(/<h[1-3]>(.*?)<\/h[1-3]>/g)].map((match) => match[1]);
  const content = raw.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const links = extractLinks(raw).map((href) => ({ href, label: new URL(href).pathname || "/", internal: true }));
  const schema = [...raw.html.matchAll(/"@type":"([^"]+)"/g)].map((match) => ({ type: match[1], valid: true }));
  const entities = ["广州星河展示柜有限公司", "广州", "展示柜", "珠宝展示柜"];

  return { url: raw.url, title, description, headings, content, links, schema, entities };
}

export async function crawlPage(url: string): Promise<NormalizedPageSnapshot> {
  return normalizeSnapshot(await fetchRawHtml(url));
}
