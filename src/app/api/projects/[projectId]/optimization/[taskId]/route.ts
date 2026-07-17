import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toOptimizationTask } from "@/features/optimization/mapper";
import { isOptimizationStatus } from "@/features/optimization/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireOwnedProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, project: null, response: NextResponse.json({ error: "请先登录" }, { status: 401 }) };

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
  if (!project) return { user, project: null, response: NextResponse.json({ error: "项目不存在或无权访问" }, { status: 404 }) };

  return { user, project, response: null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string; taskId: string }> }) {
  const { projectId, taskId } = await params;
  const { user, response } = await requireOwnedProject(projectId);
  if (response) return response;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  if (!isOptimizationStatus(body.status)) {
    return NextResponse.json({ error: "任务状态无效" }, { status: 400 });
  }

  const updated = await prisma.optimizationTask.updateStatus({ where: { id: taskId, userId: user.id }, data: { status: body.status } });
  if (!updated) return NextResponse.json({ error: "任务不存在或无权访问" }, { status: 404 });

  return NextResponse.json({ task: toOptimizationTask(updated) });
}
