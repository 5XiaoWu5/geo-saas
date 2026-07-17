import type { GeoIssue } from "@/features/geo-analysis/types";
import type { SimulationEvidence, SimulationProviderName, SimulationResultDraft, SimulationSignalCode } from "./types";

type ScoreBreakdown = Pick<SimulationResultDraft, "entityScore" | "schemaScore" | "authorityScore" | "citationScore" | "confidence"> & {
  queryScore: number;
  reasons: SimulationSignalCode[];
  missing: SimulationSignalCode[];
};

const PROVIDER_WEIGHTS: Record<SimulationProviderName, { entity: number; schema: number; authority: number; citation: number; query: number }> = {
  ChatGPT: { entity: 0.25, schema: 0.2, authority: 0.2, citation: 0.25, query: 0.1 },
  Gemini: { entity: 0.2, schema: 0.25, authority: 0.2, citation: 0.25, query: 0.1 },
  Claude: { entity: 0.25, schema: 0.15, authority: 0.25, citation: 0.25, query: 0.1 },
  Perplexity: { entity: 0.15, schema: 0.15, authority: 0.3, citation: 0.3, query: 0.1 },
  DeepSeek: { entity: 0.2, schema: 0.25, authority: 0.2, citation: 0.25, query: 0.1 },
  Doubao: { entity: 0.25, schema: 0.2, authority: 0.15, citation: 0.25, query: 0.15 },
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function includesIssue(issues: GeoIssue[], terms: string[]) {
  const text = issues.map((issue) => `${issue.title} ${issue.description} ${issue.category}`).join(" ").toLowerCase();
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function profileCompleteness(evidence: SimulationEvidence) {
  const profile = evidence.entityProfile;
  if (!profile) return null;
  const fields = [profile.brandName, profile.industry, profile.region, profile.description];
  const scalar = fields.filter((value) => value.trim().length > 0).length;
  const lists = [profile.services, profile.products, profile.advantages].filter((values) => values.length > 0).length;
  return clamp(((scalar + lists) / 7) * 100);
}

function queryRelevance(query: string, evidence: SimulationEvidence) {
  const candidates = [
    evidence.project.name,
    evidence.project.industry,
    evidence.project.country,
    evidence.campaign?.industry ?? "",
    evidence.campaign?.businessDescription ?? "",
    evidence.entityProfile?.brandName ?? "",
    ...(evidence.entityProfile?.services ?? []),
    ...(evidence.entityProfile?.products ?? []),
  ].map((value) => value.trim().toLowerCase()).filter((value) => value.length >= 2);
  const normalizedQuery = query.toLowerCase();
  const matches = candidates.filter((value) => normalizedQuery.includes(value) || value.includes(normalizedQuery)).length;
  return clamp(45 + Math.min(45, matches * 12) + (query.trim().length >= 8 ? 10 : 0));
}

export function buildScoreBreakdown(query: string, evidence: SimulationEvidence): ScoreBreakdown {
  const analysisEntity = clamp((evidence.analysis.entityScore / 30) * 100);
  const profileScore = profileCompleteness(evidence);
  const entityScore = profileScore === null ? analysisEntity : clamp(analysisEntity * 0.55 + profileScore * 0.45);

  const analysisSchema = clamp((evidence.analysis.schemaScore / 25) * 100);
  const crawlSchema = clamp(evidence.scan.schemaCount * 18 + evidence.scan.schemaTypes.length * 8 + (evidence.scan.robotsExists ? 12 : 0) + (evidence.scan.sitemapExists ? 14 : 0));
  const schemaScore = clamp(analysisSchema * 0.65 + crawlSchema * 0.35);

  const brainAuthority = evidence.brainAnalysis?.scoreDetails.authorityScore;
  const observedAuthority = clamp(28 + evidence.scan.externalLinkCount * 4 + (evidence.entityProfile?.advantages.length ?? 0) * 9 + evidence.visibility.brandMentionRate * 0.25);
  const authorityScore = clamp(typeof brainAuthority === "number" ? brainAuthority * 0.7 + observedAuthority * 0.3 : observedAuthority);

  const brainCitation = evidence.brainAnalysis?.scoreDetails.citationScore;
  const contentSignal = clamp((evidence.analysis.contentScore / 20) * 100);
  const observedCitation = clamp(contentSignal * 0.55 + evidence.visibility.averageScore * 0.25 + (evidence.scan.sitemapExists ? 10 : 0) + (evidence.scan.externalLinkCount > 0 ? 10 : 0));
  const citationScore = clamp(typeof brainCitation === "number" ? brainCitation * 0.65 + observedCitation * 0.35 : observedCitation);

  const queryScore = queryRelevance(query, evidence);
  const sourceCount = [evidence.scan, evidence.analysis, evidence.brainAnalysis, evidence.entityProfile, evidence.visibility.totalChecks > 0 ? evidence.visibility : null].filter(Boolean).length;
  const confidence = clamp(48 + sourceCount * 9 + Math.min(7, evidence.visibility.totalChecks));
  const reasons: SimulationSignalCode[] = [];
  const missing: SimulationSignalCode[] = [];

  if (!includesIssue(evidence.analysis.issues, ["faq"])) reasons.push("faq_coverage");
  else missing.push("faq_missing");
  if (entityScore >= 70) reasons.push("entity_complete");
  else missing.push("entity_incomplete");
  if (schemaScore >= 70) reasons.push("schema_high");
  else missing.push("schema_missing");
  if (contentSignal >= 70) reasons.push("page_structure");
  if (evidence.visibility.brandMentions > 0) reasons.push("visibility_mentions");
  if (authorityScore >= 70) reasons.push("authority_strong");
  if (queryScore >= 65) reasons.push("query_relevance");

  if (evidence.scan.externalLinkCount < 2) missing.push("external_authority");
  if (includesIssue(evidence.analysis.issues, ["case", "案例"]) || !(evidence.entityProfile?.advantages.length)) missing.push("case_pages");
  if (!evidence.scan.schemaTypes.some((type) => /news/i.test(type))) missing.push("news_citations");

  return { entityScore, schemaScore, authorityScore, citationScore, queryScore, confidence, reasons, missing };
}

export function scoreSimulation(provider: SimulationProviderName, query: string, evidence: SimulationEvidence): SimulationResultDraft {
  const scores = buildScoreBreakdown(query, evidence);
  const weights = PROVIDER_WEIGHTS[provider];
  const probability = clamp(
    scores.entityScore * weights.entity
      + scores.schemaScore * weights.schema
      + scores.authorityScore * weights.authority
      + scores.citationScore * weights.citation
      + scores.queryScore * weights.query,
  );
  const mentioned = probability >= 60;
  const ranking = !mentioned ? null : probability >= 85 ? 1 : probability >= 75 ? 2 : probability >= 65 ? 3 : 5;

  return {
    probability,
    ranking,
    confidence: scores.confidence,
    entityScore: scores.entityScore,
    schemaScore: scores.schemaScore,
    authorityScore: scores.authorityScore,
    citationScore: scores.citationScore,
    mentioned,
    reasons: scores.reasons.slice(0, 5),
    missing: scores.missing.slice(0, 5),
  };
}

