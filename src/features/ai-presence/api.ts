import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AIPresenceError } from "./service";

export function aiPresenceApiError(error: unknown) {
  if (error instanceof AIPresenceError) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "INVALID_INPUT", fields: error.flatten().fieldErrors }, { status: 422 });
  }
  return NextResponse.json({ error: "AI_PRESENCE_REQUEST_FAILED" }, { status: 500 });
}
