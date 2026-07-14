import { NextResponse } from "next/server";
import { hashPassword } from "@/features/auth/server/password";
import { prisma } from "@/features/auth/server/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const stamp = Date.now();
  const email = `geo-analyzer-${stamp}@example.com`;
  const password = `GeoPilot${stamp}!a`;
  const user = await prisma.user.create({
    data: {
      email,
      name: "GEO 分析测试账号",
      passwordHash: await hashPassword(password),
      emailVerified: true,
    },
  });
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: "GEO 分析测试项目",
      domain: "https://example.com",
      language: "Chinese",
      country: "China",
      industry: "SaaS",
      description: "用于验证 GEO Analyzer Engine v1 的临时测试项目。",
      status: "Active",
    },
  });
  return NextResponse.json({ email, password, projectId: project.id });
}
