import { success, apiHandler } from '@/lib/response';
import { db } from '@/lib/db';

export function GET() {
  return apiHandler(async () => {
    let database: string;

    try {
      await db.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch {
      database = 'disconnected';
    }

    return success({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database,
      uptime: Math.floor(process.uptime()),
    });
  });
}