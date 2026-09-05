import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { name, url, method, requestBody } = body ?? {};

  if (!name || !url) {
    return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'URL must be a valid absolute URL' }, { status: 400 });
  }

  const service = await prisma.service.update({
    where: { id: params.id },
    data: {
      name,
      url,
      method: String(method ?? 'GET').toUpperCase(),
      requestBody: requestBody ? String(requestBody) : null,
      updatedAt: new Date()
    }
  });

  return NextResponse.json({ service });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await prisma.pingLog.deleteMany({ where: { serviceId: params.id } });
  await prisma.service.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
