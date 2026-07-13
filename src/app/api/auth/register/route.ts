import { registerSchema } from "@/features/auth/server/schemas";
import { prisma } from "@/features/auth/server/prisma";
import { hashPassword } from "@/features/auth/server/password";
import { createNumericCode, sha256 } from "@/features/auth/server/tokens";
import { EMAIL_CODE_TTL_MINUTES } from "@/features/auth/server/constants";
import { sendVerificationCodeEmail } from "@/features/auth/server/email";
import { getClientIp, rateLimit, rateLimitResponse } from "@/features/auth/server/rate-limit";
import { verifyTurnstile } from "@/features/auth/server/turnstile";
import { AUTH_TURNSTILE_ENABLED } from "@/features/auth/server/feature-flags";
import { AUTH_DATABASE_ERROR_MESSAGE, jsonError, parseError } from "@/features/auth/server/responses";

function logRegisterError(event: string, error: unknown, requestId?: string) {
  console.error(`[AUTH REGISTER] ${event}`, {
    requestId,
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    betterAuthSecretPresent: Boolean(process.env.BETTER_AUTH_SECRET),
    resendApiKeyPresent: Boolean(process.env.RESEND_API_KEY),
    fromEmail: process.env.RESEND_FROM_EMAIL ?? null,
    runtime: process.env.NEXT_RUNTIME ?? "unknown",
    nodeEnv: process.env.NODE_ENV,
  });
}

function logRegisterInfo(event: string, data: Record<string, unknown> = {}) {
  console.info(`[AUTH REGISTER] ${event}`, {
    ...data,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    betterAuthSecretPresent: Boolean(process.env.BETTER_AUTH_SECRET),
    resendApiKeyPresent: Boolean(process.env.RESEND_API_KEY),
    fromEmail: process.env.RESEND_FROM_EMAIL ?? null,
    runtime: process.env.NEXT_RUNTIME ?? "unknown",
    nodeEnv: process.env.NODE_ENV,
  });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    logRegisterInfo("request:start", { requestId });

    const body = registerSchema.parse(await request.json());
    const ip = getClientIp(request);
    logRegisterInfo("turnstile token received", { requestId, tokenPresent: Boolean(body.turnstileToken), tokenLength: body.turnstileToken.length, ip });

    const limited = rateLimit({ key: `register:${ip}`, limit: 3, windowMs: 60 * 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited.resetAt);

    if (AUTH_TURNSTILE_ENABLED) {
      const turnstileValid = await verifyTurnstile(body.turnstileToken, ip);
      logRegisterInfo("turnstile verification completed", { requestId, turnstileValid });
      if (!turnstileValid) return jsonError("人机验证失败，请重试", 403);
    } else {
      logRegisterInfo("turnstile verification skipped", { requestId });
    }

    if (!process.env.DATABASE_URL) {
      logRegisterError("database url missing", new Error("DATABASE_URL is not configured"), requestId);
      return jsonError(AUTH_DATABASE_ERROR_MESSAGE, 503);
    }

    let existing;
    try {
      existing = await prisma.user.findUnique({ where: { email: body.email } });
    } catch (error) {
      logRegisterError("prisma findUnique failed", error, requestId);
      return jsonError("认证数据库查询失败，请稍后重试", 503);
    }

    if (existing) return jsonError("该邮箱已注册，请直接登录", 409);

    let passwordHash;
    try {
      passwordHash = await hashPassword(body.password);
    } catch (error) {
      console.error(error);
      logRegisterError("password hash failed", error, requestId);
      return jsonError("密码加密服务异常，请稍后重试", 503);
    }

    let user;
    try {
      user = await prisma.user.create({
        data: {
          email: body.email,
          name: body.name,
          passwordHash,
          emailVerified: false,
        },
      });
    } catch (error) {
      logRegisterError("prisma createUser failed", error, requestId);
      return jsonError("账户创建失败，请稍后重试", 503);
    }

    const code = createNumericCode();
    try {
      const verification = await prisma.verification.create({
        data: {
          identifier: `email:${body.email}`,
          value: sha256(code),
          expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000),
          userId: user.id,
        },
      });
      logRegisterInfo("verification token created", { requestId, verificationId: verification.id, userId: user.id, identifier: `email:${body.email}` });
    } catch (error) {
      logRegisterError("prisma verification create failed", error, requestId);
      return jsonError("邮箱验证码创建失败，请稍后重试", 503);
    }

    const emailResult = await sendVerificationCodeEmail(body.email, code);
    if (!emailResult.sent) {
      logRegisterError("resend verification email failed", new Error(emailResult.error ?? "Email send failed"), requestId);
    }

    logRegisterInfo("request:success", { requestId, userId: user.id, email: body.email, emailSent: emailResult.sent, messageId: emailResult.messageId });
    return Response.json({ ok: true, email: body.email, emailDelivery: { sent: emailResult.sent, messageId: emailResult.messageId, error: emailResult.error, statusCode: emailResult.statusCode ?? null } });
  } catch (error) {
    logRegisterError("request failed", error, requestId);
    return parseError(error);
  }
}
