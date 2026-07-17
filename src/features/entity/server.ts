import { buildEntityScore } from "@/features/entity/scoring";
import type { EntityProjectReport } from "@/features/entity/types";
import { toEntityAttribute, toEntityProfile } from "@/features/entity/mapper";
import { toGeoAnalysis } from "@/features/geo-analysis/server/analysis-mapper";
import { toProject } from "@/features/projects/project-mapper";
import { toWebsiteScan } from "@/features/website-crawl/server/scan-mapper";

type EntityPrisma = {
  project: {
    findFirst(args: { where: { id: string; userId: string } }): Promise<Record<string, unknown> | null>;
  };
  websiteScan: {
    findLatest(args: { where: { projectId: string } }): Promise<Record<string, unknown> | null>;
  };
  geoAnalysis: {
    findLatest(args: { where: { projectId: string } }): Promise<Record<string, unknown> | null>;
  };
  entityProfile: {
    findFirstForProject(args: { where: { projectId: string; userId: string } }): Promise<Record<string, unknown> | null>;
  };
  entityAttribute: {
    findManyForUser(args: { where: { userId: string; projectId: string } }): Promise<Record<string, unknown>[]>;
  };
};

export async function buildEntityProjectReport(prisma: EntityPrisma, projectId: string, userId: string): Promise<EntityProjectReport | null> {
  const projectRow = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!projectRow) return null;

  const [scanRow, analysisRow, profileRow, attributeRows] = await Promise.all([
    prisma.websiteScan.findLatest({ where: { projectId } }),
    prisma.geoAnalysis.findLatest({ where: { projectId } }),
    prisma.entityProfile.findFirstForProject({ where: { projectId, userId } }),
    prisma.entityAttribute.findManyForUser({ where: { userId, projectId } }),
  ]);

  const project = toProject(projectRow);
  const scan = scanRow ? toWebsiteScan(scanRow) : null;
  const analysis = analysisRow ? toGeoAnalysis(analysisRow) : null;
  const profile = profileRow ? toEntityProfile(profileRow) : null;
  const attributes = attributeRows.map(toEntityAttribute);

  return {
    project,
    scan,
    analysis,
    profile,
    attributes,
    score: buildEntityScore({ project, scan, analysis, profile, attributes }),
  };
}
