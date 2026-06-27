import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "next_slide_session";
const protectedRoutes = ["/dashboard", "/modules", "/users", "/license", "/settings"];
const authRoutes = ["/login", "/register"];

function adminCsp() {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ");
}

function playerCsp() {
  return [
    "default-src 'self' https: data: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'self' https: data: blob:",
    "media-src 'self' https: data: blob:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join("; ");
}

function proxyCsp() {
  return [
    "default-src 'none'",
    "script-src https: 'unsafe-inline' 'unsafe-eval'",
    "style-src https: 'unsafe-inline'",
    "img-src https: data: blob:",
    "font-src https: data:",
    "connect-src https:",
    "frame-src https: data: blob:",
    "media-src https: data: blob:",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "base-uri 'none'",
    "form-action 'none'"
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isProtected && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();
  const isPlayerRoute = pathname.startsWith("/play");
  const isProxyRoute = pathname.startsWith("/api/proxy");
  response.headers.set("Content-Security-Policy", isProxyRoute ? proxyCsp() : isPlayerRoute ? playerCsp() : adminCsp());
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", isProxyRoute ? "no-referrer" : "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

  if (!isPlayerRoute && !isProxyRoute) {
    response.headers.set("X-Frame-Options", "DENY");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"]
};
