import { HtmlGrowthReportExporter } from "./html-report-exporter";
import { buildGrowthReportSnapshot, failedGrowthReportSnapshot } from "./growth-report-generator";
import { growthReportRepository } from "./repository";
import type { GrowthReportDetail } from "./types";

export class GrowthReportError extends Error { constructor(public code: string, public status: number) { super(code); } }
function forbidden<T>(value: T | null): T { if (!value) throw new GrowthReportError("PROJECT_FORBIDDEN", 403); return value; }
function safeFailure(error: unknown) { const value = error instanceof Error ? error.message : "REPORT_GENERATION_FAILED"; return /^[A-Z0-9_:-]{3,160}$/.test(value) ? value : "REPORT_GENERATION_FAILED"; }

export async function generateGrowthReport(userId: string, projectId: string) {
  const project = forbidden(await growthReportRepository.projectForUser(userId, projectId));
  const processing = await growthReportRepository.createProcessing(userId, projectId);
  const generatedAt = new Date().toISOString();
  try {
    const evidence = forbidden(await growthReportRepository.loadEvidence(userId, projectId));
    const snapshot = buildGrowthReportSnapshot({ evidence, reportId: String(processing.id), version: Number(processing.version), generatedBy: userId, generatedAt });
    const completed = await growthReportRepository.complete(userId, String(processing.id), snapshot.reportMeta.dataVersion, snapshot);
    if (!completed) throw new Error("REPORT_TERMINAL_STATE_CONFLICT");
    return { id: String(completed.id), projectId, version: Number(completed.version), status: "COMPLETED" as const, dataVersion: snapshot.reportMeta.dataVersion, createdAt: new Date(completed.createdAt as string | Date).toISOString() };
  } catch (error) {
    const reason = safeFailure(error);
    const failed = failedGrowthReportSnapshot({ projectId, projectName: String(project.name), domain: String(project.domain), version: Number(processing.version), generatedBy: userId, generatedAt, dataVersion: String(processing.dataVersion), reason });
    await growthReportRepository.fail(userId, String(processing.id), failed);
    throw new GrowthReportError(reason, 500);
  }
}

export async function listGrowthReports(userId: string, projectId: string) { forbidden(await growthReportRepository.projectForUser(userId, projectId)); return { projectId, reports: await growthReportRepository.list(userId, projectId) }; }
export async function getGrowthReport(userId: string, projectId: string, reportId: string): Promise<GrowthReportDetail> { forbidden(await growthReportRepository.projectForUser(userId, projectId)); const report = forbidden(await growthReportRepository.detail(userId, projectId, reportId)); const htmlPreview = await new HtmlGrowthReportExporter().export(report.snapshot); return { ...report, htmlPreview }; }
