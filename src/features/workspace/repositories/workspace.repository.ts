import type { Workspace } from "@/features/workspace/models/workspace.types";

export interface WorkspaceRepository {
  getWorkspaces(): Promise<Workspace[]>;
  getWorkspace(workspaceId: string): Promise<Workspace>;
  getDefaultWorkspace(): Promise<Workspace>;
}
