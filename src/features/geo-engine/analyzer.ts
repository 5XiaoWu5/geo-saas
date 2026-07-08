import { calculateGeoScore, evaluateTechnicalRules } from "@/features/geo-engine/calculator/score-engine";
import { evaluateCitationRules } from "@/features/geo-engine/rules/citation.rules";
import { evaluateContentRules } from "@/features/geo-engine/rules/content.rules";
import { evaluateEntityRules } from "@/features/geo-engine/rules/entity.rules";
import { evaluateTrustRules } from "@/features/geo-engine/rules/trust.rules";
import type { GeoEngineInput, GeoEngineResult } from "@/features/geo-engine/types";

export function analyzeGeoInventory(input: GeoEngineInput): GeoEngineResult {
  const ruleResults = [
    evaluateEntityRules(input),
    evaluateContentRules(input),
    evaluateTrustRules(input),
    evaluateTechnicalRules(input),
    evaluateCitationRules(input),
  ];
  const score = calculateGeoScore(ruleResults);
  const issues = ruleResults.flatMap((result) => result.findings).toSorted((left, right) => {
    const priorityWeight = { High: 3, Medium: 2, Low: 1 };
    return priorityWeight[right.priority] - priorityWeight[left.priority] || right.impact - left.impact;
  });
  const strengths = ruleResults.flatMap((result) => result.strengths).slice(0, 6);
  const indexedPages = input.pages.filter((page) => page.indexable && page.statusCode === 200).length;
  const structuredDataItems = input.structuredData.reduce((total, item) => total + item.detected, 0);

  return {
    projectId: input.projectId,
    inventorySource: {
      pages: input.pages.length,
      indexedPages,
      structuredDataItems,
    },
    score,
    strengths,
    issues,
    recommendations: issues,
  };
}
