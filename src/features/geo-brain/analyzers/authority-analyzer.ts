import type { GeoBrainAnalyzerResult, GeoBrainInput } from "@/features/geo-brain/types";
import { clampScore } from "@/features/geo-brain/scoring/geo-score-engine";

function hasAttribute(input: GeoBrainInput, keys: string[]) {
  return input.entityData.attributes.some((attribute) => keys.includes(attribute.key) && attribute.value.trim().length > 0);
}

export function analyzeAuthoritySignals(input: GeoBrainInput): GeoBrainAnalyzerResult {
  const scan = input.crawlData;
  const hasCases = hasAttribute(input, ["case"]);
  const hasContact = hasAttribute(input, ["contact"]);
  const hasThirdParty = hasAttribute(input, ["thirdParty", "media", "review", "certification"]);
  const hasAdvantages = (input.entityData.profile?.advantages ?? []).length >= 2;

  const score = clampScore(
    (hasCases ? 24 : 0) +
    (hasContact ? 18 : 0) +
    (hasThirdParty ? 24 : 0) +
    Math.min(scan?.externalLinkCount ?? 0, 8) * 3 +
    (hasAdvantages ? 10 : 0),
  );

  const citationScore = clampScore(
    score * 0.45 +
    (input.crawlData?.schemaCount ?? 0) * 8 +
    (input.inventoryData.issues.length === 0 ? 20 : Math.max(0, 20 - input.inventoryData.issues.length * 4)),
  );

  const insights: string[] = [];
  const problems: GeoBrainAnalyzerResult["problems"] = [];
  const recommendations: GeoBrainAnalyzerResult["recommendations"] = [];

  if (hasCases) insights.push("Case evidence strengthens trust and recommendation confidence.");
  if (hasThirdParty) insights.push("Third-party credibility signals can improve AI citation confidence.");

  if (!hasCases) {
    problems.push({ type: "authority", severity: "medium", description: "Customer cases or proof points are missing." });
    recommendations.push({ priority: "medium", action: "Publish customer cases with scenario, result, and proof details.", rationale: "AI answers need verifiable proof before recommending a company." });
  }
  if (!hasThirdParty) {
    problems.push({ type: "authority", severity: "low", description: "Third-party trust signals are weak or absent." });
    recommendations.push({ priority: "low", action: "Add media, certification, review, partner, or industry directory references.", rationale: "External validation improves confidence for AI citation and recommendation." });
  }
  if (citationScore < 60) {
    problems.push({ type: "citation", severity: "medium", description: "AI citation potential is limited by missing proof, schema, or issue signals." });
  }

  return {
    score,
    insights,
    problems,
    recommendations: citationScore < 70
      ? [...recommendations, { priority: "medium", action: "Create cite-ready pages for FAQ, cases, services, and company facts.", rationale: "Citation-ready pages give AI systems stable sources for answers." }]
      : recommendations,
  };
}

export function analyzeCitationPotential(input: GeoBrainInput, authorityScore: number): number {
  return clampScore(
    authorityScore * 0.35 +
    Math.min(input.crawlData?.schemaCount ?? 0, 5) * 8 +
    (input.entityData.profile?.description ? 15 : 0) +
    ((input.entityData.profile?.services ?? []).length ? 10 : 0),
  );
}
