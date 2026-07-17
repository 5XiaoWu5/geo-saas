import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { buildEntityProjectReport } from "@/features/entity/server";
import { toEntityAttribute, toEntityProfile } from "@/features/entity/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const profileSchema = z.object({
  projectId: z.string().min(1),
  brandName: z.string().trim().max(160).default(""),
  industry: z.string().trim().max(160).default(""),
  region: z.string().trim().max(160).default(""),
  description: z.string().trim().max(4000).default(""),
  services: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  products: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  advantages: z.array(z.string().trim().min(1).max(240)).max(30).default([]),
  attributes: z.array(z.object({
    key: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(2000),
    source: z.string().trim().max(80).default("user"),
  })).max(60).default([]),
});

function uniqueList(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数无效" }, { status: 400 });

  const project = await prisma.project.findFirst({ where: { id: parsed.data.projectId, userId: user.id } });
  if (!project) return NextResponse.json({ error: "项目不存在或无权访问" }, { status: 404 });

  const profile = await prisma.entityProfile.upsertForProject({
    where: { projectId: parsed.data.projectId, userId: user.id },
    data: {
      brandName: parsed.data.brandName,
      industry: parsed.data.industry,
      region: parsed.data.region,
      description: parsed.data.description,
      services: uniqueList(parsed.data.services),
      products: uniqueList(parsed.data.products),
      advantages: uniqueList(parsed.data.advantages),
    },
  });

  if (!profile) return NextResponse.json({ error: "实体档案保存失败" }, { status: 500 });

  const attributes = await prisma.entityAttribute.replaceForEntity({
    where: { entityId: profile.id, userId: user.id },
    data: parsed.data.attributes.map((attribute) => ({
      key: attribute.key,
      value: attribute.value,
      source: attribute.source || "user",
    })),
  });

  const report = await buildEntityProjectReport(prisma, parsed.data.projectId, user.id);

  return NextResponse.json({
    profile: toEntityProfile(profile),
    attributes: attributes.map(toEntityAttribute),
    report,
  }, { status: 201 });
}
