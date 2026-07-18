import { neon } from "@neondatabase/serverless";

export type KnowledgeDatabaseRow = Record<string, unknown>;

type QueryFunction = {
  query: (query: string, params?: unknown[]) => Promise<KnowledgeDatabaseRow[]>;
};

let queryClient: QueryFunction | null = null;

export function knowledgeDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_UNAVAILABLE");
  queryClient ??= neon(process.env.DATABASE_URL) as unknown as QueryFunction;
  return queryClient;
}

export function isoDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

export function nullableNumber(value: unknown) {
  if (value === null || typeof value === "undefined") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function jsonArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function jsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function jsonValueArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
