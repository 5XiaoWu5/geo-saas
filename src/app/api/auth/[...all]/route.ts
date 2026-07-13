import { auth } from "@/features/auth/server/better-auth";

function logBetterAuthError(method: string, error: unknown) {
  console.error(`[AUTH ERROR] better-auth:${method}`, {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    betterAuthSecretPresent: Boolean(process.env.BETTER_AUTH_SECRET),
    runtime: process.env.NEXT_RUNTIME ?? "unknown",
    nodeEnv: process.env.NODE_ENV,
  });
}

export async function GET(request: Request) {
  try {
    return await auth.handler(request);
  } catch (error) {
    logBetterAuthError("GET", error);
    return Response.json({ error: "认证路由暂时不可用" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await auth.handler(request);
  } catch (error) {
    logBetterAuthError("POST", error);
    return Response.json({ error: "认证路由暂时不可用" }, { status: 500 });
  }
}
