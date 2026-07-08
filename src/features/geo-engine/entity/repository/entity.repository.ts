import type { WebsiteEntity } from "@/features/geo-engine/entity/types/entity.types";

export interface EntityRepository {
  saveEntities(projectId: string, entities: WebsiteEntity[]): Promise<WebsiteEntity[]>;
  getProjectEntities(projectId: string): Promise<WebsiteEntity[]>;
}
