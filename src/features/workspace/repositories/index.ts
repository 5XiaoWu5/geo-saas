import { MockWorkspaceRepository } from "@/features/workspace/repositories/mock-workspace.repository";
import type { WorkspaceRepository } from "@/features/workspace/repositories/workspace.repository";

let workspaceRepository: WorkspaceRepository | null = null;

export function getWorkspaceRepository(): WorkspaceRepository {
  workspaceRepository ??= new MockWorkspaceRepository();
  return workspaceRepository;
}

export type { WorkspaceRepository } from "@/features/workspace/repositories/workspace.repository";
