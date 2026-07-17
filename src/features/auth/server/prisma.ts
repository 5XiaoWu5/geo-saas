import { neon } from "@neondatabase/serverless";

type Where = Record<string, unknown>;
type Data = Record<string, unknown>;

type QueryFunction = {
  query: (query: string, params?: unknown[]) => Promise<unknown[]>;
};

type AuthRow = Record<string, unknown> & {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  image: string | null;
  passwordHash: string | null;
  userId: string;
  token?: string;
  expiresAt: Date;
  usedAt?: Date | null;
  user: AuthRow;
};

type ProjectRow = Record<string, unknown> & {
  id: string;
  userId: string | null;
  name: string;
  domain: string;
  language: string;
  country: string;
  industry: string;
  description: string;
  status: string;
  reportsCount: number;
  geoScore: number;
  visibilityScore: number;
  lastAnalysisAt: Date | null;
  lastScan: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type WebsiteScanRow = Record<string, unknown> & {
  id: string;
  projectId: string;
  url: string;
  status: string;
  title: string | null;
  description: string | null;
  h1Count: number;
  h2Count: number;
  internalLinkCount: number;
  externalLinkCount: number;
  schemaCount: number;
  schemaTypes: string[];
  robotsExists: boolean;
  sitemapExists: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type GeoAnalysisRow = Record<string, unknown> & {
  id: string;
  projectId: string;
  scanId: string;
  totalScore: number;
  entityScore: number;
  schemaScore: number;
  technicalScore: number;
  contentScore: number;
  issues: unknown;
  createdAt: Date;
};

type OptimizationTaskRow = Record<string, unknown> & {
  id: string;
  projectId: string;
  issueId: string;
  title: string;
  description: string;
  recommendation: string;
  severity: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type VisibilityCampaignRow = Record<string, unknown> & {
  id: string;
  projectId: string;
  keyword: string;
  createdAt: Date;
};

type VisibilityPromptRow = Record<string, unknown> & {
  id: string;
  campaignId: string;
  prompt: string;
  createdAt: Date;
};

type VisibilityCheckRow = Record<string, unknown> & {
  id: string;
  campaignId: string;
  promptId: string | null;
  provider: string;
  prompt: string;
  answer: string;
  brandMentioned: boolean;
  mentionPosition: number | null;
  position?: number | null;
  sourceUrls: string[];
  score: number;
  createdAt: Date;
};

const fallbackDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:5432/geopilot_ai";

if (!process.env.DATABASE_URL) {
  console.error("[AUTH DATABASE] DATABASE_URL is not configured. Cloudflare Pages production auth cannot query users or sessions without a PostgreSQL connection string.");
}

function getSql(): QueryFunction {
  return neon(process.env.DATABASE_URL ?? fallbackDatabaseUrl) as unknown as QueryFunction;
}

async function query(sqlText: string, params: unknown[] = []): Promise<AuthRow[]> {
  const sql = getSql();
  return (await sql.query(sqlText, params)) as AuthRow[];
}

async function projectQuery(sqlText: string, params: unknown[] = []): Promise<ProjectRow[]> {
  const sql = getSql();
  return (await sql.query(sqlText, params)) as ProjectRow[];
}

async function websiteScanQuery(sqlText: string, params: unknown[] = []): Promise<WebsiteScanRow[]> {
  const sql = getSql();
  return (await sql.query(sqlText, params)) as WebsiteScanRow[];
}

async function geoAnalysisQuery(sqlText: string, params: unknown[] = []): Promise<GeoAnalysisRow[]> {
  const sql = getSql();
  return (await sql.query(sqlText, params)) as GeoAnalysisRow[];
}

async function optimizationTaskQuery(sqlText: string, params: unknown[] = []): Promise<OptimizationTaskRow[]> {
  const sql = getSql();
  return (await sql.query(sqlText, params)) as OptimizationTaskRow[];
}

async function visibilityCampaignQuery(sqlText: string, params: unknown[] = []): Promise<VisibilityCampaignRow[]> {
  const sql = getSql();
  return (await sql.query(sqlText, params)) as VisibilityCampaignRow[];
}

async function visibilityPromptQuery(sqlText: string, params: unknown[] = []): Promise<VisibilityPromptRow[]> {
  const sql = getSql();
  return (await sql.query(sqlText, params)) as VisibilityPromptRow[];
}

async function visibilityCheckQuery(sqlText: string, params: unknown[] = []): Promise<VisibilityCheckRow[]> {
  const sql = getSql();
  return (await sql.query(sqlText, params)) as VisibilityCheckRow[];
}

function createId() {
  return crypto.randomUUID();
}

function normalizeRow<T extends AuthRow | null>(row: T): T {
  if (!row) return row;
  for (const key of ["createdAt", "updatedAt", "expiresAt", "usedAt", "accessTokenExpiresAt", "refreshTokenExpiresAt"]) {
    if (row[key] && !(row[key] instanceof Date)) row[key] = new Date(row[key] as string);
  }
  return row;
}

function normalizeProjectRow<T extends ProjectRow | null>(row: T): T {
  if (!row) return row;
  for (const key of ["createdAt", "updatedAt", "lastAnalysisAt", "lastScan"]) {
    if (row[key] && !(row[key] instanceof Date)) row[key] = new Date(row[key] as string);
  }
  return row;
}

function normalizeWebsiteScanRow<T extends WebsiteScanRow | null>(row: T): T {
  if (!row) return row;
  for (const key of ["createdAt", "updatedAt"]) {
    if (row[key] && !(row[key] instanceof Date)) row[key] = new Date(row[key] as string);
  }
  if (!Array.isArray(row.schemaTypes)) row.schemaTypes = [];
  return row;
}

function normalizeGeoAnalysisRow<T extends GeoAnalysisRow | null>(row: T): T {
  if (!row) return row;
  if (row.createdAt && !(row.createdAt instanceof Date)) row.createdAt = new Date(row.createdAt as string);
  if (typeof row.issues === "string") {
    try {
      row.issues = JSON.parse(row.issues);
    } catch {
      row.issues = [];
    }
  }
  if (!Array.isArray(row.issues)) row.issues = [];
  return row;
}

function normalizeOptimizationTaskRow<T extends OptimizationTaskRow | null>(row: T): T {
  if (!row) return row;
  for (const key of ["createdAt", "updatedAt"]) {
    if (row[key] && !(row[key] instanceof Date)) row[key] = new Date(row[key] as string);
  }
  return row;
}

function normalizeVisibilityCampaignRow<T extends VisibilityCampaignRow | null>(row: T): T {
  if (!row) return row;
  if (row.createdAt && !(row.createdAt instanceof Date)) row.createdAt = new Date(row.createdAt as string);
  return row;
}

function normalizeVisibilityPromptRow<T extends VisibilityPromptRow | null>(row: T): T {
  if (!row) return row;
  if (row.createdAt && !(row.createdAt instanceof Date)) row.createdAt = new Date(row.createdAt as string);
  return row;
}

function normalizeVisibilityCheckRow<T extends VisibilityCheckRow | null>(row: T): T {
  if (!row) return row;
  if (row.createdAt && !(row.createdAt instanceof Date)) row.createdAt = new Date(row.createdAt as string);
  if (!Array.isArray(row.sourceUrls)) row.sourceUrls = [];
  return row;
}

let projectSchemaReady = false;
let websiteScanSchemaReady = false;
let geoAnalysisSchemaReady = false;
let optimizationTaskSchemaReady = false;
let visibilitySchemaReady = false;

async function ensureProjectSchema() {
  if (projectSchemaReady) return;
  await projectQuery('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "userId" TEXT');
  await projectQuery('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT \'English\'');
  await projectQuery('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT \'United States\'');
  await projectQuery('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "industry" TEXT NOT NULL DEFAULT \'SaaS\'');
  await projectQuery('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT \'\'');
  await projectQuery('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "reportsCount" INTEGER NOT NULL DEFAULT 0');
  await projectQuery('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "geoScore" INTEGER NOT NULL DEFAULT 0');
  await projectQuery('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "visibilityScore" INTEGER NOT NULL DEFAULT 0');
  await projectQuery('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "lastAnalysisAt" TIMESTAMP(3)');
  await projectQuery('ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "lastScan" TIMESTAMP(3)');
  await projectQuery('CREATE INDEX IF NOT EXISTS "Project_userId_idx" ON "Project"("userId")');
  projectSchemaReady = true;
}

async function ensureWebsiteScanSchema() {
  if (websiteScanSchemaReady) return;
  await ensureProjectSchema();
  await websiteScanQuery('CREATE TABLE IF NOT EXISTS "WebsiteScan" ("id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "url" TEXT NOT NULL, "status" TEXT NOT NULL, "title" TEXT, "description" TEXT, "h1Count" INTEGER NOT NULL DEFAULT 0, "h2Count" INTEGER NOT NULL DEFAULT 0, "internalLinkCount" INTEGER NOT NULL DEFAULT 0, "externalLinkCount" INTEGER NOT NULL DEFAULT 0, "schemaCount" INTEGER NOT NULL DEFAULT 0, "schemaTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "robotsExists" BOOLEAN NOT NULL DEFAULT false, "sitemapExists" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW())');
  await websiteScanQuery('ALTER TABLE "WebsiteScan" ADD COLUMN IF NOT EXISTS "schemaTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]');
  await websiteScanQuery('CREATE INDEX IF NOT EXISTS "WebsiteScan_projectId_idx" ON "WebsiteScan"("projectId")');
  websiteScanSchemaReady = true;
}

async function ensureGeoAnalysisSchema() {
  if (geoAnalysisSchemaReady) return;
  await ensureWebsiteScanSchema();
  await geoAnalysisQuery(`CREATE TABLE IF NOT EXISTS "GeoAnalysis" ("id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "scanId" TEXT NOT NULL UNIQUE, "totalScore" INTEGER NOT NULL, "entityScore" INTEGER NOT NULL, "schemaScore" INTEGER NOT NULL, "technicalScore" INTEGER NOT NULL, "contentScore" INTEGER NOT NULL, "issues" JSONB NOT NULL DEFAULT '[]'::jsonb, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW())`);
  await geoAnalysisQuery('CREATE INDEX IF NOT EXISTS "GeoAnalysis_projectId_idx" ON "GeoAnalysis"("projectId")');
  await geoAnalysisQuery('CREATE INDEX IF NOT EXISTS "GeoAnalysis_scanId_idx" ON "GeoAnalysis"("scanId")');
  geoAnalysisSchemaReady = true;
}

async function ensureOptimizationTaskSchema() {
  if (optimizationTaskSchemaReady) return;
  await ensureProjectSchema();
  await optimizationTaskQuery('CREATE TABLE IF NOT EXISTS "OptimizationTask" ("id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "issueId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL DEFAULT \'\', "recommendation" TEXT NOT NULL DEFAULT \'\', "severity" TEXT NOT NULL DEFAULT \'Medium\', "category" TEXT NOT NULL DEFAULT \'\', "status" TEXT NOT NULL DEFAULT \'PENDING\', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW())');
  await optimizationTaskQuery('CREATE INDEX IF NOT EXISTS "OptimizationTask_projectId_idx" ON "OptimizationTask"("projectId")');
  await optimizationTaskQuery('CREATE UNIQUE INDEX IF NOT EXISTS "OptimizationTask_projectId_issueId_key" ON "OptimizationTask"("projectId", "issueId")');
  optimizationTaskSchemaReady = true;
}

async function ensureVisibilitySchema() {
  if (visibilitySchemaReady) return;
  await ensureProjectSchema();
  await visibilityCampaignQuery('CREATE TABLE IF NOT EXISTS "VisibilityCampaign" ("id" TEXT PRIMARY KEY, "projectId" TEXT NOT NULL, "keyword" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW())');
  await visibilityCampaignQuery('CREATE INDEX IF NOT EXISTS "VisibilityCampaign_projectId_idx" ON "VisibilityCampaign"("projectId")');
  await visibilityPromptQuery('CREATE TABLE IF NOT EXISTS "VisibilityPrompt" ("id" TEXT PRIMARY KEY, "campaignId" TEXT NOT NULL, "prompt" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW())');
  await visibilityPromptQuery('CREATE INDEX IF NOT EXISTS "VisibilityPrompt_campaignId_idx" ON "VisibilityPrompt"("campaignId")');
  await visibilityCheckQuery('CREATE TABLE IF NOT EXISTS "VisibilityCheck" ("id" TEXT PRIMARY KEY, "campaignId" TEXT NOT NULL, "promptId" TEXT, "provider" TEXT NOT NULL, "prompt" TEXT NOT NULL, "answer" TEXT NOT NULL, "brandMentioned" BOOLEAN NOT NULL DEFAULT false, "mentionPosition" INTEGER, "sourceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "score" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW())');
  await visibilityCheckQuery('ALTER TABLE "VisibilityCheck" ADD COLUMN IF NOT EXISTS "promptId" TEXT');
  await visibilityCheckQuery('ALTER TABLE "VisibilityCheck" ADD COLUMN IF NOT EXISTS "mentionPosition" INTEGER');
  await visibilityCheckQuery('ALTER TABLE "VisibilityCheck" ADD COLUMN IF NOT EXISTS "sourceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]');
  await visibilityCheckQuery('DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = \'VisibilityCheck\' AND column_name = \'position\') THEN UPDATE "VisibilityCheck" SET "mentionPosition" = "position" WHERE "mentionPosition" IS NULL; END IF; END $$;');
  await visibilityCheckQuery('CREATE INDEX IF NOT EXISTS "VisibilityCheck_campaignId_idx" ON "VisibilityCheck"("campaignId")');
  await visibilityCheckQuery('CREATE INDEX IF NOT EXISTS "VisibilityCheck_promptId_idx" ON "VisibilityCheck"("promptId")');
  visibilitySchemaReady = true;
}

function assignments(data: Data, start = 1) {
  const keys = Object.keys(data);
  return {
    sql: keys.map((key, index) => `"${key}" = $${index + start}`).join(", "),
    values: keys.map((key) => data[key]),
  };
}

export const prisma = {
  user: {
    async findUnique({ where }: { where: Where }) {
      if (where.email) return normalizeRow((await query('SELECT * FROM "User" WHERE "email" = $1 LIMIT 1', [where.email]))[0] ?? null);
      if (where.id) return normalizeRow((await query('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [where.id]))[0] ?? null);
      return null;
    },
    async create({ data }: { data: Data }) {
      const now = new Date();
      const row = { id: data.id ?? createId(), email: data.email, name: data.name ?? null, role: data.role ?? "admin", emailVerified: data.emailVerified ?? false, image: data.image ?? null, passwordHash: data.passwordHash ?? null, createdAt: now, updatedAt: now };
      return normalizeRow((await query('INSERT INTO "User" ("id", "email", "name", "role", "emailVerified", "image", "passwordHash", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [row.id, row.email, row.name, row.role, row.emailVerified, row.image, row.passwordHash, row.createdAt, row.updatedAt]))[0]);
    },
    async update({ where, data }: { where: Where; data: Data }) {
      const set = assignments({ ...data, updatedAt: new Date() });
      const whereKey = where.email ? "email" : "id";
      const whereValue = where.email ?? where.id;
      return normalizeRow((await query(`UPDATE "User" SET ${set.sql} WHERE "${whereKey}" = $${set.values.length + 1} RETURNING *`, [...set.values, whereValue]))[0] ?? null);
    },
  },
  session: {
    async create({ data }: { data: Data }) {
      return normalizeRow((await query('INSERT INTO "Session" ("id", "token", "userId", "expiresAt", "ipAddress", "userAgent", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [data.id ?? createId(), data.token, data.userId, data.expiresAt, data.ipAddress ?? null, data.userAgent ?? null, new Date(), new Date()]))[0]);
    },
    async findUnique({ where, include }: { where: Where; include?: { user?: boolean } }) {
      const session = normalizeRow((await query('SELECT * FROM "Session" WHERE "token" = $1 LIMIT 1', [where.token]))[0] ?? null);
      if (session && include?.user) session.user = normalizeRow((await query('SELECT * FROM "User" WHERE "id" = $1 LIMIT 1', [session.userId]))[0] ?? null);
      return session;
    },
    async delete({ where }: { where: Where }) {
      if (where.id) return normalizeRow((await query('DELETE FROM "Session" WHERE "id" = $1 RETURNING *', [where.id]))[0] ?? null);
      if (where.token) return normalizeRow((await query('DELETE FROM "Session" WHERE "token" = $1 RETURNING *', [where.token]))[0] ?? null);
      return null;
    },
    async deleteMany({ where }: { where: Where }) {
      if (where.token) return { count: (await query('DELETE FROM "Session" WHERE "token" = $1 RETURNING "id"', [where.token])).length };
      if (where.userId) return { count: (await query('DELETE FROM "Session" WHERE "userId" = $1 RETURNING "id"', [where.userId])).length };
      return { count: 0 };
    },
  },
  verification: {
    async create({ data }: { data: Data }) {
      return normalizeRow((await query('INSERT INTO "Verification" ("id", "identifier", "value", "expiresAt", "userId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [data.id ?? createId(), data.identifier, data.value, data.expiresAt, data.userId ?? null, new Date(), new Date()]))[0]);
    },
    async findFirst({ where }: { where: { identifier?: string; value?: string; expiresAt?: { gt?: Date } }; orderBy?: Record<string, unknown> }) {
      return normalizeRow((await query('SELECT * FROM "Verification" WHERE "identifier" = $1 AND "value" = $2 AND "expiresAt" > $3 ORDER BY "createdAt" DESC LIMIT 1', [where.identifier, where.value, where.expiresAt?.gt ?? new Date(0)]))[0] ?? null);
    },
    async deleteMany({ where }: { where: Where }) {
      if (where.identifier) return { count: (await query('DELETE FROM "Verification" WHERE "identifier" = $1 RETURNING "id"', [where.identifier])).length };
      return { count: 0 };
    },
  },
  passwordReset: {
    async create({ data }: { data: Data }) {
      return normalizeRow((await query('INSERT INTO "PasswordReset" ("id", "userId", "token", "expiresAt", "usedAt") VALUES ($1, $2, $3, $4, $5) RETURNING *', [data.id ?? createId(), data.userId, data.token, data.expiresAt, data.usedAt ?? null]))[0]);
    },
    async findUnique({ where }: { where: Where }) {
      return normalizeRow((await query('SELECT * FROM "PasswordReset" WHERE "token" = $1 LIMIT 1', [where.token]))[0] ?? null);
    },
    async update({ where, data }: { where: Where; data: Data }) {
      const set = assignments(data);
      return normalizeRow((await query(`UPDATE "PasswordReset" SET ${set.sql} WHERE "id" = $${set.values.length + 1} RETURNING *`, [...set.values, where.id]))[0] ?? null);
    },
  },
  project: {
    async findMany({ where }: { where: { userId: string } }) {
      await ensureProjectSchema();
      return (await projectQuery('SELECT * FROM "Project" WHERE "userId" = $1 ORDER BY "createdAt" DESC', [where.userId])).map((row) => normalizeProjectRow(row));
    },
    async findFirst({ where }: { where: { id: string; userId: string } }) {
      await ensureProjectSchema();
      return normalizeProjectRow((await projectQuery('SELECT * FROM "Project" WHERE "id" = $1 AND "userId" = $2 LIMIT 1', [where.id, where.userId]))[0] ?? null);
    },
    async create({ data }: { data: Data }) {
      await ensureProjectSchema();
      const now = new Date();
      return normalizeProjectRow((await projectQuery('INSERT INTO "Project" ("id", "userId", "name", "domain", "language", "country", "industry", "description", "status", "visibility", "reportsCount", "geoScore", "visibilityScore", "lastAnalysisAt", "lastScan", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *', [
        data.id ?? createId(),
        data.userId,
        data.name,
        data.domain,
        data.language ?? "English",
        data.country ?? "United States",
        data.industry ?? "SaaS",
        data.description ?? "",
        data.status ?? "Active",
        data.visibility ?? data.visibilityScore ?? 0,
        data.reportsCount ?? 0,
        data.geoScore ?? 0,
        data.visibilityScore ?? 0,
        data.lastAnalysisAt ?? null,
        data.lastScan ?? null,
        now,
        now,
      ]))[0]);
    },
    async update({ where, data }: { where: { id: string; userId: string }; data: Data }) {
      await ensureProjectSchema();
      const set = assignments({ ...data, updatedAt: new Date() });
      return normalizeProjectRow((await projectQuery(`UPDATE "Project" SET ${set.sql} WHERE "id" = $${set.values.length + 1} AND "userId" = $${set.values.length + 2} RETURNING *`, [...set.values, where.id, where.userId]))[0] ?? null);
    },
    async delete({ where }: { where: { id: string; userId: string } }) {
      await ensureProjectSchema();
      return normalizeProjectRow((await projectQuery('DELETE FROM "Project" WHERE "id" = $1 AND "userId" = $2 RETURNING *', [where.id, where.userId]))[0] ?? null);
    },
  },
  websiteScan: {
    async findLatest({ where }: { where: { projectId: string } }) {
      await ensureWebsiteScanSchema();
      return normalizeWebsiteScanRow((await websiteScanQuery('SELECT * FROM "WebsiteScan" WHERE "projectId" = $1 ORDER BY "createdAt" DESC LIMIT 1', [where.projectId]))[0] ?? null);
    },
    async findManyForUser({ where }: { where: { userId: string } }) {
      await ensureWebsiteScanSchema();
      return (await websiteScanQuery('SELECT ws.* FROM "WebsiteScan" ws INNER JOIN "Project" p ON p."id" = ws."projectId" WHERE p."userId" = $1 ORDER BY ws."createdAt" DESC', [where.userId])).map((row) => normalizeWebsiteScanRow(row));
    },
    async deleteTestScansForUser({ where }: { where: { userId: string; urls: string[] } }) {
      await ensureGeoAnalysisSchema();
      const patterns = where.urls.map((url) => `${url}%`);
      const scans = await websiteScanQuery('SELECT ws."id" FROM "WebsiteScan" ws INNER JOIN "Project" p ON p."id" = ws."projectId" WHERE p."userId" = $1 AND ws."url" LIKE ANY($2::text[])', [where.userId, patterns]);
      const ids = scans.map((scan) => scan.id);
      if (!ids.length) return { count: 0 };
      await geoAnalysisQuery('DELETE FROM "GeoAnalysis" WHERE "scanId" = ANY($1::text[])', [ids]);
      const deleted = await websiteScanQuery('DELETE FROM "WebsiteScan" WHERE "id" = ANY($1::text[]) RETURNING *', [ids]);
      return { count: deleted.length };
    },
    async create({ data }: { data: Data }) {
      await ensureWebsiteScanSchema();
      const now = new Date();
      return normalizeWebsiteScanRow((await websiteScanQuery('INSERT INTO "WebsiteScan" ("id", "projectId", "url", "status", "title", "description", "h1Count", "h2Count", "internalLinkCount", "externalLinkCount", "schemaCount", "schemaTypes", "robotsExists", "sitemapExists", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *', [
        data.id ?? createId(),
        data.projectId,
        data.url,
        data.status,
        data.title ?? null,
        data.description ?? null,
        data.h1Count ?? 0,
        data.h2Count ?? 0,
        data.internalLinkCount ?? 0,
        data.externalLinkCount ?? 0,
        data.schemaCount ?? 0,
        data.schemaTypes ?? [],
        data.robotsExists ?? false,
        data.sitemapExists ?? false,
        now,
        now,
      ]))[0]);
    },
    async update({ where, data }: { where: { id: string; projectId: string }; data: Data }) {
      await ensureWebsiteScanSchema();
      const set = assignments({ ...data, updatedAt: new Date() });
      return normalizeWebsiteScanRow((await websiteScanQuery(`UPDATE "WebsiteScan" SET ${set.sql} WHERE "id" = $${set.values.length + 1} AND "projectId" = $${set.values.length + 2} RETURNING *`, [...set.values, where.id, where.projectId]))[0] ?? null);
    },
    async deleteByProjectId({ where }: { where: { projectId: string } }) {
      await ensureWebsiteScanSchema();
      const deleted = await websiteScanQuery('DELETE FROM "WebsiteScan" WHERE "projectId" = $1 RETURNING "id"', [where.projectId]);
      return { count: deleted.length };
    },
  },
  geoAnalysis: {
    async findLatest({ where }: { where: { projectId: string } }) {
      await ensureGeoAnalysisSchema();
      return normalizeGeoAnalysisRow((await geoAnalysisQuery('SELECT * FROM "GeoAnalysis" WHERE "projectId" = $1 ORDER BY "createdAt" DESC LIMIT 1', [where.projectId]))[0] ?? null);
    },
    async findByScanId({ where }: { where: { scanId: string } }) {
      await ensureGeoAnalysisSchema();
      return normalizeGeoAnalysisRow((await geoAnalysisQuery('SELECT * FROM "GeoAnalysis" WHERE "scanId" = $1 LIMIT 1', [where.scanId]))[0] ?? null);
    },
    async deleteByProjectId({ where }: { where: { projectId: string } }) {
      await ensureGeoAnalysisSchema();
      return { count: (await geoAnalysisQuery('DELETE FROM "GeoAnalysis" WHERE "projectId" = $1 RETURNING "id"', [where.projectId])).length };
    },
    async findLatestForUser({ where }: { where: { userId: string } }) {
      await ensureGeoAnalysisSchema();
      return (await geoAnalysisQuery('SELECT DISTINCT ON (ga."projectId") ga.* FROM "GeoAnalysis" ga INNER JOIN "Project" p ON p."id" = ga."projectId" WHERE p."userId" = $1 ORDER BY ga."projectId", ga."createdAt" DESC', [where.userId])).map((row) => normalizeGeoAnalysisRow(row));
    },
    async create({ data }: { data: Data }) {
      await ensureGeoAnalysisSchema();
      const issues = JSON.stringify(data.issues ?? []);
      return normalizeGeoAnalysisRow((await geoAnalysisQuery('INSERT INTO "GeoAnalysis" ("id", "projectId", "scanId", "totalScore", "entityScore", "schemaScore", "technicalScore", "contentScore", "issues") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb) ON CONFLICT ("scanId") DO UPDATE SET "totalScore" = EXCLUDED."totalScore", "entityScore" = EXCLUDED."entityScore", "schemaScore" = EXCLUDED."schemaScore", "technicalScore" = EXCLUDED."technicalScore", "contentScore" = EXCLUDED."contentScore", "issues" = EXCLUDED."issues" RETURNING *', [
        data.id ?? createId(),
        data.projectId,
        data.scanId,
        data.totalScore ?? 0,
        data.entityScore ?? 0,
        data.schemaScore ?? 0,
        data.technicalScore ?? 0,
        data.contentScore ?? 0,
        issues,
      ]))[0]);
    },
  },
  optimizationTask: {
    async findManyForProject({ where }: { where: { projectId: string; userId: string } }) {
      await ensureOptimizationTaskSchema();
      return (await optimizationTaskQuery('SELECT ot.* FROM "OptimizationTask" ot INNER JOIN "Project" p ON p."id" = ot."projectId" WHERE ot."projectId" = $1 AND p."userId" = $2 ORDER BY ot."createdAt" DESC', [where.projectId, where.userId])).map((row) => normalizeOptimizationTaskRow(row));
    },
    async findById({ where }: { where: { id: string; userId: string } }) {
      await ensureOptimizationTaskSchema();
      return normalizeOptimizationTaskRow((await optimizationTaskQuery('SELECT ot.* FROM "OptimizationTask" ot INNER JOIN "Project" p ON p."id" = ot."projectId" WHERE ot."id" = $1 AND p."userId" = $2 LIMIT 1', [where.id, where.userId]))[0] ?? null);
    },
    async findByIssue({ where }: { where: { projectId: string; issueId: string } }) {
      await ensureOptimizationTaskSchema();
      return normalizeOptimizationTaskRow((await optimizationTaskQuery('SELECT * FROM "OptimizationTask" WHERE "projectId" = $1 AND "issueId" = $2 LIMIT 1', [where.projectId, where.issueId]))[0] ?? null);
    },
    async create({ data }: { data: Data }) {
      await ensureOptimizationTaskSchema();
      const now = new Date();
      return normalizeOptimizationTaskRow((await optimizationTaskQuery('INSERT INTO "OptimizationTask" ("id", "projectId", "issueId", "title", "description", "recommendation", "severity", "category", "status", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *', [
        data.id ?? createId(),
        data.projectId,
        data.issueId,
        data.title,
        data.description ?? "",
        data.recommendation ?? "",
        data.severity ?? "Medium",
        data.category ?? "",
        data.status ?? "PENDING",
        now,
        now,
      ]))[0]);
    },
    async updateStatus({ where, data }: { where: { id: string; userId: string }; data: { status: string } }) {
      await ensureOptimizationTaskSchema();
      return normalizeOptimizationTaskRow((await optimizationTaskQuery('UPDATE "OptimizationTask" ot SET "status" = $1, "updatedAt" = $2 FROM "Project" p WHERE ot."id" = $3 AND ot."projectId" = p."id" AND p."userId" = $4 RETURNING ot.*', [data.status, new Date(), where.id, where.userId]))[0] ?? null);
    },
    async deleteByProjectId({ where }: { where: { projectId: string } }) {
      await ensureOptimizationTaskSchema();
      return { count: (await optimizationTaskQuery('DELETE FROM "OptimizationTask" WHERE "projectId" = $1 RETURNING "id"', [where.projectId])).length };
    },
  },
  visibilityCampaign: {
    async findManyForUser({ where }: { where: { userId: string; projectId?: string } }) {
      await ensureVisibilitySchema();
      const rows = where.projectId
        ? await visibilityCampaignQuery('SELECT vc.* FROM "VisibilityCampaign" vc INNER JOIN "Project" p ON p."id" = vc."projectId" WHERE p."userId" = $1 AND vc."projectId" = $2 ORDER BY vc."createdAt" DESC', [where.userId, where.projectId])
        : await visibilityCampaignQuery('SELECT vc.* FROM "VisibilityCampaign" vc INNER JOIN "Project" p ON p."id" = vc."projectId" WHERE p."userId" = $1 ORDER BY vc."createdAt" DESC', [where.userId]);
      return rows.map((row) => normalizeVisibilityCampaignRow(row));
    },
    async create({ data }: { data: Data }) {
      await ensureVisibilitySchema();
      return normalizeVisibilityCampaignRow((await visibilityCampaignQuery('INSERT INTO "VisibilityCampaign" ("id", "projectId", "keyword", "createdAt") VALUES ($1, $2, $3, $4) RETURNING *', [data.id ?? createId(), data.projectId, data.keyword, new Date()]))[0]);
    },
    async findFirstForUser({ where }: { where: { id: string; userId: string } }) {
      await ensureVisibilitySchema();
      return normalizeVisibilityCampaignRow((await visibilityCampaignQuery('SELECT vc.* FROM "VisibilityCampaign" vc INNER JOIN "Project" p ON p."id" = vc."projectId" WHERE vc."id" = $1 AND p."userId" = $2 LIMIT 1', [where.id, where.userId]))[0] ?? null);
    },
  },
  visibilityPrompt: {
    async findManyForUser({ where }: { where: { userId: string; campaignIds?: string[]; projectId?: string } }) {
      await ensureVisibilitySchema();
      if (where.campaignIds && where.campaignIds.length === 0) return [];
      const rows = where.campaignIds
        ? await visibilityPromptQuery('SELECT vp.* FROM "VisibilityPrompt" vp INNER JOIN "VisibilityCampaign" c ON c."id" = vp."campaignId" INNER JOIN "Project" p ON p."id" = c."projectId" WHERE p."userId" = $1 AND vp."campaignId" = ANY($2::text[]) ORDER BY vp."createdAt" DESC', [where.userId, where.campaignIds])
        : where.projectId
          ? await visibilityPromptQuery('SELECT vp.* FROM "VisibilityPrompt" vp INNER JOIN "VisibilityCampaign" c ON c."id" = vp."campaignId" INNER JOIN "Project" p ON p."id" = c."projectId" WHERE p."userId" = $1 AND c."projectId" = $2 ORDER BY vp."createdAt" DESC', [where.userId, where.projectId])
          : await visibilityPromptQuery('SELECT vp.* FROM "VisibilityPrompt" vp INNER JOIN "VisibilityCampaign" c ON c."id" = vp."campaignId" INNER JOIN "Project" p ON p."id" = c."projectId" WHERE p."userId" = $1 ORDER BY vp."createdAt" DESC', [where.userId]);
      return rows.map((row) => normalizeVisibilityPromptRow(row));
    },
    async findFirstForUser({ where }: { where: { id: string; userId: string; campaignId?: string } }) {
      await ensureVisibilitySchema();
      const rows = where.campaignId
        ? await visibilityPromptQuery('SELECT vp.* FROM "VisibilityPrompt" vp INNER JOIN "VisibilityCampaign" c ON c."id" = vp."campaignId" INNER JOIN "Project" p ON p."id" = c."projectId" WHERE vp."id" = $1 AND vp."campaignId" = $2 AND p."userId" = $3 LIMIT 1', [where.id, where.campaignId, where.userId])
        : await visibilityPromptQuery('SELECT vp.* FROM "VisibilityPrompt" vp INNER JOIN "VisibilityCampaign" c ON c."id" = vp."campaignId" INNER JOIN "Project" p ON p."id" = c."projectId" WHERE vp."id" = $1 AND p."userId" = $2 LIMIT 1', [where.id, where.userId]);
      return normalizeVisibilityPromptRow(rows[0] ?? null);
    },
    async create({ data }: { data: Data }) {
      await ensureVisibilitySchema();
      return normalizeVisibilityPromptRow((await visibilityPromptQuery('INSERT INTO "VisibilityPrompt" ("id", "campaignId", "prompt", "createdAt") VALUES ($1, $2, $3, $4) RETURNING *', [data.id ?? createId(), data.campaignId, data.prompt, new Date()]))[0]);
    },
  },
  visibilityCheck: {
    async findManyForUser({ where }: { where: { userId: string; projectId?: string; campaignIds?: string[] } }) {
      await ensureVisibilitySchema();
      if (where.campaignIds && where.campaignIds.length === 0) return [];
      const rows = where.campaignIds
        ? await visibilityCheckQuery('SELECT vc.* FROM "VisibilityCheck" vc INNER JOIN "VisibilityCampaign" c ON c."id" = vc."campaignId" INNER JOIN "Project" p ON p."id" = c."projectId" WHERE p."userId" = $1 AND vc."campaignId" = ANY($2::text[]) ORDER BY vc."createdAt" DESC', [where.userId, where.campaignIds])
        : where.projectId
          ? await visibilityCheckQuery('SELECT vc.* FROM "VisibilityCheck" vc INNER JOIN "VisibilityCampaign" c ON c."id" = vc."campaignId" INNER JOIN "Project" p ON p."id" = c."projectId" WHERE p."userId" = $1 AND c."projectId" = $2 ORDER BY vc."createdAt" DESC', [where.userId, where.projectId])
          : await visibilityCheckQuery('SELECT vc.* FROM "VisibilityCheck" vc INNER JOIN "VisibilityCampaign" c ON c."id" = vc."campaignId" INNER JOIN "Project" p ON p."id" = c."projectId" WHERE p."userId" = $1 ORDER BY vc."createdAt" DESC', [where.userId]);
      return rows.map((row) => normalizeVisibilityCheckRow(row));
    },
    async create({ data }: { data: Data }) {
      await ensureVisibilitySchema();
      return normalizeVisibilityCheckRow((await visibilityCheckQuery('INSERT INTO "VisibilityCheck" ("id", "campaignId", "promptId", "provider", "prompt", "answer", "brandMentioned", "mentionPosition", "sourceUrls", "score", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11) RETURNING *', [
        data.id ?? createId(),
        data.campaignId,
        data.promptId ?? null,
        data.provider,
        data.prompt,
        data.answer,
        data.brandMentioned ?? false,
        data.mentionPosition ?? null,
        data.sourceUrls ?? [],
        data.score ?? 0,
        new Date(),
      ]))[0]);
    },
  },
  async $transaction(operations: Array<Promise<unknown>>) {
    return Promise.all(operations);
  },
};
