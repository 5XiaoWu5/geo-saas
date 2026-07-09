import { registerSchema } from "@/features/auth/server/schemas";
import { prisma } from "@/features/auth/server/prisma";
import { hashPassword } from "@/features/auth/server/password";
import { createNumericCode, sha256 } from "@/features/auth/server/tokens";
import { EMAIL_CODE_TTL_MINUTES } from "@/features/auth/server/constants";
import { sendVerificationCodeEmail } from "@/features/auth/server/email";
import { getClientIp, rateLimit, rateLimitResponse } from "@/features/auth/server/rate-limit";
import { verifyTurnstile } from "@/features/auth/server/turnstile";
import { jsonError, parseError } from "@/features/auth/server/responses";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const ip = getClientIp(request);
    const limited = rateLimit({ key: `register:${ip}`, limit: 3, windowMs: 60 * 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited.resetAt);
    if (!(await verifyTurnstile(body.turnstileToken, ip))) return jsonError("人机验证失败，请重试", 403);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return jsonError("该邮箱已注册，请直接登录", 409);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash: await hashPassword(body.password),
        emailVerified: false,
      },
    });

    const code = createNumericCode();
    await prisma.verification.create({
      data: {
        identifier: `email:${body.email}`,
        value: sha256(code),
        expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000),
        userId: user.id,
      },
    });
    await sendVerificationCodeEmail(body.email, code);

    return Response.json({ ok: true, email: body.email });
  } catch (error) {
    return parseError(error);
  }
}

