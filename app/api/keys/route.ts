import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateApiKey, hashApiKey } from '@/lib/apiKeys';
import { ensureDemoUser } from '@/lib/monitorEngine';

export async function GET() {
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name } = body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const user = await ensureDemoUser();
  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);

  const key = await prisma.apiKey.create({
    data: {
      name: name.trim(),
      keyHash,
      userId: user.id,
      revoked: false
    }
  });

  return NextResponse.json({
    key: rawKey,
    record: key
  }, { status: 201 });
}
