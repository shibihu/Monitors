export async function GET() {
  return Response.json({
    ok: true,
    service: 'uptime-monitor-dashboard',
    timestamp: new Date().toISOString()
  });
}
