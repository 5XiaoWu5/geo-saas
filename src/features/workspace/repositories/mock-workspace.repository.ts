import type { Workspace } from "@/features/workspace/models/workspace.types";
import type { WorkspaceRepository } from "@/features/workspace/repositories/workspace.repository";

export const mockWorkspaces: Workspace[] = [
  { id: "ws_geo_enterprise", name: "GeoPilot Enterprise", slug: "geopilot-enterprise", createdAt: "2026-06-01T00:00:00.000Z", plan: "enterprise" },
  { id: "ws_growth_lab", name: "Growth Lab", slug: "growth-lab", createdAt: "2026-06-18T00:00:00.000Z", plan: "professional" },
];

export class MockWorkspaceRepository implements WorkspaceRepository {
  async getWorkspaces(): Promise<Workspace[]> {
    return mockWorkspaces;
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    return mockWorkspaces.find((workspace) => workspace.id === workspaceId) ?? mockWorkspaces[0];
  }

  async getDefaultWorkspace(): Promise<Workspace> {
    return mockWorkspaces[0];
  }
}
