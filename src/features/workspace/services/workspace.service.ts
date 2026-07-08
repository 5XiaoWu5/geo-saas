import { getWorkspaceRepository } from "@/features/workspace/repositories";

export function getWorkspaces() {
  return getWorkspaceRepository().getWorkspaces();
}

export function getWorkspace(workspaceId: string) {
  return getWorkspaceRepository().getWorkspace(workspaceId);
}

export function getDefaultWorkspace() {
  return getWorkspaceRepository().getDefaultWorkspace();
}
