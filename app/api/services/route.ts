import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const services = await prisma.service.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, url, method, requestBody, checkIntervalMs, timeoutMs } = body ?? {};

  if (!name || !url) {
    return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'URL must be a valid absolute URL' }, { status: 400 });
  }

  const normalizedMethod = String(method ?? 'GET').toUpperCase();

  const service = await prisma.service.create({
    data: {
      name,
      url,
      method: normalizedMethod,
      requestBody: requestBody ? String(requestBody) : null,
      status: 'UNKNOWN',
      checkIntervalMs: Number(checkIntervalMs ?? 60000),
      timeoutMs: Number(timeoutMs ?? 5000)
    }
  });

  return NextResponse.json({ service }, { status: 201 });
}
