import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimiter } from '@/lib/rateLimiter';
import { prisma } from '@/lib/db';
import { hashApiKey } from '@/lib/apiKeys';

export async function middleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicDashboardRoute = [
    '/api/health',
    '/api/services',
    '/api/services/',
    '/api/keys',
    '/api/keys/'
  ].some((publicPath) => pathname === publicPath || pathname.startsWith(publicPath));

  if (!isApiRoute || isPublicDashboardRoute) {
    return NextResponse.next();
  }

  const bearer = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : null;

  if (!bearer) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
  }

  const limit = rateLimiter.check(bearer);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfterMs: limit.resetInMs },
      { status: 429 }
    );
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash: hashApiKey(bearer),
      revoked: false
    }
  });

  if (!apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-api-key-id', apiKey.id);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  });

  return response;
}

export const config = {
  matcher: ['/api/:path*']
};
