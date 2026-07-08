import { analyzeAuditIssues } from "@/features/geo-engine/audit/services/audit.service";
import { analyzePageSnapshots } from "@/features/geo-engine/analyzer/geo-analyzer.service";
import { addUrlTasks, getNextTask, getQueueTasks, updateTaskStatus } from "@/features/geo-engine/crawler/queue/crawl.queue.service";
import { extractLinks, fetchRawHtml, normalizeSnapshot } from "@/features/geo-engine/crawler/crawler.service";
import { getScanRepository } from "@/features/geo-engine/repositories";
import type { GeoScan, GeoScanResult, NormalizedPageSnapshot, ScanProgress } from "@/features/geo-engine/types/scan.types";

const MAX_PAGES = 50;

export async function createScan(input: Pick<GeoScan, "workspaceId" | "projectId" | "url">): Promise<GeoScan> {
  return getScanRepository().createScan(input);
}

export async function startScan(scanId: string): Promise<GeoScanResult> {
  const repository = getScanRepository();
  const scan = await repository.getScan(scanId);

  if (!scan) {
    throw new Error(`Scan ${scanId} not found`);
  }

  let workingScan = await repository.updateScan({ ...scan, status: "running", startedAt: new Date().toISOString(), progress: 5, totalPages: 1, completedPages: 0, currentPage: scan.url });
  await addUrlTasks(scanId, [scan.url]);

  const snapshots: NormalizedPageSnapshot[] = [];
  const seenUrls = new Set<string>();

  while (snapshots.length < MAX_PAGES) {
    const task = await getNextTask(scanId);
    if (!task) break;

    await updateTaskStatus(scanId, task.id, "processing");
    workingScan = await repository.updateScan({ ...workingScan, currentPage: new URL(task.url).pathname || "/" });

    const raw = await fetchRawHtml(task.url);
    const snapshot = normalizeSnapshot(raw);
    snapshots.push(snapshot);
    seenUrls.add(task.url);

    const discoveredUrls = extractLinks(raw, MAX_PAGES).filter((url) => !seenUrls.has(url));
    const queuedCount = (await getQueueTasks(scanId)).length;
    await addUrlTasks(scanId, discoveredUrls.slice(0, Math.max(0, MAX_PAGES - queuedCount)));
    await updateTaskStatus(scanId, task.id, "completed");

    const totalPages = Math.min(MAX_PAGES, Math.max((await getQueueTasks(scanId)).length, snapshots.length));
    const progress = Math.min(95, Math.round((snapshots.length / totalPages) * 90));
    workingScan = await repository.updateScan({ ...workingScan, totalPages, completedPages: snapshots.length, progress });
  }

  const analysis = await analyzePageSnapshots(scanId, snapshots, scan.projectId);
  await analyzeAuditIssues(scan.projectId, analysis);
  const completedScan = await repository.updateScan({ ...workingScan, status: "completed", progress: 100, completedPages: snapshots.length, totalPages: snapshots.length, currentPage: null, completedAt: new Date().toISOString() });

  return repository.saveScanResult({ scan: completedScan, analysis });
}

export async function getScanStatus(scanId: string): Promise<GeoScan | null> {
  return getScanRepository().getScan(scanId);
}

export async function getScanProgress(scanId: string): Promise<ScanProgress | null> {
  const scan = await getScanStatus(scanId);
  if (!scan) return null;
  return { status: scan.status, percentage: scan.progress, currentPage: scan.currentPage, completedPages: scan.completedPages, totalPages: scan.totalPages };
}

export async function getScanResult(scanId: string): Promise<GeoScanResult | null> {
  return getScanRepository().getScanResult(scanId);
}

export async function getLatestScanResult(projectId: string): Promise<GeoScanResult | null> {
  return getScanRepository().getLatestScanResult(projectId);
}


