import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toVisibilityPrompt } from "@/features/visibility/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createPromptSchema = z.object({
  campaignId: z.string().min(1),
  prompt: z.string().trim().min(1, "Prompt 不能为空").max(2000, "Prompt 过长"),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const parsed = createPromptSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数无效" }, { status: 400 });

  const campaign = await prisma.visibilityCampaign.findFirstForUser({ where: { id: parsed.data.campaignId, userId: user.id } });
  if (!campaign) return NextResponse.json({ error: "监控关键词不存在或无权访问" }, { status: 404 });

  const prompt = await prisma.visibilityPrompt.create({
    data: {
      campaignId: campaign.id,
      prompt: parsed.data.prompt,
    },
  });

  return NextResponse.json({ prompt: toVisibilityPrompt(prompt) }, { status: 201 });
}
