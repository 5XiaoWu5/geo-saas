import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { getCampaignKeyword } from "@/features/query-generator/campaign";
import { toQueryTemplate } from "@/features/query-generator/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const importSchema = z.object({
  templateIds: z.array(z.string().min(1)).min(1, "请选择要导入的问题"),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const parsed = importSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数无效" }, { status: 400 });

  const imported = [];
  for (const templateId of parsed.data.templateIds) {
    const template = await prisma.queryTemplate.findByIdForUser({ where: { id: templateId, userId: user.id } });
    if (!template) return NextResponse.json({ error: "问题模板不存在或无权访问" }, { status: 404 });

    const project = await prisma.project.findFirst({ where: { id: template.projectId, userId: user.id } });
    if (!project) return NextResponse.json({ error: "项目不存在或无权访问" }, { status: 404 });

    const keyword = getCampaignKeyword(toQueryTemplate(template));
    const existingCampaign = await prisma.visibilityCampaign.findByKeywordForUser({ where: { projectId: template.projectId, userId: user.id, keyword } });
    const campaign = existingCampaign ?? await prisma.visibilityCampaign.create({ data: { projectId: template.projectId, keyword } });
    const prompt = await prisma.visibilityPrompt.create({ data: { campaignId: campaign.id, prompt: template.content } });
    const updatedTemplate = await prisma.queryTemplate.updateStatus({ where: { id: template.id, userId: user.id }, data: { status: "IMPORTED" } });

    imported.push({
      template: updatedTemplate ? toQueryTemplate(updatedTemplate) : toQueryTemplate(template),
      campaignId: campaign.id,
      promptId: prompt.id,
    });
  }

  return NextResponse.json({ imported });
}
