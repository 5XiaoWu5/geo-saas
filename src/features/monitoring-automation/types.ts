import type { AISearchProviderType } from "@/features/real-ai-search/types";

export const MONITORING_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export type MonitoringFrequency = (typeof MONITORING_FREQUENCIES)[number];
export type MonitoringHistoryStatus = "SUCCEEDED" | "FAILED" | "PARTIAL";
export type MonitoringScheduleStatus = "ACTIVE" | "PAUSED";
export type MonitoringChangeType = "REAL_AI_VISIBILITY_DROP" | "REAL_AI_VISIBILITY_GAIN" | "CITATION_DROP" | "CITATION_INCREASE" | "RANKING_DROP" | "RANKING_IMPROVED";
export type NotificationType = MonitoringChangeType | "PROVIDER_FAILED";
export type NotificationLevel = "HIGH" | "MEDIUM" | "LOW";

export type ComparisonRound = { id: string; provider: AISearchProviderType; mentioned: boolean; rankPosition: number | null; citationCount: number; completedAt: string };
export type MonitoringChange = { type: MonitoringChangeType; direction: "DROP" | "IMPROVEMENT"; severity: NotificationLevel; title: string; description: string; previousValue: number | boolean; currentValue: number | boolean; delta: number | null };
export type ChangeDetectionResult = { status: "available" | "unavailable"; previousResultId: string | null; currentResultId: string; changes: MonitoringChange[]; unavailableReason: string | null };

export type MonitoringScheduleView = { id: string | null; projectId: string; enabled: boolean; frequency: MonitoringFrequency; dailyTime: string; timezone: string; nextRunAt: string | null; lastRunAt: string | null; status: MonitoringScheduleStatus; createdAt: string | null; updatedAt: string | null };
export type MonitoringHistoryView = { id: string; projectId: string; provider: AISearchProviderType; status: MonitoringHistoryStatus; startedAt: string; endedAt: string | null; successCount: number; failedCount: number; durationMs: number | null; errorMessage: string | null; resultCount: number; resultIds: string[]; createdAt: string };
export type NotificationView = { id: string; projectId: string; optimizationTaskId: string | null; type: NotificationType; title: string; content: string; level: NotificationLevel; isRead: boolean; sourceKey: string; createdAt: string; updatedAt: string };

export type ProviderMonitoringSummary = { provider: AISearchProviderType; status: "available" | "unavailable"; latestCheckAt: string | null; latestSuccessAt: string | null; latestFailureAt: string | null; latestRank: number | null; latestCitationCount: number | null; latestMentioned: boolean | null; trend: Array<{ resultId: string; mentioned: boolean; rankPosition: number | null; citationCount: number; completedAt: string }> };
export type MonitoringCenterResponse = { project: { id: string; name: string; domain: string }; providers: ProviderMonitoringSummary[]; schedule: MonitoringScheduleView; recentHistory: MonitoringHistoryView[]; recentChanges: NotificationView[]; notifications: NotificationView[]; summary: { lastCheckAt: string | null; recentDrops: number; recentImprovements: number; pendingChanges: number; topAlert: NotificationView | null } };
export type MonitoringHistoryResponse = { projectId: string; page: number; pageSize: number; total: number; totalPages: number; items: MonitoringHistoryView[] };
