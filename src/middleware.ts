import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  // Check for NextAuth session token in cookies
  const sessionToken =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value ||
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  const isProtectedApiPath =
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/org') ||
    pathname.startsWith('/api/onboarding');
  const isProtectedPagePath =
    pathname.startsWith('/org') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/onboarding');

  if (!sessionToken) {
    if (isProtectedApiPath) {
      const response = NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
      response.headers.set('x-request-id', requestId);
      return response;
    }

    if (isProtectedPagePath) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.headers.set('x-request-id', requestId);
      return response;
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('x-request-id', requestId);
  return response;
}

export const config = {
  matcher: [
    '/org/:path*',
    '/admin/:path*',
    '/onboarding/:path*',
    '/api/admin/:path*',
    '/api/org/:path*',
    '/api/onboarding/:path*',
  ],
};

