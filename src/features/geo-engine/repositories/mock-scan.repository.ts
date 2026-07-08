import type { ScanRepository } from "@/features/geo-engine/repositories/scan.repository";
import type { GeoScan, GeoScanResult } from "@/features/geo-engine/types/scan.types";

const scans = new Map<string, GeoScan>();
const results = new Map<string, GeoScanResult>();

export class MockScanRepository implements ScanRepository {
  async createScan(input: Pick<GeoScan, "workspaceId" | "projectId" | "url">): Promise<GeoScan> {
    const scan: GeoScan = { id: `scan_${Date.now()}`, workspaceId: input.workspaceId, projectId: input.projectId, url: input.url, status: "pending", progress: 0, totalPages: 0, completedPages: 0, currentPage: null, startedAt: null, completedAt: null };
    scans.set(scan.id, scan);
    return scan;
  }

  async updateScan(scan: GeoScan): Promise<GeoScan> {
    scans.set(scan.id, scan);
    return scan;
  }

  async saveScanResult(result: GeoScanResult): Promise<GeoScanResult> {
    results.set(result.scan.id, result);
    return result;
  }

  async getScan(scanId: string): Promise<GeoScan | null> {
    return scans.get(scanId) ?? null;
  }

  async getLatestScan(projectId: string): Promise<GeoScan | null> {
    return [...scans.values()].filter((scan) => scan.projectId === projectId).toSorted((left, right) => (right.startedAt ?? "").localeCompare(left.startedAt ?? ""))[0] ?? null;
  }

  async getScanResult(scanId: string): Promise<GeoScanResult | null> {
    return results.get(scanId) ?? null;
  }

  async getLatestScanResult(projectId: string): Promise<GeoScanResult | null> {
    const latestScan = await this.getLatestScan(projectId);
    return latestScan ? this.getScanResult(latestScan.id) : null;
  }
}

