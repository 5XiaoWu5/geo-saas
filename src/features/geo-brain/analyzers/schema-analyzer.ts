import type { GeoBrainAnalyzerResult, GeoBrainInput } from "@/features/geo-brain/types";
import { clampScore } from "@/features/geo-brain/scoring/geo-score-engine";

export function analyzeSchemaCoverage(input: GeoBrainInput): GeoBrainAnalyzerResult {
  const scan = input.crawlData;
  const schemaTypes = scan?.schemaTypes ?? [];
  const hasOrganization = schemaTypes.some((type) => ["Organization", "LocalBusiness"].includes(type));
  const hasProductOrService = schemaTypes.some((type) => ["Product", "Service"].includes(type));
  const hasFaq = schemaTypes.includes("FAQPage");

  const score = clampScore(
    Math.min(scan?.schemaCount ?? 0, 5) * 12 +
    (hasOrganization ? 20 : 0) +
    (hasProductOrService ? 15 : 0) +
    (hasFaq ? 10 : 0) +
    (scan?.sitemapExists ? 8 : 0) +
    (scan?.robotsExists ? 7 : 0),
  );

  const insights: string[] = [];
  const problems: GeoBrainAnalyzerResult["problems"] = [];
  const recommendations: GeoBrainAnalyzerResult["recommendations"] = [];

  if ((scan?.schemaCount ?? 0) > 0) insights.push("Structured data is present and can support machine-readable entity extraction.");
  if (scan?.sitemapExists) insights.push("Sitemap signal helps AI crawlers discover important pages.");

  if (!hasOrganization) {
    problems.push({ type: "schema", severity: "high", description: "Organization or LocalBusiness Schema is missing." });
    recommendations.push({ priority: "high", action: "Add Organization or LocalBusiness Schema with brand name, URL, logo, contact, and sameAs links.", rationale: "Organization Schema is the foundation for AI entity disambiguation." });
  }
  if (!hasProductOrService) {
    problems.push({ type: "schema", severity: "medium", description: "Product or Service Schema is missing for commercial intent queries." });
    recommendations.push({ priority: "medium", action: "Mark up core products and services with Product or Service Schema.", rationale: "Commercial prompts need structured offer details to support recommendation." });
  }
  if (!hasFaq) {
    recommendations.push({ priority: "medium", action: "Add FAQPage Schema to pages answering buying and comparison questions.", rationale: "FAQ structure increases AI citation potential for question-style prompts." });
  }

  return { score, insights, problems, recommendations };
}
