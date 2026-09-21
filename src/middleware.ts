import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/config";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/upload",
  "/analytics",
  "/predictions",
  "/anomalies",
  "/recommendations",
  "/assistant",
  "/simulator",
  "/reports",
  "/settings",
  "/organization",
  "/profile",
  "/help",
];

const AUTH_PAGES = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.includes(pathname) && hasCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/analytics/:path*",
    "/predictions/:path*",
    "/anomalies/:path*",
    "/recommendations/:path*",
    "/assistant/:path*",
    "/simulator/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/organization/:path*",
    "/profile/:path*",
    "/help/:path*",
    "/login",
    "/register",
  ],
};
