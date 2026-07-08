import type { InventoryAsset, InventoryPage, StructuredDataInventory } from "@/types/inventory";

export type GeoDimensionKey = "entity" | "content" | "trust" | "technical" | "citationPotential";
export type GeoPriority = "High" | "Medium" | "Low";

export type GeoRuleFinding = {
  id: string;
  dimension: GeoDimensionKey;
  priority: GeoPriority;
  title: string;
  detail: string;
  recommendation: string;
  impact: number;
};

export type GeoRuleResult = {
  dimension: GeoDimensionKey;
  score: number;
  strengths: string[];
  findings: GeoRuleFinding[];
};

export type GeoEngineInput = {
  projectId: string;
  pages: InventoryPage[];
  assets: InventoryAsset[];
  structuredData: StructuredDataInventory[];
};

export type GeoEngineScore = {
  overall: number;
  level: "Excellent" | "Good" | "Need Improvement";
  dimensions: Record<GeoDimensionKey, number>;
};

export type GeoEngineResult = {
  projectId: string;
  inventorySource: {
    pages: number;
    indexedPages: number;
    structuredDataItems: number;
  };
  score: GeoEngineScore;
  strengths: string[];
  issues: GeoRuleFinding[];
  recommendations: GeoRuleFinding[];
};

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
