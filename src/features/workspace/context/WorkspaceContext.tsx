"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@/features/user/models/user.types";
import { getCurrentUser } from "@/features/user/services/user.service";
import type { Workspace } from "@/features/workspace/models/workspace.types";
import { getDefaultWorkspace, getWorkspace, getWorkspaces } from "@/features/workspace/services/workspace.service";

type WorkspaceContextValue = {
  workspace: Workspace;
  workspaces: Workspace[];
  user: User;
  loading: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const fallbackWorkspace: Workspace = { id: "loading", name: "Loading", slug: "loading", createdAt: new Date(0).toISOString(), plan: "free" };
const fallbackUser: User = { id: "loading", name: "Loading", email: "loading@geopilot.ai", role: "member" };

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(fallbackWorkspace);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [user, setUser] = useState<User>(fallbackUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([getDefaultWorkspace(), getWorkspaces(), getCurrentUser()]).then(([defaultWorkspace, nextWorkspaces, nextUser]) => {
      setWorkspace(defaultWorkspace);
      setWorkspaces(nextWorkspaces);
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    setLoading(true);
    const nextWorkspace = await getWorkspace(workspaceId);
    setWorkspace(nextWorkspace);
    setLoading(false);
  }, []);

  const value = useMemo<WorkspaceContextValue>(() => ({ workspace, workspaces, user, loading, switchWorkspace }), [loading, switchWorkspace, user, workspace, workspaces]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }

  return context;
}
