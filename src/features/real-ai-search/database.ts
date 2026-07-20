import { neon } from "@neondatabase/serverless";
export type Row = Record<string, unknown>;
type Client = { query: (sql: string, params?: unknown[]) => Promise<Row[]> };
let client: Client | null = null;
export function realAISearchDatabase() { if (!process.env.DATABASE_URL) throw new Error("DATABASE_UNAVAILABLE"); client ??= neon(process.env.DATABASE_URL) as unknown as Client; return client; }
export function iso(value: unknown) { const date = value instanceof Date ? value : new Date(String(value)); return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString(); }
export function jsonArray(value: unknown): unknown[] { if (Array.isArray(value)) return value; if (typeof value === "string") { try { const parsed = JSON.parse(value) as unknown; return Array.isArray(parsed) ? parsed : []; } catch { return []; } } return []; }
