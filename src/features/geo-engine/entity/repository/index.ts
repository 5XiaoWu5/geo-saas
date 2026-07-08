import { MockEntityRepository } from "@/features/geo-engine/entity/repository/mock-entity.repository";
import type { EntityRepository } from "@/features/geo-engine/entity/repository/entity.repository";

let entityRepository: EntityRepository | null = null;

export function getEntityRepository(): EntityRepository {
  entityRepository ??= new MockEntityRepository();
  return entityRepository;
}
