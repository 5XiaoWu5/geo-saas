import { MockScanRepository } from "@/features/geo-engine/repositories/mock-scan.repository";
import type { ScanRepository } from "@/features/geo-engine/repositories/scan.repository";

let scanRepository: ScanRepository | null = null;

export function getScanRepository(): ScanRepository {
  scanRepository ??= new MockScanRepository();
  return scanRepository;
}

export type { ScanRepository } from "@/features/geo-engine/repositories/scan.repository";
