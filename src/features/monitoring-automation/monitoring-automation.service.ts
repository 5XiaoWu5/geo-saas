import { AI_SEARCH_PROVIDER_TYPES, type AISearchProviderType } from "@/features/real-ai-search/types";
import { iso, type Row } from "@/features/real-ai-search/database";
import { detectMonitoringChanges } from "./change-detection.service";
import { monitoringAutomationRepository } from "./repository";
import { calculateNextRunAt } from "./schedule.service";
import type { MonitoringCenterResponse, MonitoringFrequency, MonitoringHistoryStatus, NotificationType, ProviderMonitoringSummary } from "./types";

export class MonitoringAutomationError extends Error { constructor(public code: string, public status: number) { super(code); } }
function requireProject<T>(value: T | null): T { if (!value) throw new MonitoringAutomationError("PROJECT_FORBIDDEN", 403); return value; }
function providerSummary(provider: AISearchProviderType, allRows: Row[]): ProviderMonitoringSummary { const rows = allRows.filter((row) => row.provider === provider); const latest = rows[0]; const latestSuccess = rows.find((row) => row.status === "SUCCEEDED"); const latestFailure = rows.find((row) => row.status === "FAILED"); const successRows = rows.filter((row) => row.status === "SUCCEEDED").slice(0, 8).reverse(); return { provider, status: latest ? "available" : "unavailable", latestCheckAt: latest ? iso(latest.completedAt ?? latest.createdAt) : null, latestSuccessAt: latestSuccess ? iso(latestSuccess.completedAt ?? latestSuccess.createdAt) : null, latestFailureAt: latestFailure ? iso(latestFailure.completedAt ?? latestFailure.createdAt) : null, latestRank: latestSuccess?.rankPosition === null || latestSuccess?.rankPosition === undefined ? null : Number(latestSuccess.rankPosition), latestCitationCount: latestSuccess ? Number(latestSuccess.citationCount ?? 0) : null, latestMentioned: latestSuccess ? latestSuccess.mentioned === true : null, trend: successRows.map((row) => ({ resultId: String(row.id), mentioned: row.mentioned === true, rankPosition: row.rankPosition === null || row.rankPosition === undefined ? null : Number(row.rankPosition), citationCount: Number(row.citationCount ?? 0), completedAt: iso(row.completedAt ?? row.createdAt) })) }; }

