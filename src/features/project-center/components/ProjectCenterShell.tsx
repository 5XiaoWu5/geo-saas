import type { ReactNode } from "react";
import { ProjectProvider } from "@/features/project-center/context/ProjectContext";
import { getCurrentUserProject } from "@/features/projects/server/project-queries";
import { ProjectErrorBoundary } from "@/features/project-center/components/ProjectErrorBoundary";
import { ProjectHeader } from "@/features/project-center/components/ProjectHeader";
import { ProjectTabs } from "@/features/project-center/components/ProjectTabs";

export async function ProjectCenterShell({ projectId, children }: { projectId: string; children: ReactNode }) {
  const project = await getCurrentUserProject(projectId);

  return (
    <ProjectProvider project={project}>
      <div className="space-y-6">
        <ProjectHeader />
        <ProjectTabs />
        <ProjectErrorBoundary>{children}</ProjectErrorBoundary>
      </div>
    </ProjectProvider>
  );
}


