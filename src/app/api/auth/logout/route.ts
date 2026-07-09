import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/features/auth/server/constants";
import { destroySession, sessionCookieOptions } from "@/features/auth/server/session";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  await destroySession(token);
  cookieStore.set(AUTH_COOKIE_NAME, "", { ...sessionCookieOptions(), maxAge: 0 });
  return Response.json({ ok: true });
}