export async function loadMonitoringCenter(userId: string, projectId: string): Promise<MonitoringCenterResponse> {
  const project = requireProject(await monitoringAutomationRepository.projectForUser(userId, projectId));
  const [rows, schedule, recentHistory, notifications] = await Promise.all([monitoringAutomationRepository.resultRows(userId, projectId), monitoringAutomationRepository.schedule(userId, projectId), monitoringAutomationRepository.history(userId, projectId, { page: 1, pageSize: 8 }), monitoringAutomationRepository.notifications(userId, projectId, 30)]);
  const providers = AI_SEARCH_PROVIDER_TYPES.map((provider) => providerSummary(provider, rows));
  const allCheckDates = providers.flatMap((item) => item.latestCheckAt ? [new Date(item.latestCheckAt).getTime()] : []);
  const dropTypes = new Set<NotificationType>(["REAL_AI_VISIBILITY_DROP", "CITATION_DROP", "RANKING_DROP"]);
  const improvementTypes = new Set<NotificationType>(["REAL_AI_VISIBILITY_GAIN", "CITATION_INCREASE", "RANKING_IMPROVED"]);
  const recentDrops = notifications.filter((item) => dropTypes.has(item.type)).length;
  const recentImprovements = notifications.filter((item) => improvementTypes.has(item.type)).length;
  const pendingChanges = notifications.filter((item) => !item.isRead).length;
  const topAlert = [...notifications].sort((left, right) => levelRank(left.level) - levelRank(right.level) || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
  return { project: { id: String(project.id), name: String(project.name), domain: String(project.domain) }, providers, schedule, recentHistory: recentHistory.items, recentChanges: notifications.filter((item) => item.type !== "PROVIDER_FAILED").slice(0, 10), notifications: notifications.slice(0, 8), summary: { lastCheckAt: allCheckDates.length ? new Date(Math.max(...allCheckDates)).toISOString() : null, recentDrops, recentImprovements, pendingChanges, topAlert } };
}

export async function saveMonitoringSchedule(userId: string, projectId: string, input: { enabled: boolean; frequency: MonitoringFrequency; dailyTime: string; timezone: string }) { requireProject(await monitoringAutomationRepository.projectForUser(userId, projectId)); let nextRunAt: Date | null = null; try { nextRunAt = input.enabled ? calculateNextRunAt(input.frequency, input.dailyTime, input.timezone) : null; } catch (error) { throw new MonitoringAutomationError(error instanceof Error ? error.message : "INVALID_SCHEDULE", 400); } return requireProject(await monitoringAutomationRepository.saveSchedule(userId, projectId, { ...input, nextRunAt })); }
export async function loadMonitoringHistory(userId: string, projectId: string, input: { page: number; pageSize: number; provider?: AISearchProviderType; status?: MonitoringHistoryStatus; search?: string }) { requireProject(await monitoringAutomationRepository.projectForUser(userId, projectId)); return monitoringAutomationRepository.history(userId, projectId, input); }
export async function loadNotifications(userId: string, projectId: string) { requireProject(await monitoringAutomationRepository.projectForUser(userId, projectId)); return { projectId, notifications: await monitoringAutomationRepository.notifications(userId, projectId) }; }
export async function markNotificationsRead(userId: string, projectId: string, notificationId?: string) { requireProject(await monitoringAutomationRepository.projectForUser(userId, projectId)); return { updated: await monitoringAutomationRepository.markNotificationsRead(userId, projectId, notificationId) }; }

export async function recordMonitoringSuccess(userId: string, input: { projectId: string; provider: AISearchProviderType; resultId: string; startedAt: Date; endedAt: Date; durationMs: number }) {
  await monitoringAutomationRepository.recordHistory(userId, { projectId: input.projectId, provider: input.provider, status: "SUCCEEDED", startedAt: input.startedAt, endedAt: input.endedAt, successCount: 1, failedCount: 0, durationMs: input.durationMs, errorMessage: null, resultIds: [input.resultId] });
  const rounds = await monitoringAutomationRepository.successfulRounds(userId, input.projectId, input.provider, input.resultId);
  if (!rounds) return null;
  const detection = detectMonitoringChanges(rounds.current, rounds.previous);
  if (detection.status === "unavailable") return detection;
  for (const change of detection.changes) await monitoringAutomationRepository.persistEvent(userId, { projectId: input.projectId, provider: input.provider, currentResultId: rounds.current.id, previousResultId: rounds.previous?.id ?? null, type: change.type, direction: change.direction, level: change.severity, title: change.title, description: change.description, previousValue: change.previousValue, currentValue: change.currentValue, delta: change.delta, recommendation: recommendation(change.type) });
  return detection;
}

export async function recordMonitoringFailure(userId: string, input: { projectId: string; provider: AISearchProviderType; resultId: string; startedAt: Date; endedAt: Date; durationMs: number; errorCode: string }) {
  await monitoringAutomationRepository.recordHistory(userId, { projectId: input.projectId, provider: input.provider, status: "FAILED", startedAt: input.startedAt, endedAt: input.endedAt, successCount: 0, failedCount: 1, durationMs: input.durationMs, errorMessage: input.errorCode, resultIds: [input.resultId] });
  return monitoringAutomationRepository.persistEvent(userId, { projectId: input.projectId, provider: input.provider, currentResultId: input.resultId, previousResultId: null, type: "PROVIDER_FAILED", direction: "FAILURE", level: "MEDIUM", title: `${input.provider} 检测失败`, description: `真实 Provider 检测失败：${input.errorCode}`, previousValue: "available", currentValue: input.errorCode, delta: null });
}

function levelRank(level: "HIGH" | "MEDIUM" | "LOW") { return level === "HIGH" ? 1 : level === "MEDIUM" ? 2 : 3; }
function recommendation(type: NotificationType) { return type === "REAL_AI_VISIBILITY_DROP" ? "检查本轮查询与回答，补充客户证明、产品事实和第三方权威引用后重新检测。" : type === "CITATION_DROP" ? "核查引用页面是否仍可访问，并增加可验证的数据、作者和来源链接。" : type === "RANKING_DROP" ? "对比排名领先品牌的内容、实体和引用证据，优先修复差距后重新检测。" : "持续保留当前增长证据并观察后续真实检测。"; }
