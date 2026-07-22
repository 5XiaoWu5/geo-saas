import { generateGrowthActions } from "@/features/growth-actions/service";
import { generateGrowthAgentTasks } from "@/features/growth-agent/service";
import { generateGrowthReport } from "@/features/growth-reports/growth-report.service";
import { realAISearchDatabase } from "@/features/real-ai-search/database";
import { getRealAISearchMonitoring, testProviderConnection } from "@/features/real-ai-search";
import { automationRepository } from "./repository";
import { captureAutomationEvidence } from "./evidence";
import type { AutomationEvidenceSnapshot, AutomationMode, AutomationRunView, AutomationStepDefinition } from "./types";

export class AutomationError extends Error { constructor(public code: string, public status: number) { super(code); } }
const safeCode = (error: unknown) => { const value = error instanceof Error ? error.message : "AUTOMATION_STEP_FAILED"; return /^[A-Z0-9_:-]{3,160}$/.test(value) ? value.replaceAll(":", "_") : "AUTOMATION_STEP_FAILED"; };
async function requireOwned(userId: string, projectId: string) { if (!await automationRepository.projectOwned(userId, projectId)) throw new AutomationError("PROJECT_FORBIDDEN", 403); }

export function buildAutomationPlan(mode: AutomationMode, providers: string[]): AutomationStepDefinition[] {
  const steps: AutomationStepDefinition[] = [{ stepKey: "LOAD_EVIDENCE", stepType: "ANALYSIS", riskLevel: "SAFE", title: "读取当前项目证据", activityMessage: "正在读取 SEO、AI Search、Knowledge 与增长记录" }];
  if (mode !== "SAFE") steps.push(
    { stepKey: "GENERATE_ACTIONS", stepType: "GROWTH_ACTION", riskLevel: "INTERNAL_WRITE", title: "生成增长行动", activityMessage: "正在根据真实增长证据生成 Growth Action" },
    { stepKey: "SYNC_OPTIMIZATION", stepType: "OPTIMIZATION", riskLevel: "INTERNAL_WRITE", title: "同步优化任务", activityMessage: "正在把可执行行动同步到 Optimization Task" },
    { stepKey: "GENERATE_AGENT_TASKS", stepType: "GROWTH_AGENT", riskLevel: "INTERNAL_WRITE", title: "生成 Agent 执行计划", activityMessage: "正在生成执行步骤与验证计划" },
  );
  if (mode === "EXPERT") for (const provider of providers) steps.push({ stepKey: `TEST_PROVIDER_${provider}`, stepType: "PROVIDER_TEST", riskLevel: "EXTERNAL_COST", status: "AWAITING_APPROVAL", title: `测试 ${provider} 连接`, activityMessage: `等待批准向 ${provider} 发出 1 次真实请求`, inputEvidence: { provider, estimatedRequests: 1 }, approvalSummary: { provider, externalRequest: true, mayIncurCost: true, writesExternalSystem: false } });
  if (mode !== "SAFE") steps.push(
    { stepKey: "GENERATE_REPORT", stepType: "GROWTH_REPORT", riskLevel: "INTERNAL_WRITE", title: "固化增长报告", activityMessage: "正在创建不可变 Growth Report Snapshot" },
    { stepKey: "REFRESH_TIMELINE", stepType: "TIMELINE", riskLevel: "INTERNAL_WRITE", title: "记录增长时间线", activityMessage: "正在记录本次自动执行结果" },
  );
  steps.push({ stepKey: "CAPTURE_AFTER", stepType: "EVIDENCE", riskLevel: "SAFE", title: "验证执行结果", activityMessage: "正在重新读取真实数据并生成 Before / After" });
  return steps;
}

export function compareAutomationEvidence(before: AutomationEvidenceSnapshot, after: AutomationEvidenceSnapshot) {
  const metrics = Object.entries(before.metrics).map(([key, left]) => { const right = after.metrics[key as keyof typeof after.metrics]; const available = left.value !== null && right.value !== null; return { key, status: available ? "available" : "unavailable", before: left.value, after: right.value, delta: available ? right.value! - left.value! : null, beforeSourceId: left.sourceId, afterSourceId: right.sourceId, sourceType: right.sourceType }; });
  const records = Object.fromEntries(Object.entries(before.records).map(([key, value]) => [key, { before: value, after: after.records[key as keyof typeof after.records], created: after.records[key as keyof typeof after.records] - value }]));
  return { metrics, records, completedAt: after.capturedAt };
}

