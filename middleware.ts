import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/features/auth/server/constants";

const authPages = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];
const publicPrefixes = ["/api/auth", "/api/projects", "/api/internal", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const isAuthPage = authPages.some((page) => pathname === page || pathname.startsWith(`${page}/`));

  if (!hasSession && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};




