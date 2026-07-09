import { ZodError } from "zod";

export function jsonError(error: string, status = 400): Response {
  return Response.json({ error }, { status });
}

export function parseError(error: unknown): Response {
  if (error instanceof ZodError) return jsonError(error.issues[0]?.message ?? "请求参数无效", 400);
  console.error(error);
  return jsonError("服务器暂时不可用，请稍后重试", 500);
}
