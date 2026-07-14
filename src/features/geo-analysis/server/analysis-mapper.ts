import type { GeoAnalysis, GeoIssue } from "@/features/geo-analysis/types";

function parseIssues(value: unknown): GeoIssue[] {
  if (Array.isArray(value)) return value as GeoIssue[];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed as GeoIssue[] : [];
  } catch {
    return [];
  }
}

export function toGeoAnalysis(row: Record<string, unknown>): GeoAnalysis {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));

  return {
    id: String(row.id),
    projectId: String(row.projectId),
    scanId: String(row.scanId),
    totalScore: Number(row.totalScore ?? 0),
    entityScore: Number(row.entityScore ?? 0),
    schemaScore: Number(row.schemaScore ?? 0),
    technicalScore: Number(row.technicalScore ?? 0),
    contentScore: Number(row.contentScore ?? 0),
    issues: parseIssues(row.issues),
    createdAt: createdAt.toISOString(),
  };
}
