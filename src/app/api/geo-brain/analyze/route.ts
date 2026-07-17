import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { toEntityAttribute, toEntityProfile } from "@/features/entity/mapper";
import { toGeoAnalysis } from "@/features/geo-analysis/server/analysis-mapper";
import { toGeoBrainAnalysis } from "@/features/geo-brain/mapper";
import { runGeoBrainAnalysis } from "@/features/geo-brain/services/geo-brain.service";
import type { GeoBrainInput } from "@/features/geo-brain/types";
import { toProject } from "@/features/projects/project-mapper";
import { toWebsiteScan } from "@/features/website-crawl/server/scan-mapper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  projectId: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PROJECT_ID" }, { status: 400 });

  const projectRow = await prisma.project.findFirst({ where: { id: parsed.data.projectId, userId: user.id } });
  if (!projectRow) return NextResponse.json({ error: "PROJECT_FORBIDDEN" }, { status: 403 });

  const [scanRow, analysisRow, profileRow, attributeRows] = await Promise.all([
    prisma.websiteScan.findLatest({ where: { projectId: parsed.data.projectId } }),
    prisma.geoAnalysis.findLatest({ where: { projectId: parsed.data.projectId } }),
    prisma.entityProfile.findFirstForProject({ where: { projectId: parsed.data.projectId, userId: user.id } }),
    prisma.entityAttribute.findManyForUser({ where: { userId: user.id, projectId: parsed.data.projectId } }),
  ]);

  const project = toProject(projectRow);
  const crawlData = scanRow ? toWebsiteScan(scanRow) : null;
  const geoAnalysis = analysisRow ? toGeoAnalysis(analysisRow) : null;
  const profile = profileRow ? toEntityProfile(profileRow) : null;
  const attributes = attributeRows.map(toEntityAttribute);

  const input: GeoBrainInput = {
    url: project.websiteUrl,
    crawlData,
    entityData: { profile, attributes },
    inventoryData: {
      latestScan: crawlData,
      analysis: geoAnalysis,
      issues: geoAnalysis?.issues ?? [],
    },
    project,
  };

  const result = await runGeoBrainAnalysis(input);
  const saved = await prisma.geoBrainAnalysis.create({
    data: {
      projectId: project.id,
      score: result.geoScore,
      scoreDetails: result.score,
      insights: result.insights,
      problems: result.problems,
      recommendations: result.recommendations,
      aiSummary: result.aiSummary,
      provider: result.provider,
      model: result.model,
    },
  });

  return NextResponse.json({
    analysis: toGeoBrainAnalysis(saved),
    input: {
      project,
      crawlData,
      analysis: geoAnalysis,
      profile,
      attributes,
    },
  }, { status: 201 });
}
