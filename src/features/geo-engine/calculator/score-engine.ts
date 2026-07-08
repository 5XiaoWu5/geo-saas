import type { GeoEngineInput, GeoEngineScore, GeoRuleFinding, GeoRuleResult } from "@/features/geo-engine/types";
import { clampScore } from "@/features/geo-engine/types";

export function evaluateTechnicalRules(input: GeoEngineInput): GeoRuleResult {
  const totalPages = input.pages.length || 1;
  const indexablePages = input.pages.filter((page) => page.indexable && page.statusCode === 200);
  const canonicalWarnings = input.pages.filter((page) => page.meta.Canonical !== "Present" || !page.canonical);
  const redirectPages = input.pages.filter((page) => page.statusCode === 301 || page.statusCode === 302);
  const errorPages = input.pages.filter((page) => page.statusCode >= 400);
  const heavyAssets = input.assets.filter((asset) => asset.issues > 0);
  const findings: GeoRuleFinding[] = [];
  const strengths: string[] = [];
  let score = 50 + (indexablePages.length / totalPages) * 25;

  if (indexablePages.length / totalPages >= 0.65) {
    strengths.push("Most core pages are indexable and return successful status codes.");
  } else {
    findings.push({ id: "technical-indexability", dimension: "technical", priority: "High", title: "Indexable page ratio is low", detail: `${indexablePages.length} of ${totalPages} pages are indexable 200 responses.`, recommendation: "Review noindex rules, redirects, errors, and canonical targets for important pages.", impact: 16 });
  }

  if (canonicalWarnings.length) {
    score -= canonicalWarnings.length * 5;
    findings.push({ id: "technical-canonical", dimension: "technical", priority: "High", title: "Canonical issues detected", detail: `${canonicalWarnings.length} pages have missing or warning canonical signals.`, recommendation: "Ensure every canonical page has a self-referencing canonical or an intentional target.", impact: canonicalWarnings.length * 5 });
  } else {
    score += 10;
    strengths.push("Canonical coverage is consistent across the inventory.");
  }

  if (redirectPages.length) {
    score -= Math.min(8, redirectPages.length * 2);
    findings.push({ id: "technical-redirects", dimension: "technical", priority: "Low", title: "Redirects appear in inventory", detail: `${redirectPages.length} URLs return redirect status codes.`, recommendation: "Update internal links to final destination URLs where possible.", impact: Math.min(8, redirectPages.length * 2) });
  }

  if (errorPages.length) {
    score -= errorPages.length * 7;
    findings.push({ id: "technical-errors", dimension: "technical", priority: "High", title: "Error pages found", detail: `${errorPages.length} URLs return 4xx/5xx status codes.`, recommendation: "Fix broken URLs or redirect them to relevant live pages.", impact: errorPages.length * 7 });
  }

  if (heavyAssets.length) {
    score -= Math.min(10, heavyAssets.length);
    findings.push({ id: "technical-asset-issues", dimension: "technical", priority: "Medium", title: "Asset issues may affect crawl quality", detail: `${heavyAssets.length} asset groups include optimization issues.`, recommendation: "Compress images, review unused JS/CSS, and keep documents discoverable.", impact: Math.min(10, heavyAssets.length) });
  }

  return { dimension: "technical", score: clampScore(score), strengths, findings };
}

export function calculateGeoScore(results: GeoRuleResult[]): GeoEngineScore {
  const weights: Record<GeoRuleResult["dimension"], number> = {
    entity: 0.22,
    content: 0.22,
    trust: 0.2,
    technical: 0.18,
    citationPotential: 0.18,
  };

  const dimensions = results.reduce(
    (accumulator, result) => ({ ...accumulator, [result.dimension]: result.score }),
    {} as Record<GeoRuleResult["dimension"], number>
  );

  const overall = clampScore(results.reduce((total, result) => total + result.score * weights[result.dimension], 0));
  const level: GeoEngineScore["level"] = overall >= 85 ? "Excellent" : overall >= 70 ? "Good" : "Need Improvement";

  return { overall, level, dimensions };
}

