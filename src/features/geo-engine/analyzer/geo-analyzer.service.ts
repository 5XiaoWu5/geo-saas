import { analyzeProjectEntities } from "@/features/geo-engine/entity/services/entity.service";
import { scoreSnapshot } from "@/features/geo-engine/scoring/score.service";
import type { GEOAnalysisResult, NormalizedPageSnapshot, PageGEOScore, WebsiteGEOResult } from "@/features/geo-engine/types/scan.types";

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : 0;
}

export async function analyzeWebsiteSnapshots(scanId: string, snapshots: NormalizedPageSnapshot[], projectId = "unknown-project"): Promise<WebsiteGEOResult> {
  const pageScores: PageGEOScore[] = snapshots.map((snapshot) => {
    const scores = scoreSnapshot(snapshot);
    return { url: snapshot.url, title: snapshot.title, ...scores };
  });
  const contentScore = average(pageScores.map((page) => page.contentScore));
  const schemaScore = average(pageScores.map((page) => page.schemaScore));
  const entityAnalysis = await analyzeProjectEntities(projectId, snapshots);
  const entityScore = entityAnalysis.score.overall || average(pageScores.map((page) => page.entityScore));
  const citationPotential = average(pageScores.map((page) => page.citationPotential));
  const aiReadabilityScore = average(pageScores.map((page) => page.aiReadabilityScore));
  const overallScore = average(pageScores.map((page) => page.overallScore));
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (schemaScore < 80) {
    issues.push("Schema coverage is inconsistent across crawled pages.");
    recommendations.push("Add Organization, Product and FAQ schema to key pages.");
  }
  if (citationPotential < 75) {
    issues.push("Website-level citation signals are limited.");
    recommendations.push("Add case studies, third-party references and authoritative links.");
  }
  for (const issue of entityAnalysis.issues) issues.push(issue);
  for (const recommendation of entityAnalysis.recommendations) recommendations.push(recommendation);

  if (contentScore < 80) {
    issues.push("Some pages need richer answer-ready content.");
    recommendations.push("Expand thin pages with direct answers, proof points and structured summaries.");
  }

  return { scanId, overallScore, pageScores, contentScore, schemaScore, entityScore, entities: entityAnalysis.entities, citationPotential, aiReadabilityScore, issues, recommendations };
}

export async function analyzePageSnapshot(scanId: string, snapshot: NormalizedPageSnapshot): Promise<GEOAnalysisResult> {
  const websiteResult = await analyzeWebsiteSnapshots(scanId, [snapshot]);
  return { ...websiteResult, page: snapshot };
}

export async function analyzePageSnapshots(scanId: string, snapshots: NormalizedPageSnapshot[], projectId?: string): Promise<GEOAnalysisResult> {
  const websiteResult = await analyzeWebsiteSnapshots(scanId, snapshots, projectId);
  return { ...websiteResult, page: snapshots[0] };
}

