import { prisma } from "@/features/auth/server/prisma";
import { createNumericCode, sha256 } from "@/features/auth/server/tokens";
import { EMAIL_CODE_TTL_MINUTES } from "@/features/auth/server/constants";
import { sendVerificationCodeEmail } from "@/features/auth/server/email";
import { emailSchema } from "@/features/auth/server/schemas";
import { getClientIp, rateLimit, rateLimitResponse } from "@/features/auth/server/rate-limit";
import { jsonError, parseError } from "@/features/auth/server/responses";

export async function POST(request: Request) {
  try {
    const { email } = await request.json() as { email?: string };
    const parsedEmail = emailSchema.parse(email);
    const ip = getClientIp(request);
    const limited = rateLimit({ key: `verification:${ip}:${parsedEmail}`, limit: 1, windowMs: 60 * 1000 });
    if (!limited.success) return rateLimitResponse(limited.resetAt);

    const user = await prisma.user.findUnique({ where: { email: parsedEmail } });
    if (!user) return jsonError("账号不存在", 404);
    if (user.emailVerified) return Response.json({ ok: true });

    const code = createNumericCode();
    await prisma.verification.create({ data: { identifier: `email:${parsedEmail}`, value: sha256(code), expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000), userId: user.id } });
    await sendVerificationCodeEmail(parsedEmail, code);
    return Response.json({ ok: true });
  } catch (error) {
    return parseError(error);
  }
}

