import { prisma } from "@/features/auth/server/prisma";
import { resetPasswordSchema } from "@/features/auth/server/schemas";
import { hashPassword } from "@/features/auth/server/password";
import { sha256 } from "@/features/auth/server/tokens";
import { jsonError, parseError } from "@/features/auth/server/responses";

export async function POST(request: Request) {
  try {
    const body = resetPasswordSchema.parse(await request.json());
    const reset = await prisma.passwordReset.findUnique({ where: { token: await sha256(body.token) } });
    if (!reset || reset.usedAt || !reset.expiresAt || reset.expiresAt <= new Date() || !reset.userId) return jsonError("重置链接无效或已过期", 400);

    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(body.password) } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: reset.userId } }),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    return parseError(error);
  }
}

