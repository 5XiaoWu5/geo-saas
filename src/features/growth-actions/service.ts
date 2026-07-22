import type { GrowthReportSnapshot } from "@/features/growth-reports/types";
import { buildGrowthActionCandidates } from "./growth-action-generator";
import { growthActionRepository } from "./repository";
import { ACTION_STATUSES, type GrowthActionStatus } from "./types";

export class GrowthActionError extends Error { constructor(public code: string, public status: number) { super(code); } }
async function owned(userId: string, projectId: string) { if (!await growthActionRepository.projectOwned(userId, projectId)) throw new GrowthActionError("PROJECT_FORBIDDEN", 403); }
export async function listGrowthActions(userId: string, projectId: string) { await owned(userId, projectId); return { projectId, actions: await growthActionRepository.list(userId, projectId) }; }
export async function generateGrowthActions(userId: string, projectId: string, reportId?: string) {
  await owned(userId, projectId);
  const report = await growthActionRepository.latestReport(userId, projectId, reportId);
  if (reportId && !report) throw new GrowthActionError("REPORT_FORBIDDEN", 403);
  let snapshot: GrowthReportSnapshot | null = null;
  if (report?.snapshot && typeof report.snapshot === "object") snapshot = report.snapshot as GrowthReportSnapshot;
  else if (typeof report?.snapshot === "string") { try { snapshot = JSON.parse(report.snapshot) as GrowthReportSnapshot; } catch { snapshot = null; } }
  const candidates = buildGrowthActionCandidates(snapshot, await growthActionRepository.currentTasks(userId, projectId));
  if (!candidates.length) return { status: "unavailable" as const, createdCount: 0, existingCount: 0, actions: await growthActionRepository.list(userId, projectId) };
  const createdCount = await growthActionRepository.insert(userId, projectId, candidates);
  return { status: "available" as const, createdCount, existingCount: candidates.length - createdCount, actions: await growthActionRepository.list(userId, projectId) };
}
export async function updateGrowthAction(userId: string, projectId: string, actionId: string, status: string) { await owned(userId, projectId); if (!ACTION_STATUSES.includes(status as GrowthActionStatus)) throw new GrowthActionError("INVALID_ACTION_STATUS", 400); const current = (await growthActionRepository.list(userId, projectId)).find((item) => item.id === actionId); if (!current) throw new GrowthActionError("ACTION_NOT_FOUND", 404); const transitions: Record<GrowthActionStatus, GrowthActionStatus[]> = { TODO: ["TODO", "IN_PROGRESS"], IN_PROGRESS: ["IN_PROGRESS", "COMPLETED"], COMPLETED: ["COMPLETED", "VERIFIED"], VERIFIED: ["VERIFIED"] }; if (!transitions[current.status].includes(status as GrowthActionStatus)) throw new GrowthActionError("INVALID_ACTION_TRANSITION", 409); const action = await growthActionRepository.updateStatus(userId, projectId, actionId, status as GrowthActionStatus); if (!action) throw new GrowthActionError("ACTION_NOT_FOUND", 404); if (status === "COMPLETED") await growthActionRepository.timeline(userId, action); return action; }
