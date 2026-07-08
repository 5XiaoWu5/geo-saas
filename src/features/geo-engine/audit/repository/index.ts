import { MockAuditRepository } from "@/features/geo-engine/audit/repository/mock-audit.repository";
import type { AuditRepository } from "@/features/geo-engine/audit/repository/audit.repository";

let auditRepository: AuditRepository | null = null;

export function getAuditRepository(): AuditRepository {
  auditRepository ??= new MockAuditRepository();
  return auditRepository;
}
