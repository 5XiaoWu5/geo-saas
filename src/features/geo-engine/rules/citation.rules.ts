import type { GeoEngineInput, GeoRuleFinding, GeoRuleResult } from "@/features/geo-engine/types";
import { clampScore } from "@/features/geo-engine/types";

export function evaluateCitationRules(input: GeoEngineInput): GeoRuleResult {
  const articleSchema = input.structuredData.find((item) => item.type === "Article");
  const breadcrumbSchema = input.structuredData.find((item) => item.type === "Breadcrumb");
  const faqSchema = input.structuredData.find((item) => item.type === "FAQ");
  const caseLikePages = input.pages.filter((page) => /case|customer|story|enterprise/i.test(page.url + page.title));
  const authoritativePages = input.pages.filter((page) => /security|legal|terms|docs|api/i.test(page.url + page.title));
  const findings: GeoRuleFinding[] = [];
  const strengths: string[] = [];
  let score = 45;

  if ((articleSchema?.valid ?? 0) > 5) {
    score += 14;
    strengths.push("Article schema creates reusable citation surfaces.");
  } else {
    findings.push({ id: "citation-article-schema", dimension: "citationPotential", priority: "Medium", title: "Article citation surface is weak", detail: "Few valid Article schema entries were detected.", recommendation: "Add Article schema to guides, insights, resources, and educational content.", impact: 14 });
  }

  if ((breadcrumbSchema?.valid ?? 0) > 10) {
    score += 12;
    strengths.push("Breadcrumb schema improves page context and hierarchy.");
  }

  if ((faqSchema?.valid ?? 0) > 3) {
    score += 10;
    strengths.push("FAQ schema supports direct question-answer extraction.");
  } else {
    findings.push({ id: "citation-faq-schema", dimension: "citationPotential", priority: "Medium", title: "FAQ answer extraction is limited", detail: "FAQ schema coverage is low for question-driven AI answers.", recommendation: "Add FAQ blocks to product, pricing, support, and comparison pages.", impact: 10 });
  }

  if (caseLikePages.length) {
    score += 10;
    strengths.push("Case-like pages can support recommendation and proof citations.");
  } else {
    findings.push({ id: "citation-customer-proof", dimension: "citationPotential", priority: "High", title: "Customer proof pages are missing", detail: "No case study or customer story pages were detected in inventory.", recommendation: "Publish verifiable customer cases with problem, solution, result, and industry context.", impact: 10 });
  }

  if (authoritativePages.length >= 3) {
    score += 9;
    strengths.push("Authoritative docs/legal pages provide referenceable trust context.");
  }

  return { dimension: "citationPotential", score: clampScore(score), strengths, findings };
}
