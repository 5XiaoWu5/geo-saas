import { dictionaries, type Locale } from "@/i18n/dictionaries";
import { prisma } from "@/features/auth/server/prisma";
import { toOptimizationTask } from "@/features/optimization/mapper";
import type { OptimizationSeverity } from "@/features/optimization/types";
import { buildProjectInsight, insightIssueId, InsightEngineError } from "./insight-engine";
import type { CreateInsightTaskResponse, InsightSignalKey } from "./types";

const severityBySignal: Partial<Record<InsightSignalKey, OptimizationSeverity>> = {
  entity_gap: "High",
  schema_gap: "High",
  authority_gap: "Medium",
  citation_gap: "Medium",
  visibility_gap: "Medium",
  content_gap: "Medium",
  faq_gap: "High",
  news_citation_gap: "Medium",
  case_study_gap: "Medium",
  external_authority_gap: "Medium",
};

const categoryBySignal: Partial<Record<InsightSignalKey, string>> = {
  entity_gap: "entity",
  schema_gap: "schema",
  authority_gap: "technical",
  citation_gap: "technical",
  visibility_gap: "technical",
  content_gap: "content",
  faq_gap: "content",
  news_citation_gap: "schema",
  case_study_gap: "content",
  external_authority_gap: "technical",
};

export function localeFromAcceptLanguage(value: string | null): Locale {
  return value?.toLowerCase().startsWith("en") ? "en" : "zh";
}

export async function createOrReuseInsightTask(userId: string, projectId: string, signalKey: string, locale: Locale): Promise<CreateInsightTaskResponse> {
  const insight = await buildProjectInsight(userId, projectId);
  const recommendation = insight.recommendations.find((item) => item.signalKey === signalKey);
  if (!recommendation) throw new InsightEngineError("SIGNAL_NOT_ACTIONABLE", 400);
  if (recommendation.existingTask) return { task: recommendation.existingTask, created: false, deepLink: recommendation.deepLink };

  const issueId = insightIssueId(projectId, signalKey);
  const existingRow = await prisma.optimizationTask.findByIssue({ where: { projectId, issueId } });
  if (existingRow) return { task: toOptimizationTask(existingRow), created: false, deepLink: recommendation.deepLink };

  const signal = [...insight.negativeSignals, ...insight.missingSignals].find((item) => item.signalKey === signalKey);
  if (!signal) throw new InsightEngineError("SIGNAL_NOT_ACTIONABLE", 400);
  const copy = dictionaries[locale].insights.taskCopy[signal.signalKey];
  try {
    const task = toOptimizationTask(await prisma.optimizationTask.create({
      data: {
        projectId,
        issueId,
        title: copy.title,
        description: copy.description,
        recommendation: copy.recommendation,
        severity: severityBySignal[signal.signalKey] ?? "Medium",
        category: categoryBySignal[signal.signalKey] ?? "technical",
        status: "PENDING",
      },
    }));
    return { task, created: true, deepLink: recommendation.deepLink };
  } catch (error) {
    const racedRow = await prisma.optimizationTask.findByIssue({ where: { projectId, issueId } });
    if (racedRow) return { task: toOptimizationTask(racedRow), created: false, deepLink: recommendation.deepLink };
    throw error;
  }
}
