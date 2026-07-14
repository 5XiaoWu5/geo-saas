import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toWebsiteScan } from "@/features/website-crawl/server/scan-mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const testScanUrls = [
  "https://acmecloud.com",
  "https://northstarcrm.io",
  "https://heliodocs.dev",
  "https://vertexfinance.com",
];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const scans = await prisma.websiteScan.findManyForUser({ where: { userId: user.id } });
  return NextResponse.json({ scans: scans.map((scan) => toWebsiteScan(scan)) });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const result = await prisma.websiteScan.deleteTestScansForUser({ where: { userId: user.id, urls: testScanUrls } });
  return NextResponse.json({ deleted: result.count });
}
