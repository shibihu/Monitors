import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildRequestConfig } from '@/lib/monitorEngine';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const service = await prisma.service.findUnique({ where: { id: params.id } });

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const startedAt = Date.now();

  try {
    const config = buildRequestConfig(service.method ?? 'GET', service.requestBody, service.timeoutMs ?? 5000);
    const response = await fetch(service.url, config);
    const latencyMs = Date.now() - startedAt;
    const success = response.ok;
    const nextStatus = success ? 'UP' : 'DOWN';

    await prisma.pingLog.create({
      data: {
        serviceId: service.id,
        statusCode: response.status,
        success,
        latencyMs,
        errorMessage: success ? null : `HTTP ${response.status}`
      }
    });

    await prisma.service.update({
      where: { id: service.id },
      data: {
        status: nextStatus,
        lastCheckedAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ ok: true, status: nextStatus, latencyMs, statusCode: response.status });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;

    await prisma.pingLog.create({
      data: {
        serviceId: service.id,
        statusCode: null,
        success: false,
        latencyMs,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    await prisma.service.update({
      where: { id: service.id },
      data: {
        status: 'DOWN',
        lastCheckedAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ ok: false, status: 'DOWN', latencyMs, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
