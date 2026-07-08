import type { GeoEngineInput, GeoRuleFinding, GeoRuleResult } from "@/features/geo-engine/types";
import { clampScore } from "@/features/geo-engine/types";

export function evaluateContentRules(input: GeoEngineInput): GeoRuleResult {
  const indexablePages = input.pages.filter((page) => page.indexable && page.statusCode === 200);
  const thinPages = indexablePages.filter((page) => page.wordCount < 500);
  const richPages = indexablePages.filter((page) => page.wordCount >= 900);
  const missingDescriptions = input.pages.filter((page) => page.meta.Description !== "Present");
  const docsOrBlogPages = indexablePages.filter((page) => page.pageType === "Docs" || page.pageType === "Blog");
  const findings: GeoRuleFinding[] = [];
  const strengths: string[] = [];
  let score = 50;

  score += Math.min(18, richPages.length * 3);
  if (richPages.length >= 4) strengths.push("Multiple indexable pages contain enough body copy for answer extraction.");

  if (docsOrBlogPages.length >= 3) {
    score += 12;
    strengths.push("Docs and blog pages provide educational content depth.");
  } else {
    findings.push({ id: "content-educational-depth", dimension: "content", priority: "Medium", title: "Educational content depth is limited", detail: "AI answer engines benefit from explanatory docs, guides, and comparison pages.", recommendation: "Add guides, use-case pages, FAQs, and comparison content mapped to buyer questions.", impact: 12 });
  }

  if (thinPages.length) {
    score -= thinPages.length * 4;
    findings.push({ id: "content-thin-pages", dimension: "content", priority: thinPages.length > 2 ? "High" : "Medium", title: "Thin indexable pages detected", detail: `${thinPages.length} indexable pages have fewer than 500 words.`, recommendation: "Expand thin pages with product details, proof points, FAQs, examples, and decision criteria.", impact: thinPages.length * 4 });
  }

  if (missingDescriptions.length) {
    score -= missingDescriptions.length * 3;
    findings.push({ id: "content-meta-description", dimension: "content", priority: "Medium", title: "Meta descriptions need coverage", detail: `${missingDescriptions.length} pages have missing or warning-level descriptions.`, recommendation: "Write concise page descriptions that clarify entity, offer, audience, and page purpose.", impact: missingDescriptions.length * 3 });
  } else {
    strengths.push("Meta descriptions are present across the inventory sample.");
  }

  return { dimension: "content", score: clampScore(score), strengths, findings };
}
