import { NextRequest, NextResponse } from "next/server";
import { rateLimit, createRateLimitResponse } from "./lib/rate-limiter-edge";

export async function middleware(req: NextRequest) {
  console.log('🚀 Middleware called:', {
    pathname: req.nextUrl?.pathname,
    method: req.method,
    url: req.url
  });
  
  const { pathname } = req.nextUrl;

  // CORS preflight
  if (req.method === "OPTIONS") {
    console.log('🔄 Handling CORS preflight');
    try {
      const preflight = new NextResponse(null, { status: 204 });
      preflight.headers.set("Access-Control-Allow-Origin", req.headers.get("origin") || "*");
      preflight.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      preflight.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-access-token, x-refresh-token, x-force-refresh");
      preflight.headers.set("Access-Control-Allow-Credentials", "true");
      console.log('✅ CORS headers set successfully');
      return preflight;
    } catch (error) {
      console.error('❌ Could not set CORS headers:', error);
      return new NextResponse(null, { status: 204 });
    }
  }

  // Handle API routes with rate limiting
  if (pathname.startsWith('/api/')) {
    console.log('🔌 Processing API route:', pathname);
    
    // Skip rate limiting for certain endpoints
    const skipRateLimit = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/health'
    ].some(endpoint => pathname.startsWith(endpoint));

    console.log('⏭️ Skip rate limit:', skipRateLimit);

    if (!skipRateLimit) {
      try {
        console.log('🛡️ Applying rate limiting...');
        const rateLimitResult = await rateLimit(req);
        
        console.log('📊 Rate limit result:', rateLimitResult);
        
        if (!rateLimitResult.success) {
          console.log('🚫 Rate limit exceeded, returning 429');
          return createRateLimitResponse(rateLimitResult);
        }
        
        console.log('✅ Rate limit passed');
        // Don't set headers in middleware - let API routes handle it
        // setRateLimitHeaders(res, rateLimitResult);
      } catch (error) {
        console.error('❌ Rate limiting error:', error);
        // Continue without rate limiting if there's an error
      }
    }
    
    console.log('➡️ Returning response for API route');
    return NextResponse.next();
  }

  // Handle page routes - check authentication
  console.log('📄 Processing page route:', pathname);
  
  const accessToken = req.cookies.get('x-access-token')?.value;
  const refreshToken = req.cookies.get('x-refresh-token')?.value;
  const isLoggedIn = !!(accessToken || refreshToken);

  console.log('🔐 Auth status:', { isLoggedIn, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

  // Redirect unauthenticated users away from protected routes
  if (pathname.startsWith('/companies') || pathname.startsWith('/documents') || pathname.startsWith('/chat') || pathname.startsWith('/profile')) {
    if (!isLoggedIn) {
      console.log('🚫 Redirecting unauthenticated user to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    if (isLoggedIn) {
      console.log('✅ Redirecting authenticated user to companies');
      return NextResponse.redirect(new URL('/companies', req.url));
    }
  }

  // Handle root route here to avoid double redirects
  if (pathname === '/') {
    console.log('🏠 Root route detected. Redirecting based on auth state.');
    return NextResponse.redirect(new URL(isLoggedIn ? '/companies' : '/login', req.url));
  }

  console.log('➡️ Returning response for page route');
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};


