import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const key = await prisma.apiKey.update({
    where: { id: params.id },
    data: { revoked: true }
  });

  return NextResponse.json({ key });
}
