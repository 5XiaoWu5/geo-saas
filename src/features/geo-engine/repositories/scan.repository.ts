import type { GeoScan, GeoScanResult } from "@/features/geo-engine/types/scan.types";

export interface ScanRepository {
  createScan(input: Pick<GeoScan, "workspaceId" | "projectId" | "url">): Promise<GeoScan>;
  updateScan(scan: GeoScan): Promise<GeoScan>;
  saveScanResult(result: GeoScanResult): Promise<GeoScanResult>;
  getScan(scanId: string): Promise<GeoScan | null>;
  getLatestScan(projectId: string): Promise<GeoScan | null>;
  getScanResult(scanId: string): Promise<GeoScanResult | null>;
  getLatestScanResult(projectId: string): Promise<GeoScanResult | null>;
}
