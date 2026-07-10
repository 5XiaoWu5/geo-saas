import { getCloudflareContext } from "@opennextjs/cloudflare";
import { prisma } from "@/features/auth/server/prisma";

function errorInfo(error: unknown) {
  return {
    name: error instanceof Error ? error.name : undefined,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack?.split("\n").slice(0, 4).join("\n") : undefined,
  };
}

export async function GET() {
  let cloudflareEnv: Record<string, unknown> = {};
  try {
    cloudflareEnv = getCloudflareContext().env as Record<string, unknown>;
  } catch (error) {
    cloudflareEnv = { contextError: errorInfo(error) };
  }

  try {
    const userCount = await prisma.user.count();
    return Response.json({
      ok: true,
      processEnv: {
        databaseUrlPresent: Boolean(process.env.DATABASE_URL),
        betterAuthSecretPresent: Boolean(process.env.BETTER_AUTH_SECRET),
        betterAuthUrlPresent: Boolean(process.env.BETTER_AUTH_URL),
      },
      cloudflareEnv: {
        databaseUrlPresent: typeof cloudflareEnv.DATABASE_URL === "string" && cloudflareEnv.DATABASE_URL.length > 0,
        betterAuthSecretPresent: typeof cloudflareEnv.BETTER_AUTH_SECRET === "string" && cloudflareEnv.BETTER_AUTH_SECRET.length > 0,
        betterAuthUrlPresent: typeof cloudflareEnv.BETTER_AUTH_URL === "string" && cloudflareEnv.BETTER_AUTH_URL.length > 0,
        contextError: cloudflareEnv.contextError,
      },
      userCount,
    });
  } catch (error) {
    return Response.json({
      ok: false,
      processEnv: {
        databaseUrlPresent: Boolean(process.env.DATABASE_URL),
        betterAuthSecretPresent: Boolean(process.env.BETTER_AUTH_SECRET),
        betterAuthUrlPresent: Boolean(process.env.BETTER_AUTH_URL),
      },
      cloudflareEnv: {
        databaseUrlPresent: typeof cloudflareEnv.DATABASE_URL === "string" && cloudflareEnv.DATABASE_URL.length > 0,
        betterAuthSecretPresent: typeof cloudflareEnv.BETTER_AUTH_SECRET === "string" && cloudflareEnv.BETTER_AUTH_SECRET.length > 0,
        betterAuthUrlPresent: typeof cloudflareEnv.BETTER_AUTH_URL === "string" && cloudflareEnv.BETTER_AUTH_URL.length > 0,
        contextError: cloudflareEnv.contextError,
      },
      error: errorInfo(error),
    }, { status: 500 });
  }
}
