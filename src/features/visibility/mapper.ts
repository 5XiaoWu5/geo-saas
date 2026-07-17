import type { VisibilityCampaign, VisibilityCheck } from "@/features/visibility/types";

export function toVisibilityCampaign(row: Record<string, unknown>): VisibilityCampaign {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    keyword: String(row.keyword),
    createdAt: createdAt.toISOString(),
  };
}

export function toVisibilityCheck(row: Record<string, unknown>): VisibilityCheck {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
  const position = row.position === null || typeof row.position === "undefined" ? null : Number(row.position);
  return {
    id: String(row.id),
    campaignId: String(row.campaignId),
    provider: String(row.provider),
    prompt: String(row.prompt),
    answer: String(row.answer),
    brandMentioned: Boolean(row.brandMentioned),
    position: Number.isFinite(position) ? position : null,
    score: Number(row.score ?? 0),
    createdAt: createdAt.toISOString(),
  };
}
