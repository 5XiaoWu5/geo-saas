import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/features/auth/server/constants";
import { createSession, sessionCookieOptions } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { verifyPassword } from "@/features/auth/server/password";
import { loginSchema } from "@/features/auth/server/schemas";
import { getClientIp, rateLimit, rateLimitResponse } from "@/features/auth/server/rate-limit";
import { verifyTurnstile } from "@/features/auth/server/turnstile";
import { jsonError, parseError } from "@/features/auth/server/responses";

function logLoginError(event: string, error: unknown, requestId?: string) {
  console.error(`[AUTH ERROR] login:${event}`, {
    requestId,
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    betterAuthSecretPresent: Boolean(process.env.BETTER_AUTH_SECRET),
    runtime: process.env.NEXT_RUNTIME ?? "unknown",
    nodeEnv: process.env.NODE_ENV,
  });
}

function logLoginInfo(event: string, data: Record<string, unknown> = {}) {
  console.info(`[auth:login] ${event}`, {
    ...data,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    betterAuthSecretPresent: Boolean(process.env.BETTER_AUTH_SECRET),
    runtime: process.env.NEXT_RUNTIME ?? "unknown",
    nodeEnv: process.env.NODE_ENV,
  });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    logLoginInfo("request:start", { requestId });
    const body = loginSchema.parse(await request.json());
    const ip = getClientIp(request);
    logLoginInfo("turnstile token received", { requestId, tokenPresent: Boolean(body.turnstileToken), tokenLength: body.turnstileToken.length, ip });

    const limited = rateLimit({ key: `login:${ip}:${body.email}`, limit: 5, windowMs: 15 * 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited.resetAt);

    const turnstileValid = await verifyTurnstile(body.turnstileToken, ip);
    logLoginInfo("turnstile verification completed", { requestId, turnstileValid });
    if (!turnstileValid) return jsonError("人机验证失败，请重试", 403);

    let user;
    try {
      user = await prisma.user.findUnique({ where: { email: body.email } });
    } catch (error) {
      logLoginError("prisma findUnique failed", error, requestId);
      throw error;
    }

    if (!user?.passwordHash) return jsonError("邮箱或密码错误", 401);
    if (!(await verifyPassword(user.passwordHash, body.password))) return jsonError("邮箱或密码错误", 401);
    if (!user.emailVerified) return jsonError("请先完成邮箱验证后再登录", 403);

    let token;
    try {
      token = await createSession(user.id, request);
    } catch (error) {
      logLoginError("create session failed", error, requestId);
      throw error;
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, sessionCookieOptions());
    logLoginInfo("request:success", { requestId, userId: user.id });
    return Response.json({ ok: true });
  } catch (error) {
    logLoginError("request failed", error, requestId);
    return parseError(error);
  }
}
