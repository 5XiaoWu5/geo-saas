import type { VisibilityCampaign, VisibilityCheck, VisibilityPrompt } from "@/features/visibility/types";

export function toVisibilityCampaign(row: Record<string, unknown>): VisibilityCampaign {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    keyword: String(row.keyword),
    createdAt: createdAt.toISOString(),
  };
}

export function toVisibilityPrompt(row: Record<string, unknown>): VisibilityPrompt {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
  return {
    id: String(row.id),
    campaignId: String(row.campaignId),
    prompt: String(row.prompt),
    createdAt: createdAt.toISOString(),
  };
}

export function toVisibilityCheck(row: Record<string, unknown>): VisibilityCheck {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
  const rawMentionPosition = row.mentionPosition ?? row.position;
  const mentionPosition = rawMentionPosition === null || typeof rawMentionPosition === "undefined" ? null : Number(rawMentionPosition);
  const sourceUrls = Array.isArray(row.sourceUrls) ? row.sourceUrls.map(String).filter(Boolean) : [];
  return {
    id: String(row.id),
    campaignId: String(row.campaignId),
    promptId: row.promptId ? String(row.promptId) : null,
    provider: String(row.provider),
    prompt: String(row.prompt),
    answer: String(row.answer),
    brandMentioned: Boolean(row.brandMentioned),
    mentionPosition: Number.isFinite(mentionPosition) ? mentionPosition : null,
    sourceUrls,
    score: Number(row.score ?? 0),
    createdAt: createdAt.toISOString(),
  };
}
