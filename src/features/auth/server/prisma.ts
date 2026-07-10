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
      const row = { id: data.id ?? createId(), email: data.email, name: data.name ?? null, role: data.role ?? "admin", emailVerified: data.emailVerified ?? false, image: data.image ?? null, passwordHash: data.passwordHash ?? null };
      return normalizeRow((await query('INSERT INTO "User" ("id", "email", "name", "role", "emailVerified", "image", "passwordHash") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [row.id, row.email, row.name, row.role, row.emailVerified, row.image, row.passwordHash]))[0]);
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
      return normalizeRow((await query('INSERT INTO "Session" ("id", "token", "userId", "expiresAt", "ipAddress", "userAgent") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [data.id ?? createId(), data.token, data.userId, data.expiresAt, data.ipAddress ?? null, data.userAgent ?? null]))[0]);
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
      return normalizeRow((await query('INSERT INTO "Verification" ("id", "identifier", "value", "expiresAt", "userId") VALUES ($1, $2, $3, $4, $5) RETURNING *', [data.id ?? createId(), data.identifier, data.value, data.expiresAt, data.userId ?? null]))[0]);
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
  async $transaction(operations: Array<Promise<unknown>>) {
    return Promise.all(operations);
  },
};
