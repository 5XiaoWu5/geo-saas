import type { SimulationResult, SimulationSignalCode } from "@/features/ai-search-simulator/types";
import type { EntityProfile } from "@/features/entity/types";
import type { GeoCampaign } from "@/features/geo-campaign/types";
import type { GeoAnalysis, GeoIssue } from "@/features/geo-analysis/types";
import type { GrowthSnapshot } from "@/features/growth/types";
import type { VisibilityCheck } from "@/features/visibility/types";
import type { InsightScoreAnchor, InsightSignal, InsightSignalKey, InsightSourceType, InsightTargetModule } from "./types";

type SignalCandidate = Omit<InsightSignal, "value" | "available"> & { weight: number };

export type SignalEvidence = {
  anchor: InsightScoreAnchor;
  simulation: SimulationResult | null;
  growth: GrowthSnapshot | null;
  analysis: GeoAnalysis | null;
  entityProfile: EntityProfile | null;
  visibilityChecks: VisibilityCheck[];
  campaigns: GeoCampaign[];
  simulationCampaignId: string | null;
};

const targetByKey: Record<InsightSignalKey, InsightTargetModule> = {
  entity_strength: "entity",
  schema_strength: "analyzer",
  authority_strength: "analyzer",
  citation_strength: "analyzer",
  visibility_strength: "visibility",
  content_strength: "analyzer",
  faq_coverage: "analyzer",
  campaign_relevance: "campaigns",
  entity_gap: "entity",
  schema_gap: "analyzer",
  authority_gap: "analyzer",
  citation_gap: "analyzer",
  visibility_gap: "visibility",
  content_gap: "analyzer",
  faq_gap: "optimization",
  news_citation_gap: "optimization",
  case_study_gap: "optimization",
  external_authority_gap: "optimization",
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function addCandidate(map: Map<InsightSignalKey, SignalCandidate>, candidate: SignalCandidate) {
  if (!Number.isFinite(candidate.weight) || candidate.weight <= 0) return;
  const normalized = { ...candidate, weight: Math.max(0.01, candidate.weight), confidence: clampScore(candidate.confidence) };
  const existing = map.get(candidate.signalKey);
  if (!existing || (normalized.kind === "missing" && existing.kind !== "missing") || (normalized.kind === existing.kind && normalized.weight > existing.weight)) {
    map.set(candidate.signalKey, normalized);
  }
}

function addDimension(
  positive: Map<InsightSignalKey, SignalCandidate>,
  negative: Map<InsightSignalKey, SignalCandidate>,
  input: { strengthKey: InsightSignalKey; gapKey: InsightSignalKey; score: number; sourceType: InsightSourceType; sourceId: string; confidence: number },
) {
  const score = clampScore(input.score);
  addCandidate(positive, { signalKey: input.strengthKey, kind: "positive", weight: score, sourceType: input.sourceType, sourceId: input.sourceId, confidence: input.confidence, targetModule: targetByKey[input.strengthKey] });
  addCandidate(negative, { signalKey: input.gapKey, kind: "negative", weight: 100 - score, sourceType: input.sourceType, sourceId: input.sourceId, confidence: input.confidence, targetModule: targetByKey[input.gapKey] });
}

function addMissing(map: Map<InsightSignalKey, SignalCandidate>, signalKey: InsightSignalKey, sourceType: InsightSourceType, sourceId: string, confidence: number, weight = 25) {
  addCandidate(map, { signalKey, kind: "missing", weight, sourceType, sourceId, confidence, targetModule: targetByKey[signalKey] });
}

function simulationMissingKey(code: SimulationSignalCode): InsightSignalKey | null {
  const keys: Partial<Record<SimulationSignalCode, InsightSignalKey>> = {
    faq_missing: "faq_gap",
    schema_missing: "schema_gap",
    entity_incomplete: "entity_gap",
    news_citations: "news_citation_gap",
    case_pages: "case_study_gap",
    external_authority: "external_authority_gap",
  };
  return keys[code] ?? null;
}

function issueSignalKey(issue: GeoIssue): InsightSignalKey {
  const text = `${issue.title} ${issue.description}`.toLowerCase();
  if (/faq|常见问题/.test(text)) return "faq_gap";
  if (/news|新闻/.test(text)) return "news_citation_gap";
  if (/case|案例/.test(text)) return "case_study_gap";
  if (/外部|外链|authority|权威/.test(text)) return "external_authority_gap";
  if (/引用|citation/.test(text)) return "citation_gap";
  if (issue.category === "entity") return "entity_gap";
  if (issue.category === "schema") return "schema_gap";
  if (issue.category === "technical") return "authority_gap";
  return "content_gap";
}

function allocate(candidates: SignalCandidate[], total: number): InsightSignal[] {
  if (total === 0) return [];
  const weightTotal = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  if (!candidates.length || weightTotal <= 0) return [];
  const allocations = candidates.map((candidate, index) => {
    const exact = (candidate.weight / weightTotal) * total;
    return { candidate, index, value: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = total - allocations.reduce((sum, item) => sum + item.value, 0);
  allocations
    .slice()
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index)
    .forEach((item) => {
      if (remaining > 0) {
        allocations[item.index].value += 1;
        remaining -= 1;
      }
    });
  return allocations
    .filter((item) => item.value > 0)
    .map(({ candidate, value }) => ({
      signalKey: candidate.signalKey,
      kind: candidate.kind,
      value,
      sourceType: candidate.sourceType,
      sourceId: candidate.sourceId,
      confidence: candidate.confidence,
      targetModule: candidate.targetModule,
      available: true,
    }));
}

function addAnalysisIssues(map: Map<InsightSignalKey, SignalCandidate>, analysis: GeoAnalysis) {
  for (const issue of analysis.issues) {
    const key = issueSignalKey(issue);
    const weight = issue.severity === "critical" ? 40 : issue.severity === "warning" ? 25 : 15;
    addMissing(map, key, "GeoAnalysis", analysis.id, 100, weight);
  }
}

export function analyzeSignals(evidence: SignalEvidence) {
  const positive = new Map<InsightSignalKey, SignalCandidate>();
  const deductions = new Map<InsightSignalKey, SignalCandidate>();

  if (evidence.simulation) {
    const source = evidence.simulation;
    const confidence = source.confidence;
    addDimension(positive, deductions, { strengthKey: "entity_strength", gapKey: "entity_gap", score: source.entityScore, sourceType: "SimulationResult", sourceId: source.id, confidence });
    addDimension(positive, deductions, { strengthKey: "schema_strength", gapKey: "schema_gap", score: source.schemaScore, sourceType: "SimulationResult", sourceId: source.id, confidence });
    addDimension(positive, deductions, { strengthKey: "authority_strength", gapKey: "authority_gap", score: source.authorityScore, sourceType: "SimulationResult", sourceId: source.id, confidence });
    addDimension(positive, deductions, { strengthKey: "citation_strength", gapKey: "citation_gap", score: source.citationScore, sourceType: "SimulationResult", sourceId: source.id, confidence });
    if (source.reasons.includes("faq_coverage")) addCandidate(positive, { signalKey: "faq_coverage", kind: "positive", weight: 20, sourceType: "SimulationResult", sourceId: source.id, confidence, targetModule: "analyzer" });
    for (const code of source.missing) {
      const key = simulationMissingKey(code);
      if (key) addMissing(deductions, key, "SimulationResult", source.id, confidence);
    }
  } else if (evidence.growth) {
    const source = evidence.growth;
    if (source.entityScore !== null) addDimension(positive, deductions, { strengthKey: "entity_strength", gapKey: "entity_gap", score: source.entityScore, sourceType: "GrowthSnapshot", sourceId: source.id, confidence: 100 });
    if (source.schemaScore !== null) addDimension(positive, deductions, { strengthKey: "schema_strength", gapKey: "schema_gap", score: source.schemaScore, sourceType: "GrowthSnapshot", sourceId: source.id, confidence: 100 });
    if (source.authorityScore !== null) addDimension(positive, deductions, { strengthKey: "authority_strength", gapKey: "authority_gap", score: source.authorityScore, sourceType: "GrowthSnapshot", sourceId: source.id, confidence: 100 });
    if (source.citationScore !== null) addDimension(positive, deductions, { strengthKey: "citation_strength", gapKey: "citation_gap", score: source.citationScore, sourceType: "GrowthSnapshot", sourceId: source.id, confidence: 100 });
    if (source.visibilityScore !== null) addDimension(positive, deductions, { strengthKey: "visibility_strength", gapKey: "visibility_gap", score: source.visibilityScore, sourceType: "GrowthSnapshot", sourceId: source.id, confidence: 100 });
  }

  if (evidence.analysis) {
    const source = evidence.analysis;
    if (!positive.has("entity_strength")) addDimension(positive, deductions, { strengthKey: "entity_strength", gapKey: "entity_gap", score: (source.entityScore / 30) * 100, sourceType: "GeoAnalysis", sourceId: source.id, confidence: 100 });
    if (!positive.has("schema_strength")) addDimension(positive, deductions, { strengthKey: "schema_strength", gapKey: "schema_gap", score: (source.schemaScore / 25) * 100, sourceType: "GeoAnalysis", sourceId: source.id, confidence: 100 });
    addDimension(positive, deductions, { strengthKey: "content_strength", gapKey: "content_gap", score: (source.contentScore / 20) * 100, sourceType: "GeoAnalysis", sourceId: source.id, confidence: 100 });
    addAnalysisIssues(deductions, source);
  }

  if (evidence.visibilityChecks.length) {
    const mentions = evidence.visibilityChecks.filter((check) => check.brandMentioned).length;
    const score = (mentions / evidence.visibilityChecks.length) * 100;
    const confidence = Math.min(100, evidence.visibilityChecks.length * 20);
    const sourceId = evidence.visibilityChecks[0].id;
    addDimension(positive, deductions, { strengthKey: "visibility_strength", gapKey: "visibility_gap", score, sourceType: "VisibilityCheck", sourceId, confidence });
  }

  if (evidence.entityProfile) {
    const profile = evidence.entityProfile;
    const populated = [profile.brandName, profile.industry, profile.region, profile.description, profile.services[0], profile.products[0], profile.advantages[0]].filter(Boolean).length;
    if (populated >= 5) addCandidate(positive, { signalKey: "entity_strength", kind: "positive", weight: populated * 10, sourceType: "EntityProfile", sourceId: profile.id, confidence: 100, targetModule: "entity" });
  }

  const linkedCampaign = evidence.campaigns.find((campaign) => campaign.id === evidence.simulationCampaignId) ?? evidence.campaigns[0];
  if (linkedCampaign) addCandidate(positive, { signalKey: "campaign_relevance", kind: "positive", weight: 15, sourceType: "GeoCampaign", sourceId: linkedCampaign.id, confidence: 100, targetModule: "campaigns" });

  const score = evidence.anchor.score;
  const positiveSignals = allocate([...positive.values()], score);
  const deductionSignals = allocate([...deductions.values()], 100 - score);
  return {
    positiveSignals,
    negativeSignals: deductionSignals.filter((signal) => signal.kind === "negative"),
    missingSignals: deductionSignals.filter((signal) => signal.kind === "missing"),
    reconciled: (score === 0 || positiveSignals.length > 0) && (score === 100 || deductionSignals.length > 0),
  };
}
