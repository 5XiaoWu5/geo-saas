import type { GeoEngineInput, GeoRuleFinding, GeoRuleResult } from "@/features/geo-engine/types";
import { clampScore } from "@/features/geo-engine/types";

export function evaluateTrustRules(input: GeoEngineInput): GeoRuleResult {
  const legalPages = input.pages.filter((page) => page.pageType === "Legal");
  const securityPages = input.pages.filter((page) => /security|privacy|terms|legal/i.test(page.url + page.title));
  const socialMetaWarnings = input.pages.filter((page) => page.meta.OpenGraph !== "Present" || page.meta["Twitter Card"] !== "Present");
  const brokenPages = input.pages.filter((page) => page.statusCode >= 400);
  const findings: GeoRuleFinding[] = [];
  const strengths: string[] = [];
  let score = 60;

  if (legalPages.length || securityPages.length) {
    score += 14;
    strengths.push("Legal or security pages exist and support trust evaluation.");
  } else {
    findings.push({ id: "trust-legal-pages", dimension: "trust", priority: "High", title: "Trust policy pages are missing", detail: "No legal, terms, privacy, or security pages were detected.", recommendation: "Add privacy, terms, security, and compliance pages linked from the footer.", impact: 14 });
  }

  if (socialMetaWarnings.length) {
    score -= Math.min(18, socialMetaWarnings.length * 3);
    findings.push({ id: "trust-social-metadata", dimension: "trust", priority: "Medium", title: "Social trust metadata is inconsistent", detail: `${socialMetaWarnings.length} pages have missing or warning-level OpenGraph/Twitter Card signals.`, recommendation: "Add consistent social cards to commercial, informational, and proof pages.", impact: Math.min(18, socialMetaWarnings.length * 3) });
  } else {
    strengths.push("Social metadata is consistently present.");
  }

  if (brokenPages.length) {
    score -= brokenPages.length * 6;
    findings.push({ id: "trust-broken-pages", dimension: "trust", priority: "High", title: "Broken pages reduce trust", detail: `${brokenPages.length} pages return error status codes.`, recommendation: "Fix or redirect broken URLs and keep error pages out of important internal paths.", impact: brokenPages.length * 6 });
  }

  return { dimension: "trust", score: clampScore(score), strengths, findings };
}
