"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Project } from "@/types/project";

type ProjectContextValue = {
  project: Project;
  projectId: string;
  loading: boolean;
  refreshProject: () => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ project, children }: { project: Project; children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState(project);
  const [loading, setLoading] = useState(false);

  const refreshProject = useCallback(async () => {
    setLoading(true);
    setCurrentProject(project);
    setLoading(false);
  }, [project]);

  const value = useMemo<ProjectContextValue>(() => ({ project: currentProject, projectId: currentProject.id, loading, refreshProject }), [currentProject, loading, refreshProject]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error("useProject must be used within ProjectProvider");
  }

  return context;
}
