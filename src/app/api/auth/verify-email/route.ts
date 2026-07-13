import { prisma } from "@/features/auth/server/prisma";
import { sha256 } from "@/features/auth/server/tokens";
import { verifyEmailSchema } from "@/features/auth/server/schemas";
import { jsonError, parseError } from "@/features/auth/server/responses";

export async function POST(request: Request) {
  try {
    console.info("[AUTH VERIFY_EMAIL] request entered api");
    const body = verifyEmailSchema.parse(await request.json());
    const verification = await prisma.verification.findFirst({
      where: {
        identifier: `email:${body.email}`,
        value: sha256(body.code),
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) return jsonError("验证码无效或已过期", 400);

    console.info("[AUTH VERIFY_EMAIL] verification found", { email: body.email, verificationId: verification.id, userId: verification.userId });
    await prisma.user.update({ where: { email: body.email }, data: { emailVerified: true } });
    console.info("[AUTH VERIFY_EMAIL] user email verified", { email: body.email });
    await prisma.verification.deleteMany({ where: { identifier: `email:${body.email}` } });
    return Response.json({ ok: true });
  } catch (error) {
    return parseError(error);
  }
}
