import { registerSchema } from "@/features/auth/server/schemas";
import { prisma } from "@/features/auth/server/prisma";
import { hashPassword } from "@/features/auth/server/password";
import { createNumericCode, sha256 } from "@/features/auth/server/tokens";
import { EMAIL_CODE_TTL_MINUTES } from "@/features/auth/server/constants";
import { sendVerificationCodeEmail } from "@/features/auth/server/email";
import { getClientIp, rateLimit, rateLimitResponse } from "@/features/auth/server/rate-limit";
import { verifyTurnstile } from "@/features/auth/server/turnstile";
import { AUTH_DATABASE_ERROR_MESSAGE, jsonError, parseError } from "@/features/auth/server/responses";

function logRegisterError(event: string, error: unknown, requestId?: string) {
  console.error(`[AUTH ERROR] register:${event}`, {
    requestId,
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    betterAuthSecretPresent: Boolean(process.env.BETTER_AUTH_SECRET),
    resendApiKeyPresent: Boolean(process.env.RESEND_API_KEY),
    runtime: process.env.NEXT_RUNTIME ?? "unknown",
    nodeEnv: process.env.NODE_ENV,
  });
}

function logRegisterInfo(event: string, data: Record<string, unknown> = {}) {
  console.info(`[auth:register] ${event}`, {
    ...data,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    betterAuthSecretPresent: Boolean(process.env.BETTER_AUTH_SECRET),
    resendApiKeyPresent: Boolean(process.env.RESEND_API_KEY),
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

    const turnstileValid = await verifyTurnstile(body.turnstileToken, ip);
    logRegisterInfo("turnstile verification completed", { requestId, turnstileValid });
    if (!turnstileValid) return jsonError("浜烘満楠岃瘉澶辫触锛岃閲嶈瘯", 403);
    if (!process.env.DATABASE_URL) {
      logRegisterError("database url missing", new Error("DATABASE_URL is not configured"), requestId);
      return jsonError(AUTH_DATABASE_ERROR_MESSAGE, 503);
    }

    let existing;
    try {
      existing = await prisma.user.findUnique({ where: { email: body.email } });
    } catch (error) {
      logRegisterError("prisma findUnique failed", error, requestId);
      throw error;
    }

    if (existing) return jsonError("璇ラ偖绠卞凡娉ㄥ唽锛岃鐩存帴鐧诲綍", 409);

    let passwordHash;
    try {
      passwordHash = await hashPassword(body.password);
    } catch (error) {
      logRegisterError("password hash failed", error, requestId);
      throw error;
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
      throw error;
    }

    const code = createNumericCode();
    try {
      await prisma.verification.create({
        data: {
          identifier: `email:${body.email}`,
          value: sha256(code),
          expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000),
          userId: user.id,
        },
      });
    } catch (error) {
      logRegisterError("prisma verification create failed", error, requestId);
      throw error;
    }

    try {
      await sendVerificationCodeEmail(body.email, code);
    } catch (error) {
      logRegisterError("resend verification email failed", error, requestId);
    }

    logRegisterInfo("request:success", { requestId, userId: user.id, email: body.email });
    return Response.json({ ok: true, email: body.email });
  } catch (error) {
    logRegisterError("request failed", error, requestId);
    return parseError(error);
  }
}
