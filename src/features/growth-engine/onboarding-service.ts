import { iso, realAISearchDatabase, type Row } from "@/features/real-ai-search/database";
import { RealAISearchError } from "@/features/real-ai-search/ai-search-execution.service";
import { deriveOnboardingState, type OnboardingFacts } from "./onboarding";

type RecentCompletion = {
  id: string;
  type: "PROVIDER" | "AI_SEARCH" | "ACTION" | "AUTOMATION" | "REPORT";
  title: string;
  completedAt: string;
  sourceType: string;
};

function number(row: Row, key: string) {
  return Number(row[key] ?? 0);
}

export async function getProjectOnboardingSummary(userId: string, projectId: string) {
  const database = realAISearchDatabase();
  const [factRows, completionRows] = await Promise.all([
    database.query(
      `SELECT project."id", project."name",
        (
          SELECT COUNT(*)::int
          FROM "AISearchProviderConfig" config
          WHERE config."projectId" = project."id"
            AND (config."encryptedApiKey" IS NOT NULL OR config."apiKeyReference" IS NOT NULL)
        ) + (
          SELECT COUNT(*)::int
          FROM "AISearchGatewayConnection" gateway
          WHERE gateway."projectId" = project."id"
        ) AS "configuredProviderCount",
        (
          SELECT COUNT(*)::int
          FROM "AISearchProviderConfig" config
          WHERE config."projectId" = project."id"
            AND config."enabled" = true
            AND config."modelVerificationStatus" = 'VERIFIED_AVAILABLE'
        ) + (
          SELECT COUNT(DISTINCT gateway."id")::int
          FROM "AISearchGatewayConnection" gateway
          INNER JOIN "AISearchGatewayModel" model ON model."connectionId" = gateway."id"
          WHERE gateway."projectId" = project."id"
            AND gateway."enabled" = true
            AND model."enabled" = true
            AND model."verificationStatus" = 'VERIFIED_AVAILABLE'
        ) AS "readyProviderCount",
        (
          SELECT COUNT(*)::int
          FROM "AISearchProviderConfig" config
          WHERE config."projectId" = project."id"
            AND config."lastTestStatus" = 'FAILED'
        ) + (
          SELECT COUNT(*)::int
          FROM "AISearchGatewayConnection" gateway
          WHERE gateway."projectId" = project."id"
            AND gateway."lastTestStatus" = 'FAILED'
        ) AS "providerAttentionCount",
        (
          SELECT COUNT(*)::int
          FROM "AISearchQuery" query
          WHERE query."projectId" = project."id" AND query."archivedAt" IS NULL
        ) AS "queryCount",
        (
          SELECT COUNT(*)::int
          FROM "AISearchResult" result
          WHERE result."projectId" = project."id"
        ) AS "resultCount",
        (
          SELECT COUNT(*)::int
          FROM "AISearchResult" result
          WHERE result."projectId" = project."id" AND result."status" IN ('PENDING', 'RUNNING')
        ) AS "runningResultCount",
        (
          SELECT COUNT(*)::int
          FROM "AISearchResult" result
          WHERE result."projectId" = project."id" AND result."status" = 'SUCCEEDED'
        ) AS "succeededResultCount",
        (
          SELECT COUNT(*)::int
          FROM "AISearchResult" result
          WHERE result."projectId" = project."id" AND result."status" = 'FAILED'
        ) AS "failedResultCount",
        (
          SELECT COUNT(*)::int
          FROM "AISearchResult" result
          WHERE result."projectId" = project."id"
            AND result."status" = 'SUCCEEDED'
            AND result."mentioned" = true
        ) AS "mentionedResultCount",
        (
          SELECT COUNT(*)::int
          FROM "OptimizationTask" task
          WHERE task."projectId" = project."id"
        ) AS "recommendationCount",
        (
          SELECT COUNT(*)::int
          FROM "OptimizationTask" task
          WHERE task."projectId" = project."id"
            AND task."status" <> 'COMPLETED'
        ) AS "openRecommendationCount",
        (
          SELECT COUNT(*)::int
          FROM "GrowthAction" action
          WHERE action."projectId" = project."id"
        ) AS "actionCount",
        (
          SELECT COUNT(*)::int
          FROM "GrowthAction" action
          WHERE action."projectId" = project."id"
            AND action."status" IN ('TODO', 'IN_PROGRESS')
        ) AS "openActionCount",
        (
          SELECT COUNT(*)::int
          FROM "GrowthAction" action
          WHERE action."projectId" = project."id"
            AND action."status" IN ('COMPLETED', 'VERIFIED')
        ) AS "completedActionCount",
        (
          SELECT COUNT(*)::int
          FROM "GrowthReport" report
          WHERE report."projectId" = project."id"
            AND report."status" = 'COMPLETED'
        ) AS "reportCount"
       FROM "Project" project
       WHERE project."id" = $1 AND project."userId" = $2
       LIMIT 1`,
      [projectId, userId],
    ),
    database.query(
      `SELECT *
       FROM (
         SELECT config."id", 'PROVIDER' AS "type",
           'AI platform connected' AS "title", config."lastTestedAt" AS "completedAt",
           'AISearchProviderConfig' AS "sourceType"
         FROM "AISearchProviderConfig" config
         INNER JOIN "Project" project ON project."id" = config."projectId"
         WHERE config."projectId" = $1 AND project."userId" = $2
           AND config."lastTestStatus" = 'SUCCEEDED'
         UNION ALL
         SELECT result."id", 'AI_SEARCH', 'AI search check completed', result."completedAt",
           'AISearchResult'
         FROM "AISearchResult" result
         INNER JOIN "Project" project ON project."id" = result."projectId"
         WHERE result."projectId" = $1 AND project."userId" = $2
           AND result."status" = 'SUCCEEDED'
         UNION ALL
         SELECT action."id", 'ACTION', action."title", action."completedAt",
           'GrowthAction'
         FROM "GrowthAction" action
         INNER JOIN "Project" project ON project."id" = action."projectId"
         WHERE action."projectId" = $1 AND project."userId" = $2
           AND action."status" IN ('COMPLETED', 'VERIFIED')
         UNION ALL
         SELECT run."id", 'AUTOMATION', 'Automation completed', run."completedAt",
           'AutomationRun'
         FROM "AutomationRun" run
         INNER JOIN "Project" project ON project."id" = run."projectId"
         WHERE run."projectId" = $1 AND project."userId" = $2
           AND run."status" = 'COMPLETED'
         UNION ALL
         SELECT report."id", 'REPORT', 'Growth report generated', report."createdAt",
           'GrowthReport'
         FROM "GrowthReport" report
         INNER JOIN "Project" project ON project."id" = report."projectId"
         WHERE report."projectId" = $1 AND project."userId" = $2
           AND report."status" = 'COMPLETED'
       ) recent
       WHERE recent."completedAt" IS NOT NULL
       ORDER BY recent."completedAt" DESC
       LIMIT 6`,
      [projectId, userId],
    ),
  ]);

  const row = factRows[0];
  if (!row) throw new RealAISearchError("PROJECT_FORBIDDEN", 403);
  const facts: OnboardingFacts = {
    configuredProviderCount: number(row, "configuredProviderCount"),
    readyProviderCount: number(row, "readyProviderCount"),
    providerAttentionCount: number(row, "providerAttentionCount"),
    queryCount: number(row, "queryCount"),
    resultCount: number(row, "resultCount"),
    runningResultCount: number(row, "runningResultCount"),
    succeededResultCount: number(row, "succeededResultCount"),
    failedResultCount: number(row, "failedResultCount"),
    mentionedResultCount: number(row, "mentionedResultCount"),
    recommendationCount: number(row, "recommendationCount"),
    openRecommendationCount: number(row, "openRecommendationCount"),
    actionCount: number(row, "actionCount"),
    openActionCount: number(row, "openActionCount"),
    completedActionCount: number(row, "completedActionCount"),
    reportCount: number(row, "reportCount"),
  };
  const derived = deriveOnboardingState(facts);
  return {
    project: { id: String(row.id), name: String(row.name) },
    facts,
    ...derived,
    recentCompletions: completionRows.map<RecentCompletion>(item => ({
      id: String(item.id),
      type: String(item.type) as RecentCompletion["type"],
      title: String(item.title),
      completedAt: iso(item.completedAt),
      sourceType: String(item.sourceType),
    })),
  };
}
