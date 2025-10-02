import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.headers.set("Access-Control-Allow-Origin", req.headers.get("origin") || "*");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-access-token, x-refresh-token, x-force-refresh");
    res.headers.set("Access-Control-Allow-Credentials", "true");
    return res;
  }

  // Handle API routes - just pass through for now
  if (pathname.startsWith('/api/')) {
    return res;
  }

  // Handle page routes - check authentication
  const accessToken = req.cookies.get('x-access-token')?.value;
  const refreshToken = req.cookies.get('x-refresh-token')?.value;
  const isLoggedIn = !!(accessToken || refreshToken);

  // Redirect unauthenticated users away from protected routes
  if (pathname.startsWith('/companies') || pathname.startsWith('/documents') || pathname.startsWith('/chat') || pathname.startsWith('/profile')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/companies', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};


