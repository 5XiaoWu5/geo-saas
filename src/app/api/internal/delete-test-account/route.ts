import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const targetEmails = ["2780935352@qq,com", "2780935352@qq.com"];

type QueryFunction = {
  query: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
};

export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL 未配置" }, { status: 500 });
  }

  const sql = neon(process.env.DATABASE_URL) as unknown as QueryFunction;
  const users = await sql.query('SELECT "id", "email" FROM "User" WHERE "email" = ANY($1)', [targetEmails]);

  if (users.length === 0) {
    return NextResponse.json({ deleted: false, reason: "账号不存在", checked: targetEmails });
  }

  if (users.length > 1) {
    return NextResponse.json({ deleted: false, reason: "发现多个候选账号，未执行删除", users }, { status: 409 });
  }

  const user = users[0];
  const userId = String(user.id);
  const email = String(user.email);

  const sessions = await sql.query('DELETE FROM "Session" WHERE "userId" = $1 RETURNING "id"', [userId]);
  const accounts = await sql.query('DELETE FROM "Account" WHERE "userId" = $1 RETURNING "id"', [userId]);
  const verifications = await sql.query('DELETE FROM "Verification" WHERE "userId" = $1 OR "identifier" = $2 RETURNING "id"', [userId, email]);
  const passwordResets = await sql.query('DELETE FROM "PasswordReset" WHERE "userId" = $1 RETURNING "id"', [userId]);
  const deletedUsers = await sql.query('DELETE FROM "User" WHERE "id" = $1 RETURNING "id", "email"', [userId]);

  return NextResponse.json({
    deleted: deletedUsers.length === 1,
    email,
    counts: {
      sessions: sessions.length,
      accounts: accounts.length,
      verifications: verifications.length,
      passwordResets: passwordResets.length,
      users: deletedUsers.length,
    },
  });
}
