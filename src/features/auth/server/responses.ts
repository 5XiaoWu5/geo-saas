import { ZodError } from "zod";

export function jsonError(error: string, status = 400): Response {
  return Response.json({ error }, { status });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function parseError(error: unknown): Response {
  if (error instanceof ZodError) return jsonError(error.issues[0]?.message ?? "请求参数无效", 400);
  console.error("[AUTH ERROR] unhandled", {
    message: getErrorMessage(error),
    name: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack : undefined,
  });
  const message = process.env.NODE_ENV === "production" ? "服务器暂时不可用，请稍后重试" : getErrorMessage(error);
  return jsonError(message, 500);
}
