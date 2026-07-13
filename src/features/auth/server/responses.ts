import { ZodError } from "zod";

export const AUTH_DATABASE_ERROR_MESSAGE = "认证数据库连接失败，请检查 Cloudflare Pages 的 DATABASE_URL 配置";

export function jsonError(error: string, status = 400): Response {
  return Response.json({ error }, { status });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isDatabaseConfigurationError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const name = error instanceof Error ? error.name : "";
  return /Prisma|P10\d+|P20\d+|DATABASE_URL|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|Can't reach database|Connection terminated|DriverAdapterError/i.test(`${name} ${message}`);
}

export function parseError(error: unknown): Response {
  if (error instanceof ZodError) return jsonError(error.issues[0]?.message ?? "请求参数无效", 400);
  console.error("[AUTH ERROR] unhandled", {
    message: getErrorMessage(error),
    name: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
  });
  if (isDatabaseConfigurationError(error)) {
    return jsonError(AUTH_DATABASE_ERROR_MESSAGE, 503);
  }
  const message = process.env.NODE_ENV === "production" ? "服务器暂时不可用，请稍后重试" : getErrorMessage(error);
  return jsonError(message, 500);
}
