import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toVisibilityCheck } from "@/features/visibility/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createCheckSchema = z.object({
  campaignId: z.string().min(1),
  promptId: z.string().min(1).nullable().optional(),
  prompt: z.string().trim().max(2000).optional(),
  provider: z.string().trim().min(1, "请选择目标 AI").max(80),
  answer: z.string().trim().min(1, "检测答案不能为空").max(10000),
  brandMentioned: z.boolean(),
  mentionPosition: z.number().int().min(1).max(100).nullable().optional(),
  position: z.number().int().min(1).max(100).nullable().optional(),
  sourceUrls: z.array(z.string().trim().url("来源链接格式无效").max(500)).max(20).optional(),
  score: z.number().int().min(0).max(100),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const parsed = createCheckSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数无效" }, { status: 400 });

  const campaign = await prisma.visibilityCampaign.findFirstForUser({ where: { id: parsed.data.campaignId, userId: user.id } });
  if (!campaign) return NextResponse.json({ error: "监控关键词不存在或无权访问" }, { status: 404 });

  const prompt = parsed.data.promptId
    ? await prisma.visibilityPrompt.findFirstForUser({ where: { id: parsed.data.promptId, campaignId: campaign.id, userId: user.id } })
    : null;
  if (parsed.data.promptId && !prompt) return NextResponse.json({ error: "Prompt 不存在或无权访问" }, { status: 404 });

  const promptText = prompt?.prompt ?? parsed.data.prompt?.trim() ?? "";
  if (!promptText) return NextResponse.json({ error: "Prompt 不能为空" }, { status: 400 });

  const mentionPosition = parsed.data.brandMentioned ? parsed.data.mentionPosition ?? parsed.data.position ?? null : null;
  const sourceUrls = parsed.data.sourceUrls?.map((url) => url.trim()).filter(Boolean) ?? [];

  const check = await prisma.visibilityCheck.create({
    data: {
      campaignId: campaign.id,
      promptId: prompt?.id ?? null,
      provider: parsed.data.provider,
      prompt: promptText,
      answer: parsed.data.answer,
      brandMentioned: parsed.data.brandMentioned,
      mentionPosition,
      sourceUrls,
      score: parsed.data.score,
    },
  });

  return NextResponse.json({ check: toVisibilityCheck(check) }, { status: 201 });
}
