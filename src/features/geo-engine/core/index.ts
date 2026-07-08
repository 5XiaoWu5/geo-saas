export type { GEOIssue, GEOIssueCategory, GEOIssueEvidence, GEOIssueSeverity, AuditOptimizationTask } from "@/features/geo-engine/audit/types/audit.types";
export type { GEOIssueLifecycle, IssueStatus } from "@/features/geo-engine/audit/types/issue-lifecycle.types";
export { analyzeAuditIssues, getIssueHistory, getOpenIssues, getOptimizationTasksFromIssues, getProjectIssues, updateIssueStatus } from "@/features/geo-engine/audit/services/audit.service";
export type { GeoScan, GeoScanResult, GeoScanStatus, GEOAnalysisResult, NormalizedPageSnapshot, PageSnapshot, RawHtmlSnapshot, ScanProgress, WebsiteGEOResult } from "@/features/geo-engine/types/scan.types";
export { createScan, getLatestScanResult, getScanProgress, getScanResult, getScanStatus, startScan } from "@/features/geo-engine/services/scan.service";

