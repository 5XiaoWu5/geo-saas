import type { PageSnapshot } from "@/features/geo-engine/types/scan.types";

export function calculateOverallScore(input: { contentScore: number; schemaScore: number; entityScore: number; aiReadabilityScore: number }) {
  return Math.round(input.contentScore * 0.28 + input.schemaScore * 0.24 + input.entityScore * 0.28 + input.aiReadabilityScore * 0.2);
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreSnapshot(snapshot: PageSnapshot) {
  const contentScore = clampScore(45 + Math.min(30, snapshot.content.length / 12) + snapshot.headings.length * 4);
  const schemaScore = clampScore(40 + snapshot.schema.filter((item) => item.valid).length * 22 - snapshot.schema.filter((item) => !item.valid).length * 8);
  const entitySignals = [snapshot.title, snapshot.description, snapshot.content].join(" ");
  const entityScore = clampScore(45 + (entitySignals.includes("广州") ? 12 : 0) + (entitySignals.includes("展示柜") ? 18 : 0) + (entitySignals.includes("有限公司") ? 10 : 0));
  const aiReadabilityScore = clampScore(50 + snapshot.headings.length * 6 + (snapshot.description.length > 40 ? 12 : 0));
  const citationPotential = clampScore(45 + snapshot.links.filter((link) => !link.internal).length * 18 + snapshot.links.filter((link) => /case|案例/i.test(link.href + link.label)).length * 10);

  return { contentScore, schemaScore, entityScore, aiReadabilityScore, citationPotential, overallScore: calculateOverallScore({ contentScore, schemaScore, entityScore, aiReadabilityScore }) };
}
