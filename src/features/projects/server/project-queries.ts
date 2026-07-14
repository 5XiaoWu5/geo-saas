import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toProject } from "@/features/projects/project-mapper";
import type { Project } from "@/types/project";

export async function getCurrentUserProject(projectId: string): Promise<Project> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
  if (!project) notFound();

  return toProject(project);
}

