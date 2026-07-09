import { prisma } from "@/features/auth/server/prisma";
import { createToken, sha256 } from "@/features/auth/server/tokens";
import { PASSWORD_RESET_TTL_MINUTES } from "@/features/auth/server/constants";
import { sendPasswordResetEmail } from "@/features/auth/server/email";
import { forgotPasswordSchema } from "@/features/auth/server/schemas";
import { getClientIp, rateLimit, rateLimitResponse } from "@/features/auth/server/rate-limit";
import { verifyTurnstile } from "@/features/auth/server/turnstile";
import { jsonError, parseError } from "@/features/auth/server/responses";

export async function POST(request: Request) {
  try {
    const body = forgotPasswordSchema.parse(await request.json());
    const ip = getClientIp(request);
    const limited = rateLimit({ key: `forgot:${ip}:${body.email}`, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited.resetAt);
    if (!(await verifyTurnstile(body.turnstileToken, ip))) return jsonError("Turnstile verification failed.", 403);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (user) {
      const token = createToken(36);
      await prisma.passwordReset.create({ data: { userId: user.id, token: sha256(token), expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000) } });
      const baseUrl = process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;
      await sendPasswordResetEmail(body.email, `${baseUrl}/reset-password?token=${token}`);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return parseError(error);
  }
}
