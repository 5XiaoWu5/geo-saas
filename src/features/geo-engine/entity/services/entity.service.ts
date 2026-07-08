import { analyzeEntities } from "@/features/geo-engine/entity/analyzer/entity.analyzer.service";
import { extractEntities } from "@/features/geo-engine/entity/extractor/entity.extractor.service";
import { getEntityRepository } from "@/features/geo-engine/entity/repository";
import type { EntityAnalysis } from "@/features/geo-engine/entity/types/entity.types";
import type { NormalizedPageSnapshot } from "@/features/geo-engine/types/scan.types";

export async function analyzeProjectEntities(projectId: string, snapshots: NormalizedPageSnapshot[]): Promise<EntityAnalysis> {
  const entities = await extractEntities(projectId, snapshots);
  await getEntityRepository().saveEntities(projectId, entities);
  return analyzeEntities(entities);
}

export async function getProjectEntities(projectId: string) {
  return getEntityRepository().getProjectEntities(projectId);
}
