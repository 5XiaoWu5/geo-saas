import type { EntityRepository } from "@/features/geo-engine/entity/repository/entity.repository";
import type { WebsiteEntity } from "@/features/geo-engine/entity/types/entity.types";

const entitiesByProject = new Map<string, WebsiteEntity[]>();

export class MockEntityRepository implements EntityRepository {
  async saveEntities(projectId: string, entities: WebsiteEntity[]): Promise<WebsiteEntity[]> {
    entitiesByProject.set(projectId, entities);
    return entities;
  }

  async getProjectEntities(projectId: string): Promise<WebsiteEntity[]> {
    return entitiesByProject.get(projectId) ?? [];
  }
}
