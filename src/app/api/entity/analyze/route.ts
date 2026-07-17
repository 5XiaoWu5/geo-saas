import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { buildEntityOptimizationTask, toEntityIssueId } from "@/features/entity/recommendations";
import { buildEntityProjectReport } from "@/features/entity/server";
import { toOptimizationTask } from "@/features/optimization/mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const analyzeSchema = z.object({
  projectId: z.string().min(1),
  createTasks: z.boolean().default(true),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const parsed = analyzeSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数无效" }, { status: 400 });

  const report = await buildEntityProjectReport(prisma, parsed.data.projectId, user.id);
  if (!report) return NextResponse.json({ error: "项目不存在或无权访问" }, { status: 404 });

  const tasks = [];
  if (parsed.data.createTasks) {
    for (const item of report.score.missingItems) {
      const existingTask = await prisma.optimizationTask.findByIssue({
        where: { projectId: parsed.data.projectId, issueId: toEntityIssueId(parsed.data.projectId, item) },
      });
      const task = existingTask ?? await prisma.optimizationTask.create({
        data: buildEntityOptimizationTask(parsed.data.projectId, item),
      });
      tasks.push(toOptimizationTask(task));
    }
  }

  return NextResponse.json({
    score: report.score,
    tasks,
    createdOrExistingTaskCount: tasks.length,
  });
}
