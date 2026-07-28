import { realAISearchDatabase, iso, jsonArray, type Row } from "./database";
import { publicBaseUrlHost } from "./compatible-provider-security";
import {
  AI_SEARCH_PROVIDER_TYPES,
  DEFAULT_PROVIDER_MODELS,
  type AISearchConnectionType,
  type AISearchDetectionSource,
  type AISearchProviderType,
  type ExecutionResultView,
  type ParsedAISearchResponse,
  type ProviderCapabilities,
  type ProviderCompatibilityLevel,
  type ProviderConfigView,
} from "./types";
import { providerSecretStorageAvailable, type EncryptedProviderSecret } from "./provider-secret";

function jsonObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return {};
}

function configView(provider: AISearchProviderType, row?: Row): ProviderConfigView {
  const encrypted = Boolean(row?.encryptedApiKey);
  const environment = Boolean(row?.apiKeyReference);
  return {
    id: row ? String(row.id) : null,
    provider,
    enabled: Boolean(row?.enabled),
    configured: encrypted || environment,
    keyMask: row?.apiKeyHint ? `••••••••••••${String(row.apiKeyHint).slice(-4)}` : environment ? "env:••••••••••••" : null,
    keyVersion: encrypted ? Number(row?.secretVersion ?? 1) : null,
    configurationSource: encrypted ? "ENCRYPTED" : environment ? "ENVIRONMENT" : null,
    secretStorageAvailable: providerSecretStorageAvailable(),
    connectionType: row?.connectionType
      ? String(row.connectionType) as AISearchConnectionType
      : provider === "OPENAI" ? "OPENAI_OFFICIAL" : "NATIVE",
    displayName: row?.displayName ? String(row.displayName) : null,
    baseUrlHost: publicBaseUrlHost(row?.baseUrl),
    model: row ? String(row.model) : DEFAULT_PROVIDER_MODELS[provider],
    selectedModelId: row?.selectedModelId ? String(row.selectedModelId) : row ? String(row.model) : null,
    modelVerificationStatus: row?.modelVerificationStatus
      ? String(row.modelVerificationStatus) as ProviderConfigView["modelVerificationStatus"]
      : "LISTED_NOT_TESTED",
    modelVerifiedAt: row?.modelVerifiedAt ? iso(row.modelVerifiedAt) : null,
    capabilities: row?.capabilitiesJson ? jsonObject(row.capabilitiesJson) as ProviderCapabilities : null,
    compatibilityLevel: row?.compatibilityLevel
      ? String(row.compatibilityLevel) as ProviderCompatibilityLevel
      : "NOT_TESTED",
    lastTestStatus: row?.lastTestStatus === "SUCCEEDED" || row?.lastTestStatus === "FAILED" ? row.lastTestStatus : null,
    lastTestError: row?.lastTestError ? String(row.lastTestError) : null,
    lastTestedAt: row?.lastTestedAt ? iso(row.lastTestedAt) : null,
    createdAt: row ? iso(row.createdAt) : null,
    updatedAt: row ? iso(row.updatedAt) : null,
  };
}
function resultView(row: Row, citations: Row[] = []): ExecutionResultView { return { id: String(row.id), query: String(row.query ?? ""), provider: String(row.provider) as AISearchProviderType, detectionSource: String(row.detectionSource ?? "OFFICIAL_API") as AISearchDetectionSource, status: String(row.status) as ExecutionResultView["status"], mentioned: typeof row.mentioned === "boolean" ? row.mentioned : null, rankPosition: row.rankPosition === null || row.rankPosition === undefined ? null : Number(row.rankPosition), rawResponse: row.rawResponse ? String(row.rawResponse) : null, citations: citations.map((item) => ({ url: String(item.url), domain: String(item.domain), citationType: String(item.citationType) as "OFFICIAL" | "THIRD_PARTY", position: Number(item.position ?? 0), citationCount: Number(item.citationCount ?? 1) })), productMentions: jsonArray(row.productMentions).map(String), competitorBrands: jsonArray(row.competitorBrands).map(String), errorCode: row.errorCode ? String(row.errorCode) : null, durationMs: row.durationMs === null || row.durationMs === undefined ? null : Number(row.durationMs), attemptCount: Number(row.attemptCount ?? 0), createdAt: iso(row.createdAt), completedAt: row.completedAt ? iso(row.completedAt) : null }; }

