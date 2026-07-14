import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toProject } from "@/features/projects/project-mapper";

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

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "请先登录" }, { status: 401 }) };
  return { user, response: null };
}

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const projects = await prisma.project.findMany({ where: { userId: user.id } });
  return NextResponse.json({ projects: projects.map(toProject) });
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const parsed = projectSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "项目参数无效" }, { status: 400 });

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      domain: parsed.data.websiteUrl,
      language: parsed.data.language,
      country: parsed.data.country,
      industry: parsed.data.industry,
      description: parsed.data.description,
      status: "Active",
      reportsCount: 0,
      geoScore: 0,
      visibilityScore: 0,
      visibility: 0,
    },
  });

  return NextResponse.json({ project: toProject(project) }, { status: 201 });
}


