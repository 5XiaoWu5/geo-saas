import type { GrowthReportSnapshot, SnapshotModule } from "./types";
import type { ReportExporter } from "./report-exporter";

export function escapeHtml(value: unknown) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function moduleSection(title: string, module: SnapshotModule) { const content = module.status === "unavailable" ? "unavailable" : `<pre>${escapeHtml(JSON.stringify(module.data ?? {}, null, 2))}</pre>`; return `<section><h2>${escapeHtml(title)}</h2><p><strong>Evidence:</strong> ${escapeHtml(module.evidenceStatus)}</p>${content}</section>`; }

export class HtmlGrowthReportExporter implements ReportExporter {
  readonly format = "HTML" as const;
  async export(snapshot: GrowthReportSnapshot) {
    const summary = snapshot.reportMeta.executiveSummary;
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(snapshot.reportMeta.projectName)} Growth Report v${snapshot.reportMeta.version}</title><style>body{font-family:system-ui,sans-serif;max-width:960px;margin:auto;padding:32px;color:#172033}header,section{border:1px solid #dbe3ee;border-radius:16px;padding:20px;margin:0 0 16px}h1,h2{margin-top:0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f7fb;padding:16px;border-radius:12px}li{margin:8px 0}.meta{color:#5f6b7a;font-size:13px}</style></head><body><header><p class="meta">${escapeHtml(snapshot.reportMeta.dataVersion)} · ${escapeHtml(snapshot.reportMeta.generatedAt)}</p><h1>${escapeHtml(snapshot.reportMeta.projectName)} AI 增长报告 v${snapshot.reportMeta.version}</h1><h2>管理层摘要</h2><ul>${[...summary.currentState, ...summary.priorities].map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>unavailable</li>"}</ul></header>${moduleSection("SEO 增长状态", snapshot.seoSnapshot)}${moduleSection("GEO AI 搜索状态", snapshot.geoSnapshot)}${moduleSection("AI 推荐表现", snapshot.aiSearchSnapshot)}${moduleSection("知识资产完整度", snapshot.knowledgeSnapshot)}${moduleSection("竞品差距", snapshot.competitorSnapshot)}${moduleSection("优化与增长机会", snapshot.optimizationSnapshot)}${moduleSection("Insight Center", snapshot.insightSnapshot)}${moduleSection("执行路线图", snapshot.roadmapSnapshot)}</body></html>`;
  }
}
