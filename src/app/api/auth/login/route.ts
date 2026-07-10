import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/features/auth/server/constants";
import { createSession, sessionCookieOptions } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { verifyPassword } from "@/features/auth/server/password";
import { loginSchema } from "@/features/auth/server/schemas";
import { getClientIp, rateLimit, rateLimitResponse } from "@/features/auth/server/rate-limit";
import { verifyTurnstile } from "@/features/auth/server/turnstile";
import { AUTH_DATABASE_ERROR_MESSAGE, jsonError, parseError } from "@/features/auth/server/responses";

function logLoginError(event: string, error: unknown, requestId?: string) {
  console.error(`[AUTH LOGIN] ${event}`, {
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
  console.info(`[AUTH LOGIN] ${event}`, {
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
    logLoginInfo("request entered api", { requestId });
    const payload = await request.json();
    logLoginInfo("request body received", {
      requestId,
      emailPresent: typeof payload?.email === "string" && payload.email.length > 0,
      passwordPresent: typeof payload?.password === "string" && payload.password.length > 0,
      turnstileTokenPresent: typeof payload?.turnstileToken === "string" && payload.turnstileToken.length > 0,
      turnstileTokenLength: typeof payload?.turnstileToken === "string" ? payload.turnstileToken.length : 0,
    });

    const body = loginSchema.parse(payload);
    const ip = getClientIp(request);
    logLoginInfo("validated request payload", {
      requestId,
      emailPresent: Boolean(body.email),
      turnstileTokenPresent: Boolean(body.turnstileToken),
      turnstileTokenLength: body.turnstileToken.length,
      ipPresent: Boolean(ip),
    });

    const limited = rateLimit({ key: `login:${ip}:${body.email}`, limit: 5, windowMs: 15 * 60 * 1000 });
    logLoginInfo("rate limit checked", { requestId, success: limited.success, resetAt: limited.resetAt });
    if (!limited.success) return rateLimitResponse(limited.resetAt);

    const turnstileValid = await verifyTurnstile(body.turnstileToken, ip);
    logLoginInfo("turnstile verification completed", { requestId, turnstileValid });
    if (!turnstileValid) return jsonError("人机验证失败，请重试", 403);
    if (!process.env.DATABASE_URL) {
      logLoginError("database url missing", new Error("DATABASE_URL is not configured"), requestId);
      return jsonError(AUTH_DATABASE_ERROR_MESSAGE, 503);
    }

    let user;
    try {
      user = await prisma.user.findUnique({ where: { email: body.email } });
      logLoginInfo("prisma user query completed", {
        requestId,
        userFound: Boolean(user),
        userId: user?.id,
        hasPasswordHash: Boolean(user?.passwordHash),
        emailVerified: Boolean(user?.emailVerified),
      });
    } catch (error) {
      logLoginError("prisma findUnique failed", error, requestId);
      throw error;
    }

    if (!user?.passwordHash) {
      logLoginInfo("password hash missing or user not found", { requestId, userFound: Boolean(user), hasPasswordHash: Boolean(user?.passwordHash) });
      return jsonError("邮箱或密码错误", 401);
    }

    const passwordValid = await verifyPassword(user.passwordHash, body.password);
    logLoginInfo("password hash verification completed", { requestId, passwordValid });
    if (!passwordValid) return jsonError("邮箱或密码错误", 401);

    if (!user.emailVerified) {
      logLoginInfo("email verification required", { requestId, userId: user.id });
      return jsonError("\u4eba\u673a\u9a8c\u8bc1\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5", 403);
    }

    let token;
    try {
      token = await createSession(user.id, request);
      logLoginInfo("session creation completed", { requestId, userId: user.id, sessionCreated: Boolean(token) });
    } catch (error) {
      logLoginError("create session failed", error, requestId);
      throw error;
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, sessionCookieOptions());
    logLoginInfo("session cookie set", { requestId, userId: user.id, cookieName: AUTH_COOKIE_NAME });
    logLoginInfo("request:success", { requestId, userId: user.id });
    return Response.json({ ok: true });
  } catch (error) {
    logLoginError("request failed", error, requestId);
    return parseError(error);
  }
}

