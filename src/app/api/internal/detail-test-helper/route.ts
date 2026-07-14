import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QueryFunction = {
  query: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
};

const allowedPattern = /^geopilot-detail-\d+@example\.com$/;

function validateEmail(email: unknown) {
  if (typeof email !== "string" || !allowedPattern.test(email)) throw new Error("只允许本次详情页测试邮箱");
  return email;
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DATABASE_URL 未配置" }, { status: 500 });
  const { action, email } = await request.json() as { action?: string; email?: unknown };
  const targetEmail = validateEmail(email);
  const sql = neon(process.env.DATABASE_URL) as unknown as QueryFunction;

  if (action === "verify") {
    const users = await sql.query('UPDATE "User" SET "emailVerified" = true, "updatedAt" = NOW() WHERE "email" = $1 RETURNING "id", "email", "emailVerified"', [targetEmail]);
    return NextResponse.json({ ok: users.length === 1, user: users[0] ?? null });
  }

  if (action === "cleanup") {
    const users = await sql.query('SELECT "id" FROM "User" WHERE "email" = $1', [targetEmail]);
    let deletedProjects = 0;
    let deletedUsers = 0;
    for (const user of users) {
      const userId = String(user.id);
      deletedProjects += (await sql.query('DELETE FROM "Project" WHERE "userId" = $1 RETURNING "id"', [userId])).length;
      await sql.query('DELETE FROM "Session" WHERE "userId" = $1', [userId]);
      await sql.query('DELETE FROM "Account" WHERE "userId" = $1', [userId]);
      await sql.query('DELETE FROM "Verification" WHERE "userId" = $1 OR "identifier" = $2', [userId, `email:${targetEmail}`]);
      await sql.query('DELETE FROM "PasswordReset" WHERE "userId" = $1', [userId]);
      deletedUsers += (await sql.query('DELETE FROM "User" WHERE "id" = $1 RETURNING "id"', [userId])).length;
    }
    return NextResponse.json({ ok: true, deletedProjects, deletedUsers });
  }

  return NextResponse.json({ error: "不支持的操作" }, { status: 400 });
}