async function syncOptimization(userId: string, projectId: string) {
  const db = realAISearchDatabase(), now = new Date();
  const actions = await db.query('SELECT action.* FROM "GrowthAction" action INNER JOIN "Project" p ON p."id" = action."projectId" WHERE action."projectId" = $1 AND p."userId" = $2 AND action."optimizationTaskId" IS NULL', [projectId, userId]);
  const rows = [];
  for (const action of actions) { const inserted = (await db.query('INSERT INTO "OptimizationTask" ("id", "projectId", "issueId", "title", "description", "recommendation", "severity", "category", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $5, $6, $7, \'PENDING\', $8, $8) ON CONFLICT ("projectId", "issueId") DO NOTHING RETURNING *', [crypto.randomUUID(), projectId, `automation-action:${action.id}`, action.title, action.description, action.priority === "HIGH" ? "High" : action.priority === "LOW" ? "Low" : "Medium", String(action.category).toLowerCase(), now]))[0]; if (inserted) rows.push(inserted); }
  await db.query('UPDATE "GrowthAction" action SET "optimizationTaskId" = task."id" FROM "OptimizationTask" task, "Project" p WHERE action."projectId" = $1 AND action."projectId" = p."id" AND p."userId" = $2 AND action."optimizationTaskId" IS NULL AND task."projectId" = action."projectId" AND task."issueId" = \'automation-action:\' || action."id"', [projectId, userId]);
  return { createdCount: rows.length, taskIds: rows.map(row => String(row.id)) };
}

export async function previewAutomation(userId: string, projectId: string, mode: AutomationMode) {
  await requireOwned(userId, projectId);
  const before = await captureAutomationEvidence(userId, projectId);
  if (!before) throw new AutomationError("PROJECT_FORBIDDEN", 403);
  const monitoring = await getRealAISearchMonitoring(userId, projectId);
  const configured = monitoring.providers.filter(item => item.config.enabled && item.config.configured).map(item => item.provider);
  const run = await automationRepository.create(userId, projectId, mode, before, buildAutomationPlan(mode, configured));
  if (!run) throw new AutomationError("AUTOMATION_PREVIEW_FAILED", 500);
  return run;
}

export async function listAutomationRuns(userId: string, projectId: string) { await requireOwned(userId, projectId); return { projectId, runs: await automationRepository.list(userId, projectId) }; }
export async function getAutomationRun(userId: string, projectId: string, runId: string) { await requireOwned(userId, projectId); const run = await automationRepository.detail(userId, projectId, runId); if (!run) throw new AutomationError("AUTOMATION_RUN_NOT_FOUND", 404); return run; }
export async function startAutomation(userId: string, projectId: string, runId: string) { const run = await getAutomationRun(userId, projectId, runId); if (run.status !== "PREVIEW" && run.status !== "PAUSED") throw new AutomationError("INVALID_AUTOMATION_TRANSITION", 409); return automationRepository.setRunStatus(userId, projectId, runId, "RUNNING"); }

