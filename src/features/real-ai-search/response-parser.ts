import type { ParsedAISearchResponse, ProviderRawResponse, ResponseAnalysisInput } from "./types";

const URL_PATTERN = /https?:\/\/[^\s<>()\]"']+/gi;
function normalized(value: string) { return value.trim().toLocaleLowerCase(); }
function includesName(text: string, name: string) { return Boolean(name.trim()) && normalized(text).includes(normalized(name)); }
function domainOf(url: string) { try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } }

export function parseAISearchResponse(response: ProviderRawResponse, input: ResponseAnalysisInput): ParsedAISearchResponse {
  const text = response.text.trim();
  const mentioned = includesName(text, input.targetEntity);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let rankPosition: number | null = null;
  for (const line of lines) {
    if (!includesName(line, input.targetEntity)) continue;
    const match = line.match(/^(?:#{1,4}\s*)?(\d{1,3})[.、)）:\-]\s*/);
    if (match) { rankPosition = Number(match[1]); break; }
  }
  const productMentions = input.productNames.filter((name) => includesName(text, name));
  const competitorBrands = input.competitorNames.filter((name) => includesName(text, name));
  const urls = [...response.citations, ...(text.match(URL_PATTERN) ?? [])].map((url) => url.replace(/[.,;:!?，。；：！？]+$/, ""));
  const counts = new Map<string, number>();
  for (const url of urls) if (domainOf(url)) counts.set(url, (counts.get(url) ?? 0) + 1);
  const official = input.officialDomain.replace(/^www\./, "").toLowerCase();
  const citations = [...counts.entries()].map(([url, citationCount], index) => { const domain = domainOf(url); return { url, domain, citationType: domain === official || domain.endsWith(`.${official}`) ? "OFFICIAL" as const : "THIRD_PARTY" as const, position: index + 1, citationCount }; });
  return { mentioned, rankPosition, productMentions, competitorBrands, citations };
}
