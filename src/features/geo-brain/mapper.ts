import type { GeoBrainAnalysis } from "@/features/geo-brain/types";

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function toGeoBrainAnalysis(row: Record<string, unknown>): GeoBrainAnalysis {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
  const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : new Date(String(row.updatedAt));

  return {
    id: String(row.id),
    projectId: String(row.projectId),
    score: Number(row.score ?? 0),
    scoreDetails: parseJsonObject(row.scoreDetails) as GeoBrainAnalysis["scoreDetails"],
    insights: parseJsonArray(row.insights).map(String),
    problems: parseJsonArray(row.problems).map((item) => item as GeoBrainAnalysis["problems"][number]),
    recommendations: parseJsonArray(row.recommendations).map((item) => item as GeoBrainAnalysis["recommendations"][number]),
    aiSummary: String(row.aiSummary ?? ""),
    provider: String(row.provider ?? "local"),
    model: String(row.model ?? "geo-brain-rules"),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}
