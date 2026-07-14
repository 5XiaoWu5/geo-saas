import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { analyzeWebsiteScan } from "@/features/geo-analysis/server/analyzer";
import { toGeoAnalysis } from "@/features/geo-analysis/server/analysis-mapper";
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

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, response } = await requireOwnedProject(projectId);
  if (response) return response;

  const scan = await prisma.websiteScan.findLatest({ where: { projectId: project.id } });
  const analysis = await prisma.geoAnalysis.findLatest({ where: { projectId: project.id } });
  return NextResponse.json({ scan: scan ? toWebsiteScan(scan) : null, analysis: analysis ? toGeoAnalysis(analysis) : null });
}

export async function POST(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { project, response } = await requireOwnedProject(projectId);
  if (response) return response;

  try {
    const result = await crawlWebsite(project.domain);
    const scan = await prisma.websiteScan.create({ data: { projectId: project.id, ...result } });
    const normalizedScan = toWebsiteScan(scan);
    const analysisResult = analyzeWebsiteScan(normalizedScan);
    const analysis = await prisma.geoAnalysis.create({ data: { projectId: project.id, scanId: scan.id, ...analysisResult } });
    await prisma.project.update({ where: { id: project.id, userId: project.userId ?? "" }, data: { geoScore: analysisResult.totalScore, visibilityScore: Math.round(analysisResult.totalScore * 0.72), lastScan: new Date(), lastAnalysisAt: new Date(), status: "Monitoring" } });
    return NextResponse.json({ scan: normalizedScan, analysis: toGeoAnalysis(analysis), geoScore: analysisResult.totalScore });
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