import { competitorDatabase, isoDate, jsonRecord, nullableNumber } from "./database";
import { competitorRepository } from "./competitor.repository";
import { CompetitorServiceError } from "./competitor.service";
import { VISIBILITY_ENTITY_TYPES, type VisibilityCitation, type VisibilityCitationInput, type VisibilityEntityType, type VisibilityMention, type VisibilityMentionInput } from "./types";

function entityType(value: unknown): VisibilityEntityType {
  const type = String(value ?? "UNKNOWN");
  return VISIBILITY_ENTITY_TYPES.includes(type as VisibilityEntityType) ? type as VisibilityEntityType : "UNKNOWN";
}

export async function loadVisibilityEvidence(userId: string, checkId: string) {
  const [mentionRows, citationRows] = await Promise.all([
    competitorDatabase().query('SELECT vm.* FROM "VisibilityMention" vm INNER JOIN "VisibilityCheck" vc ON vc."id" = vm."checkId" INNER JOIN "VisibilityCampaign" c ON c."id" = vc."campaignId" INNER JOIN "Project" p ON p."id" = c."projectId" WHERE vm."checkId" = $1 AND p."userId" = $2 ORDER BY vm."position" ASC NULLS LAST, vm."createdAt" ASC', [checkId, userId]),
    competitorDatabase().query('SELECT vci.* FROM "VisibilityCitation" vci INNER JOIN "VisibilityCheck" vc ON vc."id" = vci."checkId" INNER JOIN "VisibilityCampaign" c ON c."id" = vc."campaignId" INNER JOIN "Project" p ON p."id" = c."projectId" WHERE vci."checkId" = $1 AND p."userId" = $2 ORDER BY vci."position" ASC NULLS LAST, vci."createdAt" ASC', [checkId, userId]),
  ]);
  const mentions = mentionRows.map<VisibilityMention>((row) => ({
    id: String(row.id),
    checkId: String(row.checkId),
    competitorId: row.competitorId ? String(row.competitorId) : null,
    entityType: entityType(row.entityType),
    brandName: String(row.brandName ?? ""),
    normalizedName: String(row.normalizedName ?? ""),
    position: nullableNumber(row.position),
    metadata: jsonRecord(row.metadata),
    createdAt: isoDate(row.createdAt),
  }));
  const citations = citationRows.map<VisibilityCitation>((row) => ({
    id: String(row.id),
    checkId: String(row.checkId),
    mentionId: row.mentionId ? String(row.mentionId) : null,
    url: String(row.url ?? ""),
    domain: String(row.domain ?? ""),
    position: nullableNumber(row.position),
    metadata: jsonRecord(row.metadata),
    createdAt: isoDate(row.createdAt),
  }));
  return { mentions, citations, available: mentions.length > 0 || citations.length > 0 };
}

async function ownedCheck(userId: string, checkId: string) {
  return (await competitorDatabase().query('SELECT vc."id", c."projectId" FROM "VisibilityCheck" vc INNER JOIN "VisibilityCampaign" c ON c."id" = vc."campaignId" INNER JOIN "Project" p ON p."id" = c."projectId" WHERE vc."id" = $1 AND p."userId" = $2 LIMIT 1', [checkId, userId]))[0] ?? null;
}

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function validPosition(value: number | null | undefined) {
  return value === null || typeof value === "undefined" || (Number.isInteger(value) && value >= 1 && value <= 100);
}

export async function createVisibilityMention(userId: string, input: VisibilityMentionInput) {
  const check = await ownedCheck(userId, input.checkId);
  if (!check) throw new CompetitorServiceError("VISIBILITY_CHECK_FORBIDDEN", 403);
  if (!input.brandName.trim() || !validPosition(input.position)) throw new CompetitorServiceError("INVALID_VISIBILITY_EVIDENCE", 400);

  if (input.entityType === "COMPETITOR") {
    if (!input.competitorId) throw new CompetitorServiceError("COMPETITOR_REQUIRED", 400);
    const competitor = await competitorRepository.findByIdForUser(userId, input.competitorId);
    if (!competitor || competitor.projectId !== String(check.projectId)) throw new CompetitorServiceError("COMPETITOR_FORBIDDEN", 403);
  } else if (input.competitorId) {
    throw new CompetitorServiceError("INVALID_VISIBILITY_EVIDENCE", 400);
  }

  const row = (await competitorDatabase().query('INSERT INTO "VisibilityMention" ("id", "checkId", "competitorId", "entityType", "brandName", "normalizedName", "position", "metadata", "createdAt") VALUES ($1, $2, $3, $4::"VisibilityEntityType", $5, $6, $7, $8::jsonb, $9) RETURNING *', [
    crypto.randomUUID(),
    input.checkId,
    input.competitorId ?? null,
    input.entityType,
    input.brandName.trim(),
    normalizeName(input.brandName),
    input.position ?? null,
    JSON.stringify(input.metadata ?? {}),
    new Date(),
  ]))[0];
  return (await loadVisibilityEvidence(userId, input.checkId)).mentions.find((mention) => mention.id === String(row.id)) ?? null;
}

export async function createVisibilityCitation(userId: string, input: VisibilityCitationInput) {
  const check = await ownedCheck(userId, input.checkId);
  if (!check) throw new CompetitorServiceError("VISIBILITY_CHECK_FORBIDDEN", 403);
  if (!validPosition(input.position)) throw new CompetitorServiceError("INVALID_VISIBILITY_EVIDENCE", 400);
  let url: URL;
  try {
    url = new URL(input.url.trim());
  } catch {
    throw new CompetitorServiceError("INVALID_VISIBILITY_EVIDENCE", 400);
  }
  if (!/^https?:$/.test(url.protocol)) throw new CompetitorServiceError("INVALID_VISIBILITY_EVIDENCE", 400);
  if (input.mentionId) {
    const mention = (await competitorDatabase().query('SELECT vm."id" FROM "VisibilityMention" vm INNER JOIN "VisibilityCheck" vc ON vc."id" = vm."checkId" INNER JOIN "VisibilityCampaign" c ON c."id" = vc."campaignId" INNER JOIN "Project" p ON p."id" = c."projectId" WHERE vm."id" = $1 AND vm."checkId" = $2 AND p."userId" = $3 LIMIT 1', [input.mentionId, input.checkId, userId]))[0];
    if (!mention) throw new CompetitorServiceError("VISIBILITY_MENTION_FORBIDDEN", 403);
  }

  const row = (await competitorDatabase().query('INSERT INTO "VisibilityCitation" ("id", "checkId", "mentionId", "url", "domain", "position", "metadata", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) RETURNING *', [
    crypto.randomUUID(),
    input.checkId,
    input.mentionId ?? null,
    url.toString(),
    url.hostname.toLowerCase().replace(/^www\./, ""),
    input.position ?? null,
    JSON.stringify(input.metadata ?? {}),
    new Date(),
  ]))[0];
  return (await loadVisibilityEvidence(userId, input.checkId)).citations.find((citation) => citation.id === String(row.id)) ?? null;
}
