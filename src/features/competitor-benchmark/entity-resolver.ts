import { competitorRepository } from "./competitor.repository";
import { CompetitorServiceError } from "./competitor.service";
import type { CompetitorEntityEvidence, SimulationTargetType } from "./types";

function missingFields(values: Record<string, string>) {
  return Object.entries(values).filter(([, value]) => !value.trim()).map(([key]) => key);
}

export async function resolveCompetitorEntity(userId: string, projectId: string, targetType: SimulationTargetType, competitorId?: string | null): Promise<CompetitorEntityEvidence> {
  if (targetType === "COMPETITOR") {
    if (!competitorId) throw new CompetitorServiceError("COMPETITOR_REQUIRED", 400);
    const competitor = await competitorRepository.findByIdForUser(userId, competitorId);
    if (!competitor || competitor.projectId !== projectId) throw new CompetitorServiceError("COMPETITOR_FORBIDDEN", 403);
    const fields = { name: competitor.name, domain: competitor.domain, industry: competitor.industry, region: competitor.region };
    const missing = missingFields(fields);
    return { targetType, targetId: competitor.id, projectId, ...fields, available: missing.length === 0, missingFields: missing, sourceType: "CompetitorProfile", sourceId: competitor.id };
  }

  const project = await competitorRepository.projectIdentity(userId, projectId);
  if (!project) throw new CompetitorServiceError("PROJECT_FORBIDDEN", 403);
  const entity = await competitorRepository.ownEntityProfile(userId, projectId);
  const fields = {
    name: String(entity?.brandName ?? project.name ?? ""),
    domain: String(project.domain ?? ""),
    industry: String(entity?.industry ?? project.industry ?? ""),
    region: String(entity?.region ?? project.country ?? ""),
  };
  const missing = missingFields(fields);
  return {
    targetType,
    targetId: entity ? String(entity.id) : String(project.id),
    projectId,
    ...fields,
    available: missing.length === 0,
    missingFields: missing,
    sourceType: entity ? "EntityProfile" : "Project",
    sourceId: entity ? String(entity.id) : String(project.id),
  };
}
