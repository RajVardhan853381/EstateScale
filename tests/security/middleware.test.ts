import { describe, it, expect } from 'vitest';
import { middleware } from '../../src/middleware';
import { NextRequest } from 'next/server';

describe('Edge Middleware Protection', () => {
  it('should return 401 JSON for unauthenticated API requests to /api/admin/*', () => {
    const req = new NextRequest('http://localhost:3000/api/admin/ops/orgs');
    const res = middleware(req);

    expect(res.status).toBe(401);
  });

  it('should return 401 JSON for unauthenticated API requests to /api/org/*', () => {
    const req = new NextRequest('http://localhost:3000/api/org/demo/journeys');
    const res = middleware(req);

    expect(res.status).toBe(401);
  });

  it('should redirect unauthenticated page requests to /login with callbackUrl', () => {
    const req = new NextRequest('http://localhost:3000/org/demo/dashboard');
    const res = middleware(req);

    expect(res.status).toBe(307); // NextResponse.redirect default is 307 temporary redirect
    const location = res.headers.get('location');
    expect(location).toContain('/login?callbackUrl=%2Forg%2Fdemo%2Fdashboard');
  });

  it('should allow requests with session token cookie to pass through', () => {
    const req = new NextRequest('http://localhost:3000/org/demo/dashboard', {
      headers: {
        cookie: 'authjs.session-token=valid-jwt-token',
      },
    });
    const res = middleware(req);

    // Status 200 means NextResponse.next()
    expect(res.status).toBe(200);
  });
});
