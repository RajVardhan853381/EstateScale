import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  let correlationId = requestHeaders.get('x-correlation-id') || requestHeaders.get('x-request-id');
  if (!correlationId || correlationId.length > 100) {
    correlationId = crypto.randomUUID();
  }
  requestHeaders.set('x-correlation-id', correlationId);
  requestHeaders.set('x-request-id', correlationId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('x-correlation-id', correlationId);
  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
