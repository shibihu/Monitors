import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type MonitorState = {
  intervals: Map<string, NodeJS.Timeout>;
};

const monitorState: MonitorState = {
  intervals: new Map()
};

export function buildRequestConfig(method: string, requestBody?: string | null, timeoutMs = 5000) {
  const normalizedMethod = (method || 'GET').toUpperCase();
  const shouldSendBody = !['GET', 'HEAD'].includes(normalizedMethod);

  return {
    method: normalizedMethod,
    signal: AbortSignal.timeout(timeoutMs),
    headers: shouldSendBody ? { 'Content-Type': 'application/json' } : undefined,
    body: shouldSendBody ? requestBody ?? JSON.stringify({}) : undefined
  } satisfies RequestInit;
}

async function sendWebhook(serviceName: string, currentStatus: 'UP' | 'DOWN', previousStatus: 'UP' | 'DOWN' | 'UNKNOWN') {
  const webhookUrl = process.env.WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  const payload = {
    text: `Monitor alert: ${serviceName} changed from ${previousStatus} to ${currentStatus}`
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Webhook dispatch failed:', error);
  }
}

export async function runSingleCheck(serviceId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });

  if (!service) {
    return;
  }

  const startedAt = Date.now();
  const previousStatus = service.status as 'UP' | 'DOWN' | 'UNKNOWN';

  try {
    const config = buildRequestConfig(service.method ?? 'GET', service.requestBody, service.timeoutMs ?? 5000);
    const response = await fetch(service.url, config);

    const latencyMs = Date.now() - startedAt;
    const statusCode = response.status;
    const success = response.ok;
    const nextStatus: 'UP' | 'DOWN' = success ? 'UP' : 'DOWN';

    await prisma.pingLog.create({
      data: {
        serviceId: service.id,
        statusCode,
        success,
        latencyMs,
        errorMessage: success ? null : `HTTP ${statusCode}`
      }
    });

    await prisma.service.update({
      where: { id: service.id },
      data: {
        status: nextStatus,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
        method: service.method || 'GET',
        requestBody: service.requestBody ?? null
      }
    });

    if (previousStatus !== 'UNKNOWN' && previousStatus !== nextStatus) {
      await sendWebhook(service.name, nextStatus, previousStatus);
    }
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const nextStatus: 'DOWN' = 'DOWN';

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
        status: nextStatus,
        lastCheckedAt: new Date(),
        updatedAt: new Date()
      }
    });

    if (previousStatus !== 'DOWN') {
      await sendWebhook(service.name, nextStatus, previousStatus);
    }
  }
}

export async function startMonitorLoop() {
  const services = await prisma.service.findMany();

  for (const service of services) {
    if (monitorState.intervals.has(service.id)) {
      continue;
    }

    const interval = setInterval(async () => {
      await runSingleCheck(service.id);
    }, service.checkIntervalMs || 60000);

    monitorState.intervals.set(service.id, interval);
  }
}

export function stopMonitorLoop() {
  for (const interval of monitorState.intervals.values()) {
    clearInterval(interval);
  }

  monitorState.intervals.clear();
}

export async function ensureDemoUser() {
  return prisma.user.upsert({
    where: { email: 'local@localhost' },
    update: {},
    create: {
      email: 'local@localhost',
      password: 'local-demo-password'
    }
  });
}

export async function ensureServiceExists() {
  await ensureDemoUser();

  const existing = await prisma.service.findFirst();

  if (!existing) {
    await prisma.service.create({
      data: {
        name: 'Example API Gateway',
        url: 'https://example.com',
        status: 'UNKNOWN',
        checkIntervalMs: 60000,
        timeoutMs: 5000
      }
    });
  }
}

process.on('beforeExit', () => {
  stopMonitorLoop();
});
