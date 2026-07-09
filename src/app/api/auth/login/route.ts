import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/features/auth/server/constants";
import { createSession, sessionCookieOptions } from "@/features/auth/server/session";
import { prisma } from "@/features/auth/server/prisma";
import { verifyPassword } from "@/features/auth/server/password";
import { loginSchema } from "@/features/auth/server/schemas";
import { getClientIp, rateLimit, rateLimitResponse } from "@/features/auth/server/rate-limit";
import { verifyTurnstile } from "@/features/auth/server/turnstile";
import { jsonError, parseError } from "@/features/auth/server/responses";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const ip = getClientIp(request);
    const limited = rateLimit({ key: `login:${ip}:${body.email}`, limit: 5, windowMs: 15 * 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited.resetAt);
    if (!(await verifyTurnstile(body.turnstileToken, ip))) return jsonError("人机验证失败，请重试", 403);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user?.passwordHash) return jsonError("邮箱或密码错误", 401);
    if (!(await verifyPassword(user.passwordHash, body.password))) return jsonError("邮箱或密码错误", 401);
    if (!user.emailVerified) return jsonError("请先完成邮箱验证后再登录", 403);

    const token = await createSession(user.id, request);
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, sessionCookieOptions());
    return Response.json({ ok: true });
  } catch (error) {
    return parseError(error);
  }
}

