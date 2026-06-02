import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { ConfigError } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('Middleware');

const PROTECTED_ROUTES = ['/dashboard'];
const AUTH_ROUTES = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  log.debug('middleware invoked', { pathname });

  let user = null;
  let supabaseResponse = NextResponse.next({ request });

  try {
    const sessionResult = await updateSession(request);
    user = sessionResult.user;
    supabaseResponse = sessionResult.supabaseResponse;
  } catch (error) {
    if (error instanceof ConfigError) {
      log.warn('Configuration error in middleware, falling back to unauthenticated', { message: error.message });
      const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
      if (isProtected) {
        // Let the request pass through so the page can throw the ConfigError
        // and display the clear error screen via error.tsx.
        return NextResponse.next();
      }
      // For public routes, proceed as unauthenticated to render gracefully.
      return NextResponse.next();
    }
    throw error;
  }

  // If accessing a protected route without auth, redirect to login
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  if (isProtected && !user) {
    log.info('Unauthenticated access to protected route, redirecting to /login', { pathname });
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirectTo', pathname);
    return Response.redirect(loginUrl);
  }

  // If authenticated user visits login, redirect to dashboard
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  if (isAuthRoute && user) {
    log.info('Authenticated user on auth route, redirecting to /dashboard', { pathname });
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    return Response.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (svg, png, jpg, etc.)
     * - auth/callback (handled by route handler)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
