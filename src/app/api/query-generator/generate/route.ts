import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toProject } from "@/features/projects/project-mapper";
import { generateQueryDrafts } from "@/features/query-generator/rules";
import { QUERY_CATEGORIES } from "@/features/query-generator/types";
import { toQueryTemplate } from "@/features/query-generator/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const generateSchema = z.object({
  projectId: z.string().min(1),
  categories: z.array(z.enum(QUERY_CATEGORIES)).min(1, "请至少选择一个问题类型"),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const parsed = generateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数无效" }, { status: 400 });

  const projectRow = await prisma.project.findFirst({ where: { id: parsed.data.projectId, userId: user.id } });
  if (!projectRow) return NextResponse.json({ error: "项目不存在或无权访问" }, { status: 404 });

  const project = toProject(projectRow);
  const drafts = generateQueryDrafts(project, parsed.data.categories);
  const templates = await prisma.queryTemplate.createMany({
    data: drafts.map((draft) => ({
      projectId: project.id,
      content: draft.content,
      category: draft.category,
      intent: draft.intent,
      priority: draft.priority,
      status: "GENERATED",
    })),
  });

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      websiteUrl: project.websiteUrl,
      industry: project.industry,
      geoScore: project.geoScore,
      visibilityScore: project.visibilityScore,
    },
    templates: templates.map(toQueryTemplate),
  }, { status: 201 });
}

