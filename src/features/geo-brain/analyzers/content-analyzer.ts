import type { GeoBrainAnalyzerResult, GeoBrainInput } from "@/features/geo-brain/types";
import { clampScore } from "@/features/geo-brain/scoring/geo-score-engine";

export function analyzeContentStructure(input: GeoBrainInput): GeoBrainAnalyzerResult {
  const scan = input.crawlData;
  const hasTitle = Boolean(scan?.title && scan.title.trim().length >= 8);
  const hasDescription = Boolean(scan?.description && scan.description.trim().length >= 40);
  const headingScore = clampScore(((scan?.h1Count ?? 0) > 0 ? 35 : 0) + Math.min(scan?.h2Count ?? 0, 6) * 8);
  const linkScore = clampScore(Math.min(scan?.internalLinkCount ?? 0, 12) * 5);
  const score = clampScore((hasTitle ? 20 : 0) + (hasDescription ? 25 : 0) + headingScore * 0.35 + linkScore * 0.2);

  const insights: string[] = [];
  const problems: GeoBrainAnalyzerResult["problems"] = [];
  const recommendations: GeoBrainAnalyzerResult["recommendations"] = [];

  if (hasTitle && hasDescription) insights.push("Content has usable title and meta description signals for AI extraction.");
  if ((scan?.h1Count ?? 0) > 0) insights.push("Heading structure gives the model a primary page topic.");

  if (!hasTitle) {
    problems.push({ type: "content", severity: "medium", description: "Page title is too weak for AI entity and topic recognition." });
    recommendations.push({ priority: "medium", action: "Rewrite page titles with brand, category, and primary offer.", rationale: "AI answers rely on concise page-level topic signals." });
  }
  if (!hasDescription) {
    problems.push({ type: "content", severity: "medium", description: "Meta description is missing or too short." });
    recommendations.push({ priority: "medium", action: "Add descriptive summaries to important pages.", rationale: "Descriptions help LLMs understand audience, offer, and relevance." });
  }
  if ((scan?.h1Count ?? 0) === 0) {
    problems.push({ type: "content", severity: "high", description: "No H1 heading was detected in the latest crawl." });
    recommendations.push({ priority: "high", action: "Add one clear H1 that states the company category and core service.", rationale: "A strong H1 improves extraction of the main content structure." });
  }

  return { score, insights, problems, recommendations };
}
