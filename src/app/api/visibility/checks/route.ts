import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toVisibilityCheck } from "@/features/visibility/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createCheckSchema = z.object({
  campaignId: z.string().min(1),
  provider: z.string().trim().min(1, "请选择目标 AI").max(80),
  prompt: z.string().trim().min(1, "检测 Prompt 不能为空").max(2000),
  answer: z.string().trim().min(1, "检测答案不能为空").max(10000),
  brandMentioned: z.boolean(),
  position: z.number().int().min(1).max(100).nullable().optional(),
  score: z.number().int().min(0).max(100),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const parsed = createCheckSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数无效" }, { status: 400 });

  const campaign = await prisma.visibilityCampaign.findFirstForUser({ where: { id: parsed.data.campaignId, userId: user.id } });
  if (!campaign) return NextResponse.json({ error: "监控关键词不存在或无权访问" }, { status: 404 });

  const check = await prisma.visibilityCheck.create({
    data: {
      campaignId: campaign.id,
      provider: parsed.data.provider,
      prompt: parsed.data.prompt,
      answer: parsed.data.answer,
      brandMentioned: parsed.data.brandMentioned,
      position: parsed.data.brandMentioned ? parsed.data.position ?? null : null,
      score: parsed.data.score,
    },
  });

  return NextResponse.json({ check: toVisibilityCheck(check) }, { status: 201 });
}
