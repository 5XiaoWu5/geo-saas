import type { QueryTemplate } from "@/features/query-generator/types";

export function toQueryTemplate(row: Record<string, unknown>): QueryTemplate {
  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
  const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : new Date(String(row.updatedAt));
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    content: String(row.content),
    category: String(row.category),
    intent: String(row.intent),
    priority: String(row.priority),
    status: String(row.status),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

