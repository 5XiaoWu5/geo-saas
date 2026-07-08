import type { DraftGEOIssue, GEOIssueCategory, GEOIssueSeverity } from "@/features/geo-engine/audit/types/audit.types";
import type { WebsiteGEOResult } from "@/features/geo-engine/types/scan.types";

export type AuditIndustry = "all" | "travel" | "ecommerce" | "corporate";

export type AuditRule = {
  id: string;
  category: GEOIssueCategory;
  severity: GEOIssueSeverity;
  enabled: boolean;
  industry: AuditIndustry;
  evaluate: (projectId: string, result: WebsiteGEOResult) => DraftGEOIssue[];
};

const rules = new Map<string, AuditRule>();

export function registerRule(rule: AuditRule): void {
  rules.set(rule.id, rule);
}

export function unregisterRule(ruleId: string): void {
  rules.delete(ruleId);
}

export function executeRules(projectId: string, result: WebsiteGEOResult, industry: AuditIndustry = "all"): DraftGEOIssue[] {
  return [...rules.values()]
    .filter((rule) => rule.enabled && (rule.industry === "all" || rule.industry === industry))
    .flatMap((rule) => rule.evaluate(projectId, result));
}

export function getRegisteredRules(): AuditRule[] {
  return [...rules.values()];
}
