import { auth } from "@/features/auth/server/better-auth";

export const GET = auth.handler;
export const POST = auth.handler;
