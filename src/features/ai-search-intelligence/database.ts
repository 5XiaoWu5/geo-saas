import { neon } from "@neondatabase/serverless";

export type AISearchDatabaseRow = Record<string, unknown>;
type QueryFunction = { query: (query: string, params?: unknown[]) => Promise<AISearchDatabaseRow[]> };
let client: QueryFunction | null = null;

export function aiSearchDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_UNAVAILABLE");
  client ??= neon(process.env.DATABASE_URL) as unknown as QueryFunction;
  return client;
}

export function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") { try { const parsed = JSON.parse(value) as unknown; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
  return [];
}

export function jsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") { try { const parsed = JSON.parse(value) as unknown; return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; } }
  return {};
}

export function nullableNumber(value: unknown) { if (value === null || typeof value === "undefined") return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
export function isoDate(value: unknown) { const date = value instanceof Date ? value : new Date(String(value)); return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString(); }
