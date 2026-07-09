import { prisma } from "@/features/auth/server/prisma";
import { sha256 } from "@/features/auth/server/tokens";
import { verifyEmailSchema } from "@/features/auth/server/schemas";
import { jsonError, parseError } from "@/features/auth/server/responses";

export async function POST(request: Request) {
  try {
    const body = verifyEmailSchema.parse(await request.json());
    const verification = await prisma.verification.findFirst({
      where: {
        identifier: `email:${body.email}`,
        value: sha256(body.code),
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) return jsonError("Invalid or expired verification code.", 400);

    await prisma.user.update({ where: { email: body.email }, data: { emailVerified: true } });
    await prisma.verification.deleteMany({ where: { identifier: `email:${body.email}` } });
    return Response.json({ ok: true });
  } catch (error) {
    return parseError(error);
  }
}
