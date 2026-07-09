import { getCurrentUser } from "@/features/auth/server/session";

export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ user });
}
