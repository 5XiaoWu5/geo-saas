import type { ReactNode } from "react";
import { ProjectCenterShell } from "@/features/project-center";
import { projects } from "@/features/project-center/data/projects";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((project) => ({ projectId: project.id }));
}

export default async function ProjectCenterLayout({ children, params }: { children: ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  return <ProjectCenterShell projectId={projectId}>{children}</ProjectCenterShell>;
}