export const realAISearchRepository = {
  async projectForUser(userId: string, projectId: string) { return (await realAISearchDatabase().query('SELECT p."id", p."name", p."industry", p."domain", COALESCE((SELECT entity."brandName" FROM "EntityProfile" entity WHERE entity."projectId" = p."id" ORDER BY entity."updatedAt" DESC LIMIT 1), p."name") AS "targetEntity", COALESCE((SELECT JSONB_AGG(product."name") FROM "ProductEntity" product WHERE product."projectId" = p."id" AND product."status" = \'ACTIVE\'), \'[]\'::jsonb) AS "productNames", COALESCE((SELECT JSONB_AGG(competitor."name") FROM "CompetitorProfile" competitor WHERE competitor."projectId" = p."id" AND competitor."status" = \'ACTIVE\'), \'[]\'::jsonb) AS "competitorNames" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2 LIMIT 1', [projectId, userId]))[0] ?? null; },
  async configs(userId: string, projectId: string) { const rows = await realAISearchDatabase().query('SELECT config.* FROM "AISearchProviderConfig" config INNER JOIN "Project" p ON p."id" = config."projectId" WHERE config."projectId" = $1 AND p."userId" = $2', [projectId, userId]); return AI_SEARCH_PROVIDER_TYPES.map((provider) => configView(provider, rows.find((row) => row.provider === provider))); },
  async internalConfig(userId: string, projectId: string, provider: AISearchProviderType) { return (await realAISearchDatabase().query('SELECT config.* FROM "AISearchProviderConfig" config INNER JOIN "Project" p ON p."id" = config."projectId" WHERE config."projectId" = $1 AND config."provider" = $3::"AISearchProviderType" AND p."userId" = $2 LIMIT 1', [projectId, userId, provider]))[0] ?? null; },
  async saveConfig(userId: string, projectId: string, input: {
    provider: AISearchProviderType;
    connectionType: AISearchConnectionType;
    displayName: string | null;
    baseUrl: string | null;
    enabled: boolean;
    apiKeyReference: string | null;
    encryptedSecret: EncryptedProviderSecret | null;
    model: string;
    capabilities: ProviderCapabilities;
    compatibilityLevel: ProviderCompatibilityLevel;
    modelVerifiedAt: Date;
  }) {
    const now = new Date();
    const encrypted = input.encryptedSecret;
    const rows = await realAISearchDatabase().query(
      'WITH owned AS (SELECT p."id" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2), updated AS (UPDATE "AISearchProviderConfig" config SET "connectionType" = $4::"AISearchConnectionType", "displayName" = $5, "baseUrl" = $6, "enabled" = $7, "apiKeyReference" = CASE WHEN $10::text IS NOT NULL THEN NULL ELSE COALESCE($8, config."apiKeyReference") END, "encryptedApiKey" = COALESCE($10, config."encryptedApiKey"), "apiKeyIv" = COALESCE($11, config."apiKeyIv"), "apiKeyAuthTag" = COALESCE($12, config."apiKeyAuthTag"), "apiKeyHint" = COALESCE($13, config."apiKeyHint"), "secretVersion" = COALESCE($14, config."secretVersion"), "model" = $9, "selectedModelId" = $9, "modelVerificationStatus" = \'VERIFIED_AVAILABLE\', "modelVerifiedAt" = $15, "capabilitiesJson" = $16::jsonb, "compatibilityLevel" = $17::"AIProviderCompatibilityLevel", "lastTestStatus" = \'SUCCEEDED\', "lastTestError" = NULL, "lastTestedAt" = $15, "updatedAt" = $18 FROM owned WHERE config."projectId" = owned."id" AND config."provider" = $3::"AISearchProviderType" RETURNING config.*), inserted AS (INSERT INTO "AISearchProviderConfig" ("id", "projectId", "provider", "connectionType", "displayName", "baseUrl", "enabled", "apiKeyReference", "encryptedApiKey", "apiKeyIv", "apiKeyAuthTag", "apiKeyHint", "secretVersion", "model", "selectedModelId", "modelVerificationStatus", "modelVerifiedAt", "capabilitiesJson", "compatibilityLevel", "lastTestStatus", "lastTestedAt", "createdAt", "updatedAt") SELECT $19, owned."id", $3::"AISearchProviderType", $4::"AISearchConnectionType", $5, $6, $7, $8, $10, $11, $12, $13, COALESCE($14, 1), $9, $9, \'VERIFIED_AVAILABLE\', $15, $16::jsonb, $17::"AIProviderCompatibilityLevel", \'SUCCEEDED\', $15, $18, $18 FROM owned WHERE NOT EXISTS (SELECT 1 FROM updated) RETURNING *) SELECT * FROM updated UNION ALL SELECT * FROM inserted',
      [
        projectId,
        userId,
        input.provider,
        input.connectionType,
        input.displayName,
        input.baseUrl,
        input.enabled,
        input.apiKeyReference,
        input.model,
        encrypted?.encryptedApiKey ?? null,
        encrypted?.apiKeyIv ?? null,
        encrypted?.apiKeyAuthTag ?? null,
        encrypted?.apiKeyHint ?? null,
        encrypted?.secretVersion ?? null,
        input.modelVerifiedAt,
        JSON.stringify(input.capabilities),
        input.compatibilityLevel,
        now,
        crypto.randomUUID(),
      ],
    );
    return rows[0] ? configView(input.provider, rows[0]) : null;
  },
  async deleteConfig(userId: string, projectId: string, provider: AISearchProviderType) { return (await realAISearchDatabase().query('DELETE FROM "AISearchProviderConfig" config USING "Project" p WHERE config."projectId" = $1 AND config."provider" = $3::"AISearchProviderType" AND config."projectId" = p."id" AND p."userId" = $2 RETURNING config."id"', [projectId, userId, provider])).length > 0; },
  async recordProviderTest(userId: string, projectId: string, provider: AISearchProviderType, status: "SUCCEEDED" | "FAILED", error: string | null) { const row = (await realAISearchDatabase().query('UPDATE "AISearchProviderConfig" config SET "lastTestStatus" = $4, "lastTestError" = $5, "lastTestedAt" = $6, "updatedAt" = $6 FROM "Project" p WHERE config."projectId" = $1 AND config."provider" = $3::"AISearchProviderType" AND p."id" = config."projectId" AND p."userId" = $2 RETURNING config.*', [projectId, userId, provider, status, error, new Date()]))[0]; return row ? configView(provider, row) : null; },
  async markRunning(userId: string, projectId: string, resultId: string) { await realAISearchDatabase().query('UPDATE "AISearchResult" result SET "status" = \'RUNNING\' FROM "Project" p WHERE result."id" = $1 AND result."projectId" = $2 AND result."projectId" = p."id" AND p."userId" = $3', [resultId, projectId, userId]); },
  async markFailed(userId: string, projectId: string, resultId: string, errorCode: string, durationMs: number, attemptCount: number) { await realAISearchDatabase().query('UPDATE "AISearchResult" result SET "status" = \'FAILED\', "providerRequestId" = NULL, "rawResponse" = NULL, "mentioned" = NULL, "rankPosition" = NULL, "productMentions" = \'[]\'::jsonb, "competitorBrands" = \'[]\'::jsonb, "errorCode" = $4, "durationMs" = $5, "attemptCount" = $6, "completedAt" = $7 FROM "Project" p WHERE result."id" = $1 AND result."projectId" = $2 AND result."projectId" = p."id" AND p."userId" = $3', [resultId, projectId, userId, errorCode, durationMs, attemptCount, new Date()]); },
  async markSucceeded(userId: string, projectId: string, resultId: string, response: { requestId: string | null; text: string }, parsed: ParsedAISearchResponse, durationMs: number, attemptCount: number) { const now = new Date(); await realAISearchDatabase().query('UPDATE "AISearchResult" result SET "status" = \'SUCCEEDED\', "providerRequestId" = $4, "rawResponse" = $5, "mentioned" = $6, "rankPosition" = $7, "productMentions" = $8::jsonb, "competitorBrands" = $9::jsonb, "durationMs" = $10, "attemptCount" = $11, "completedAt" = $12 FROM "Project" p WHERE result."id" = $1 AND result."projectId" = $2 AND result."projectId" = p."id" AND p."userId" = $3', [resultId, projectId, userId, response.requestId, response.text, parsed.mentioned, parsed.rankPosition, JSON.stringify(parsed.productMentions), JSON.stringify(parsed.competitorBrands), durationMs, attemptCount, now]); for (const citation of parsed.citations) await realAISearchDatabase().query('INSERT INTO "AISearchCitation" ("id", "projectId", "resultId", "url", "domain", "citationType", "position", "citationCount", "createdAt") SELECT $1, p."id", $3, $4, $5, $6::"AISearchCitationType", $7, $8, $9 FROM "Project" p WHERE p."id" = $2 AND p."userId" = $10', [crypto.randomUUID(), projectId, resultId, citation.url, citation.domain, citation.citationType, citation.position, citation.citationCount, now, userId]); },
  async syncVisibility(userId: string, projectId: string, input: { provider: AISearchProviderType; query: string; answer: string; parsed: ParsedAISearchResponse }) { const now = new Date(); await realAISearchDatabase().query('WITH owned AS (SELECT p."id" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2), campaign AS (INSERT INTO "VisibilityCampaign" ("id", "projectId", "keyword", "createdAt") SELECT $3, owned."id", \'Real AI Search\', $4 FROM owned RETURNING *), prompt AS (INSERT INTO "VisibilityPrompt" ("id", "campaignId", "prompt", "createdAt") SELECT $5, campaign."id", $6, $4 FROM campaign RETURNING *) INSERT INTO "VisibilityCheck" ("id", "campaignId", "promptId", "provider", "prompt", "answer", "brandMentioned", "mentionPosition", "sourceUrls", "score", "createdAt") SELECT $7, campaign."id", prompt."id", $8, $6, $9, $10, $11, $12::text[], $13, $4 FROM campaign CROSS JOIN prompt', [projectId, userId, crypto.randomUUID(), now, crypto.randomUUID(), input.query, crypto.randomUUID(), input.provider, input.answer, input.parsed.mentioned, input.parsed.rankPosition, input.parsed.citations.map((item) => item.url), input.parsed.mentioned ? Math.max(20, 100 - ((input.parsed.rankPosition ?? 5) - 1) * 15) : 0]); },
  async syncGapTask(userId: string, projectId: string, provider: AISearchProviderType) { const issueId = `growth:REAL_AI_VISIBILITY_GAP:${provider}`; const now = new Date(); await realAISearchDatabase().query('WITH owned AS (SELECT p."id" FROM "Project" p WHERE p."id" = $1 AND p."userId" = $2), updated AS (UPDATE "OptimizationTask" task SET "title" = $4, "description" = $5, "recommendation" = $6, "severity" = \'High\', "category" = \'real_ai_visibility\', "updatedAt" = $7 FROM owned WHERE task."projectId" = owned."id" AND task."issueId" = $3 RETURNING task.*), inserted AS (INSERT INTO "OptimizationTask" ("id", "projectId", "issueId", "title", "description", "recommendation", "severity", "category", "status", "createdAt", "updatedAt") SELECT $8, owned."id", $3, $4, $5, $6, \'High\', \'real_ai_visibility\', \'PENDING\', $7, $7 FROM owned WHERE NOT EXISTS (SELECT 1 FROM updated) RETURNING *) SELECT * FROM updated UNION ALL SELECT * FROM inserted', [projectId, userId, issueId, `${provider} AI 回答曝光不足`, `本次 ${provider} API 回答中未出现当前企业。该结果不等同于官方产品界面展示。`, "补充可引用的产品、客户案例、技术证明与第三方权威来源后重新检测。", now, crypto.randomUUID()]); },
  async monitoring(userId: string, projectId: string) { const project = await this.projectForUser(userId, projectId); if (!project) return null; const [configs, resultRows, citationRows, statRows] = await Promise.all([this.configs(userId, projectId), realAISearchDatabase().query('SELECT result.*, query."query" FROM "AISearchResult" result INNER JOIN "AISearchQuery" query ON query."id" = result."queryId" INNER JOIN "Project" p ON p."id" = result."projectId" WHERE result."projectId" = $1 AND p."userId" = $2 ORDER BY result."createdAt" DESC LIMIT 50', [projectId, userId]), realAISearchDatabase().query('SELECT citation.* FROM "AISearchCitation" citation INNER JOIN "Project" p ON p."id" = citation."projectId" WHERE citation."projectId" = $1 AND p."userId" = $2 ORDER BY citation."createdAt" DESC', [projectId, userId]), realAISearchDatabase().query('SELECT result."provider", COUNT(*)::int AS total, COUNT(*) FILTER (WHERE result."status" = \'SUCCEEDED\')::int AS succeeded, COUNT(*) FILTER (WHERE result."status" = \'FAILED\')::int AS failed, MAX(result."completedAt") AS "lastCheckedAt" FROM "AISearchResult" result INNER JOIN "Project" p ON p."id" = result."projectId" WHERE result."projectId" = $1 AND p."userId" = $2 GROUP BY result."provider"', [projectId, userId])]); const results = resultRows.map((row) => resultView(row, citationRows.filter((citation) => citation.resultId === row.id))); return { project: { id: String(project.id), name: String(project.name), industry: String(project.industry), domain: String(project.domain) }, providers: AI_SEARCH_PROVIDER_TYPES.map((provider) => { const stats = statRows.find((row) => row.provider === provider); return { provider, total: Number(stats?.total ?? 0), succeeded: Number(stats?.succeeded ?? 0), failed: Number(stats?.failed ?? 0), lastCheckedAt: stats?.lastCheckedAt ? iso(stats.lastCheckedAt) : null, config: configs.find((item) => item.provider === provider)! }; }), results }; },
};
