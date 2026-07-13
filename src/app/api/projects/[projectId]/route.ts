import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import type { Project } from "@/types/project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const projectSchema = z.object({
  name: z.string().trim().min(1, "项目名称不能为空"),
  websiteUrl: z.string().trim().url("请输入有效的网站地址"),
  language: z.enum(["English", "Chinese", "Spanish", "German", "Japanese"]),
  country: z.enum(["United States", "China", "United Kingdom", "Germany", "Japan", "Singapore"]),
  industry: z.enum(["SaaS", "Fintech", "Healthcare", "E-commerce", "Education", "Manufacturing"]),
  description: z.string().trim().min(1, "项目描述不能为空"),
});

function toProject(row: Record<string, unknown>): Project {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
  const lastAnalysisAt = row.lastAnalysisAt ? (row.lastAnalysisAt instanceof Date ? row.lastAnalysisAt : new Date(String(row.lastAnalysisAt))) : null;
  const lastScan = row.lastScan ? (row.lastScan instanceof Date ? row.lastScan : new Date(String(row.lastScan))) : null;
  const websiteUrl = String(row.domain);

  return {
    id: String(row.id),
    workspaceId: String(row.userId ?? "user-workspace"),
    name: String(row.name),
    websiteUrl,
    url: websiteUrl,
    language: String(row.language ?? "English") as Project["language"],
    country: String(row.country ?? "United States") as Project["country"],
    industry: String(row.industry ?? "SaaS") as Project["industry"],
    description: String(row.description ?? ""),
    createdAt: createdAt.toISOString(),
    lastAnalysisAt: lastAnalysisAt?.toISOString() ?? null,
    lastScan: lastScan?.toISOString() ?? null,
    reportsCount: Number(row.reportsCount ?? 0),
    geoScore: Number(row.geoScore ?? 0),
    visibilityScore: Number(row.visibilityScore ?? row.visibility ?? 0),
    status: String(row.status ?? "Active") as Project["status"],
  };
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "请先登录" }, { status: 401 }) };
  return { user, response: null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;

  const parsed = projectSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "项目参数无效" }, { status: 400 });

  const { projectId } = await params;
  const project = await prisma.project.update({
    where: { id: projectId, userId: user.id },
    data: {
      name: parsed.data.name,
      domain: parsed.data.websiteUrl,
      language: parsed.data.language,
      country: parsed.data.country,
      industry: parsed.data.industry,
      description: parsed.data.description,
    },
  });

  if (!project) return NextResponse.json({ error: "项目不存在或无权访问" }, { status: 404 });
  return NextResponse.json({ project: toProject(project) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { projectId } = await params;
  const project = await prisma.project.delete({ where: { id: projectId, userId: user.id } });
  if (!project) return NextResponse.json({ error: "项目不存在或无权访问" }, { status: 404 });
  return NextResponse.json({ deleted: true, project: toProject(project) });
}
