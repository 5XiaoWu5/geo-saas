import type { GeoBrainAnalyzerResult, GeoBrainInput } from "@/features/geo-brain/types";
import { clampScore } from "@/features/geo-brain/scoring/geo-score-engine";

function hasText(value: unknown, minLength = 2) {
  return typeof value === "string" && value.trim().length >= minLength;
}

function hasList(items: string[] | undefined, minItems = 1) {
  return Array.isArray(items) && items.filter((item) => item.trim()).length >= minItems;
}

export function analyzeEntityAuthority(input: GeoBrainInput): GeoBrainAnalyzerResult {
  const profile = input.entityData.profile;
  const attributes = input.entityData.attributes;
  const hasContact = attributes.some((attribute) => attribute.key === "contact" && hasText(attribute.value));
  const hasCase = attributes.some((attribute) => attribute.key === "case" && hasText(attribute.value));
  const description = profile?.description || input.project.description || input.crawlData?.description || "";

  const score = clampScore(
    (hasText(profile?.brandName || input.project.name) ? 15 : 0) +
    (hasText(profile?.industry || input.project.industry) ? 15 : 0) +
    (hasText(profile?.region || input.project.country) ? 10 : 0) +
    (hasText(description, 60) ? 20 : 0) +
    (hasList(profile?.services) ? 15 : 0) +
    (hasList(profile?.products) ? 10 : 0) +
    (hasList(profile?.advantages, 2) ? 10 : 0) +
    (hasContact || hasCase ? 5 : 0),
  );

  const insights: string[] = [];
  const problems: GeoBrainAnalyzerResult["problems"] = [];
  const recommendations: GeoBrainAnalyzerResult["recommendations"] = [];

  if (hasText(description, 60)) insights.push("Entity description gives AI enough context to understand who the company is.");
  if (hasList(profile?.services)) insights.push("Service list improves entity-to-offer matching.");

  if (!hasText(description, 60)) {
    problems.push({ type: "entity", severity: "high", description: "Brand and business description is not complete enough for reliable AI understanding." });
    recommendations.push({ priority: "high", action: "Add a clear brand description covering audience, service scope, and differentiators.", rationale: "AI recommendation systems need a stable entity identity before they can cite or recommend it." });
  }
  if (!hasList(profile?.services)) {
    problems.push({ type: "entity", severity: "high", description: "Main services are missing from the entity profile." });
    recommendations.push({ priority: "high", action: "Add service scope and map each core service to a dedicated page.", rationale: "Service entities make future AI search prompts easier to match." });
  }

  return { score, insights, problems, recommendations };
}
