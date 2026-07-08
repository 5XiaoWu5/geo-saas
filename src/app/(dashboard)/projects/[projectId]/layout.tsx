import type { ReactNode } from "react";
import { ProjectCenterShell } from "@/features/project-center";

export default async function ProjectCenterLayout({ children, params }: { children: ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return <ProjectCenterShell projectId={projectId}>{children}</ProjectCenterShell>;
}
