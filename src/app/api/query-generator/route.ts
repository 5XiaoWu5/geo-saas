import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toProject } from "@/features/projects/project-mapper";
import { toQueryTemplate } from "@/features/query-generator/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const url = new URL(request.url);
  const requestedProjectId = url.searchParams.get("projectId") ?? undefined;
  const projects = (await prisma.project.findMany({ where: { userId: user.id } })).map(toProject);
  const ownedProjectIds = new Set(projects.map((project) => project.id));
  const selectedProjectId = requestedProjectId && ownedProjectIds.has(requestedProjectId) ? requestedProjectId : projects[0]?.id ?? null;

  if (!selectedProjectId) {
    return NextResponse.json({ projects: [], selectedProjectId: null, templates: [] });
  }

  const templates = await prisma.queryTemplate.findManyForProject({ where: { projectId: selectedProjectId, userId: user.id } });
  return NextResponse.json({
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      websiteUrl: project.websiteUrl,
      industry: project.industry,
      description: project.description,
      geoScore: project.geoScore,
      visibilityScore: project.visibilityScore,
      country: project.country,
    })),
    selectedProjectId,
    templates: templates.map(toQueryTemplate),
  });
}
