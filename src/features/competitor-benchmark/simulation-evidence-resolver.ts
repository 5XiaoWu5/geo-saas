import { competitorRepository } from "./competitor.repository";
import { resolveCompetitorEntity } from "./entity-resolver";
import type { SimulationTargetEvidence, SimulationTargetType } from "./types";

export async function resolveSimulationTargetEvidence(userId: string, projectId: string, targetType: SimulationTargetType, competitorId?: string | null): Promise<SimulationTargetEvidence> {
  const entity = await resolveCompetitorEntity(userId, projectId, targetType, competitorId);
  if (targetType === "OWN") {
    return { targetType, competitorId: null, entity, snapshot: null, available: entity.available, missingSources: entity.available ? [] : entity.missingFields };
  }

  const snapshot = competitorId ? await competitorRepository.latestSnapshotForUser(userId, competitorId) : null;
  const requiredMetrics = snapshot ? [snapshot.entityScore, snapshot.schemaScore, snapshot.authorityScore, snapshot.citationScore] : [];
  const snapshotAvailable = Boolean(snapshot && requiredMetrics.every((score) => typeof score === "number"));
  const missingSources = [
    ...entity.missingFields.map((field) => `entity.${field}`),
    ...(snapshot ? requiredMetrics.map((score, index) => typeof score === "number" ? "" : `snapshot.metric.${index}`).filter(Boolean) : ["CompetitorSnapshot"]),
  ];
  return { targetType, competitorId: competitorId ?? null, entity, snapshot, available: entity.available && snapshotAvailable, missingSources };
}