async function executeStep(userId: string, run: AutomationRunView, stepKey: string) {
  if (stepKey === "LOAD_EVIDENCE") { const snapshot = await captureAutomationEvidence(userId, run.projectId); if (!snapshot) throw new AutomationError("PROJECT_FORBIDDEN", 403); await automationRepository.updateBefore(userId, run.projectId, run.id, snapshot); return { status: "available", snapshotCapturedAt: snapshot.capturedAt }; }
  if (stepKey === "GENERATE_ACTIONS") { const result = await generateGrowthActions(userId, run.projectId); return { status: result.status, createdCount: result.createdCount, existingCount: result.existingCount, actionIds: result.actions.slice(0, 100).map(item => item.id) }; }
  if (stepKey === "SYNC_OPTIMIZATION") return syncOptimization(userId, run.projectId);
  if (stepKey === "GENERATE_AGENT_TASKS") { const result = await generateGrowthAgentTasks(userId, run.projectId, {}); return { status: result.status, createdCount: result.createdCount, taskIds: result.tasks.slice(0, 100).map(item => item.id) }; }
  if (stepKey === "GENERATE_REPORT") { const report = await generateGrowthReport(userId, run.projectId); return { status: report.status, reportId: report.id, version: report.version, dataVersion: report.dataVersion }; }
  if (stepKey === "REFRESH_TIMELINE") { const sourceId = `automation-run:${run.id}`; await realAISearchDatabase().query('INSERT INTO "GrowthSnapshot" ("id", "projectId", "eventType", "triggerType", "sourceId", "metadata", "createdAt") SELECT $1, p."id", \'OPTIMIZATION\'::"GrowthEventType", \'AUTO\'::"GrowthTriggerType", $3, $4::jsonb, $5 FROM "Project" p WHERE p."id" = $2 AND p."userId" = $6 ON CONFLICT ("projectId", "eventType", "sourceId") DO NOTHING', [crypto.randomUUID(), run.projectId, sourceId, JSON.stringify({ automationRunId: run.id, mode: run.mode, title: "Auto Mode execution" }), new Date(), userId]); return { status: "recorded", sourceId }; }
  if (stepKey === "CAPTURE_AFTER") { const snapshot = await captureAutomationEvidence(userId, run.projectId); if (!snapshot) throw new AutomationError("PROJECT_FORBIDDEN", 403); await automationRepository.updateAfter(userId, run.projectId, run.id, snapshot); return { status: "available", snapshotCapturedAt: snapshot.capturedAt }; }
  if (stepKey.startsWith("TEST_PROVIDER_")) { const provider = stepKey.slice("TEST_PROVIDER_".length) as "OPENAI" | "GEMINI" | "CLAUDE" | "PERPLEXITY"; return testProviderConnection(userId, run.projectId, provider); }
  throw new AutomationError("UNKNOWN_AUTOMATION_STEP", 500);
}

export async function executeNextAutomationStep(userId: string, projectId: string, runId: string) {
  const run = await getAutomationRun(userId, projectId, runId);
  if (run.status !== "RUNNING") throw new AutomationError("AUTOMATION_NOT_RUNNING", 409);
  const next = await automationRepository.nextOpen(userId, projectId, runId);
  if (!next) { const current = await getAutomationRun(userId, projectId, runId); const after = current.afterSnapshot ?? await captureAutomationEvidence(userId, projectId); if (!after) throw new AutomationError("PROJECT_FORBIDDEN", 403); if (!current.afterSnapshot) await automationRepository.updateAfter(userId, projectId, runId, after); return automationRepository.completeRun(userId, projectId, runId, compareAutomationEvidence(current.beforeSnapshot, after)); }
  if (next.status === "AWAITING_APPROVAL") return automationRepository.setRunStatus(userId, projectId, runId, "AWAITING_APPROVAL");
  const claimed = await automationRepository.claimStep(userId, projectId, runId, next.id);
  if (!claimed) throw new AutomationError("AUTOMATION_STEP_CONFLICT", 409);
  try { const output = await executeStep(userId, run, claimed.stepKey); return automationRepository.completeStep(userId, projectId, runId, claimed.id, output); }
  catch (error) { const code = safeCode(error); await automationRepository.failStep(userId, projectId, runId, claimed.id, code, code); throw error instanceof AutomationError ? error : new AutomationError(code, 500); }
}

export async function controlAutomation(userId: string, projectId: string, runId: string, action: "pause" | "resume" | "cancel") {
  const run = await getAutomationRun(userId, projectId, runId);
  if (action === "pause") { if (run.status !== "RUNNING") throw new AutomationError("INVALID_AUTOMATION_TRANSITION", 409); return automationRepository.setRunStatus(userId, projectId, runId, "PAUSED"); }
  if (action === "resume") { if (run.status !== "PAUSED") throw new AutomationError("INVALID_AUTOMATION_TRANSITION", 409); return automationRepository.setRunStatus(userId, projectId, runId, "RUNNING"); }
  if (!["PREVIEW", "RUNNING", "PAUSED", "AWAITING_APPROVAL"].includes(run.status)) throw new AutomationError("INVALID_AUTOMATION_TRANSITION", 409);
  await automationRepository.cancelPending(userId, projectId, runId); return automationRepository.setRunStatus(userId, projectId, runId, "CANCELLED");
}

export async function approveAutomationStep(userId: string, projectId: string, runId: string, stepId: string) { const run = await getAutomationRun(userId, projectId, runId); const step = run.steps.find(item => item.id === stepId); if (!step) throw new AutomationError("AUTOMATION_STEP_NOT_FOUND", 404); if (step.status !== "AWAITING_APPROVAL") throw new AutomationError("AUTOMATION_STEP_NOT_AWAITING_APPROVAL", 409); return automationRepository.approve(userId, projectId, runId, stepId); }
