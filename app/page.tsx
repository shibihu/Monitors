import { Activity, KeyRound, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { DashboardClient } from '@/components/dashboard';
import { prisma } from '@/lib/db';
import { ensureServiceExists, startMonitorLoop } from '@/lib/monitorEngine';

async function getDashboardData() {
  await ensureServiceExists();
  const services = await prisma.service.findMany({ orderBy: { createdAt: 'desc' } });
  const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' } });

  return { services, keys };
}

export default async function HomePage() {
  await getDashboardData();
  startMonitorLoop().catch((error) => console.error('Monitor loop failed:', error));

  return <DashboardClient />;
}
