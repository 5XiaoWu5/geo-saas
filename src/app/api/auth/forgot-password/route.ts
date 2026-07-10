import { prisma } from "@/features/auth/server/prisma";
import { createToken, sha256 } from "@/features/auth/server/tokens";
import { PASSWORD_RESET_TTL_MINUTES } from "@/features/auth/server/constants";
import { sendPasswordResetEmail } from "@/features/auth/server/email";
import { forgotPasswordSchema } from "@/features/auth/server/schemas";
import { getClientIp, rateLimit, rateLimitResponse } from "@/features/auth/server/rate-limit";
import { AUTH_DATABASE_ERROR_MESSAGE, parseError } from "@/features/auth/server/responses";

function logForgotPasswordError(event: string, error: unknown, requestId?: string) {
  console.error(`[AUTH FORGOT_PASSWORD] ${event}`, {
    requestId,
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    resendApiKeyPresent: Boolean(process.env.RESEND_API_KEY),
    runtime: process.env.NEXT_RUNTIME ?? "unknown",
    nodeEnv: process.env.NODE_ENV,
  });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    console.info("[AUTH FORGOT_PASSWORD] request entered api", {
      requestId,
      databaseUrlPresent: Boolean(process.env.DATABASE_URL),
      resendApiKeyPresent: Boolean(process.env.RESEND_API_KEY),
      runtime: process.env.NEXT_RUNTIME ?? "unknown",
      nodeEnv: process.env.NODE_ENV,
    });

    const body = forgotPasswordSchema.parse(await request.json());
    const ip = getClientIp(request);
    const limited = rateLimit({ key: `forgot:${ip}:${body.email}`, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited.resetAt);
    if (!process.env.DATABASE_URL) {
      logForgotPasswordError("database url missing", new Error("DATABASE_URL is not configured"), requestId);
      return Response.json({ error: AUTH_DATABASE_ERROR_MESSAGE }, { status: 503 });
    }

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (user) {
      const token = createToken(36);
      await prisma.passwordReset.create({ data: { userId: user.id, token: sha256(token), expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000) } });
      const baseUrl = process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;
      await sendPasswordResetEmail(body.email, `${baseUrl}/reset-password?token=${token}`);
    }

    return Response.json({ ok: true });
  } catch (error) {
    logForgotPasswordError("request failed", error, requestId);
    return parseError(error);
  }
}
