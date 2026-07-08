import { MockProjectRepository } from "@/features/project-center/repositories/mock-project.repository";
import type { ProjectRepository } from "@/features/project-center/repositories/project.repository";

let projectRepository: ProjectRepository | null = null;

export function getProjectRepository(): ProjectRepository {
  projectRepository ??= new MockProjectRepository();
  return projectRepository;
}

export type { ProjectRepository } from "@/features/project-center/repositories/project.repository";
export { MockProjectRepository } from "@/features/project-center/repositories/mock-project.repository";
