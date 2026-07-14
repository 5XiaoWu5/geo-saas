import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { crawlWebsite } from "@/features/website-crawl/server/crawler";
import { toWebsiteScan } from "@/features/website-crawl/server/scan-mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireOwnedProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { project: null, response: NextResponse.json({ error: "请先登录" }, { status: 401 }) };

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
  if (!project) return { project: null, response: NextResponse.json({ error: "项目不存在或无权访问" }, { status: 404 }) };

  return { project, response: null };
}

function calculateGeoScore(result: Awaited<ReturnType<typeof crawlWebsite>>) {
  const titleScore = result.title ? 18 : 0;
  const descriptionScore = result.description ? 18 : 0;
  const headingScore = Math.min(result.h1Count * 10 + result.h2Count * 2, 18);
  const linkScore = Math.min(result.internalLinkCount * 2 + result.externalLinkCount, 16);
  const schemaScore = Math.min(result.schemaTypes.length * 8 + result.schemaCount * 2, 18);
  const technicalScore = (result.robotsExists ? 6 : 0) + (result.sitemapExists ? 6 : 0);
  return Math.min(100, titleScore + descriptionScore + headingScore + linkScore + schemaScore + technicalScore);
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, response } = await requireOwnedProject(projectId);
  if (response) return response;

  const scan = await prisma.websiteScan.findLatest({ where: { projectId: project.id } });
  return NextResponse.json({ scan: scan ? toWebsiteScan(scan) : null });
}

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, response } = await requireOwnedProject(projectId);
  if (response) return response;

  try {
    const result = await crawlWebsite(project.domain);
    const scan = await prisma.websiteScan.create({ data: { projectId: project.id, ...result } });
    const geoScore = calculateGeoScore(result);
    await prisma.project.update({ where: { id: project.id, userId: project.userId ?? "" }, data: { geoScore, visibilityScore: Math.round(geoScore * 0.72), lastScan: new Date(), lastAnalysisAt: new Date(), status: "Monitoring" } });
    return NextResponse.json({ scan: toWebsiteScan(scan), geoScore });
  } catch (error) {
    const message = error instanceof Error ? error.message : "网站扫描失败";
    const scan = await prisma.websiteScan.create({
      data: {
        projectId: project.id,
        url: project.domain,
        status: "failed",
        title: null,
        description: message,
        h1Count: 0,
        h2Count: 0,
        internalLinkCount: 0,
        externalLinkCount: 0,
        schemaCount: 0,
        schemaTypes: [],
        robotsExists: false,
        sitemapExists: false,
      },
    });
    return NextResponse.json({ error: message, scan: toWebsiteScan(scan) }, { status: 502 });
  }
}