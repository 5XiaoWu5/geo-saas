import type { QueryTemplate } from "@/features/query-generator/types";

export function getCampaignKeyword(template: Pick<QueryTemplate, "category" | "intent">) {
  return `${template.category} · ${template.intent}`;
}
