import { ZodError } from "zod";

export const AUTH_DATABASE_ERROR_MESSAGE = "\u8ba4\u8bc1\u6570\u636e\u5e93\u8fde\u63a5\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5 Cloudflare Pages \u7684 DATABASE_URL \u914d\u7f6e";

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
  if (error instanceof ZodError) return jsonError(error.issues[0]?.message ?? "\u8bf7\u6c42\u53c2\u6570\u65e0\u6548", 400);
  console.error("[AUTH ERROR] unhandled", {
    message: getErrorMessage(error),
    name: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
  });
  if (isDatabaseConfigurationError(error)) {
    return jsonError(AUTH_DATABASE_ERROR_MESSAGE, 503);
  }
  const message = process.env.NODE_ENV === "production" ? "\u670d\u52a1\u5668\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5" : getErrorMessage(error);
  return jsonError(message, 500);
}
