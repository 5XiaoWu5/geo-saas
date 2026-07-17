import type { EntityAttribute, EntityProfile } from "@/features/entity/types";

function toIsoDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).map((item) => item.trim()).filter(Boolean);
}

export function toEntityProfile(row: Record<string, unknown>): EntityProfile {
  return {
    id: String(row.id),
    projectId: String(row.projectId),
    brandName: String(row.brandName ?? ""),
    industry: String(row.industry ?? ""),
    region: String(row.region ?? ""),
    description: String(row.description ?? ""),
    services: toStringArray(row.services),
    products: toStringArray(row.products),
    advantages: toStringArray(row.advantages),
    createdAt: toIsoDate(row.createdAt),
    updatedAt: toIsoDate(row.updatedAt),
  };
}

export function toEntityAttribute(row: Record<string, unknown>): EntityAttribute {
  return {
    id: String(row.id),
    entityId: String(row.entityId),
    key: String(row.key ?? ""),
    value: String(row.value ?? ""),
    source: String(row.source ?? "user"),
    createdAt: toIsoDate(row.createdAt),
  };
}
