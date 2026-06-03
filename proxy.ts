// TODO: when team grows past founders, swap this gate for Supabase Auth with
// per-user accounts and roles (Founder, Media Buyer, Video Editor, VA, Support,
// Ops Manager). Localize this check.

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/_next", "/api/auth", "/favicon.ico"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get("nucleus-session");
  const token = sessionCookie?.value;

  let isAuthenticated = false;

  if (token) {
    const sessionSecret = process.env.SESSION_SECRET;

    if (sessionSecret) {
      try {
        const secret = new TextEncoder().encode(sessionSecret);
        await jwtVerify(token, secret);
        isAuthenticated = true;
      } catch {
        isAuthenticated = false;
      }
    }
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isAuthenticated && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|otf|eot|css|js|map)).*)",
  ],
};
