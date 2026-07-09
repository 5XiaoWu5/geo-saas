import { ZodError } from "zod";

export function jsonError(error: string, status = 400): Response {
  return Response.json({ error }, { status });
}

export function parseError(error: unknown): Response {
  if (error instanceof ZodError) return jsonError(error.issues[0]?.message ?? "Invalid request.", 400);
  console.error(error);
  return jsonError("Internal server error.", 500);
}
