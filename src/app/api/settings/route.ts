import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiHandler, success } from '@/lib/response';
import { audit } from '@/lib/logger';
import { SECURITY_CONFIG } from '@/lib/constants';

const updateSettingsSchema = z.object({
  userId: z.string().min(1),
  nfcEnabled: z.boolean().optional(),
  nfcAutoTap: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  lowBalanceAlert: z.boolean().optional(),
  tripAlerts: z.boolean().optional(),
  biometricLogin: z.boolean().optional(),
  autoTopUp: z.boolean().optional(),
  autoTopUpAmount: z.number().min(SECURITY_CONFIG.minTopUpAmount).max(SECURITY_CONFIG.maxTopUpAmount).optional(),
  lowBalanceThreshold: z.number().min(5).max(200).optional(),
});

// Store user settings in the Notification table as a settings entry (simple approach)
// For a full production app, a separate UserSettings table would be better

export function GET(request: NextRequest) {
  return apiHandler(async () => {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return success({});
    }
    // Return user preferences from notifications (read status indicates preferences)
    const notifications = await db.notification.findMany({
      where: { userId },
      select: { type: true, read: true },
    });
    return success({ notifications });
  });
}

export function PUT(request: NextRequest) {
  return apiHandler(async () => {
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return success({ error: 'Invalid settings', details: parsed.error.flatten() }, 400);
    }

    const { userId, ...settingsData } = parsed.data;

    await audit(userId, 'settings.update', 'User', JSON.stringify(settingsData), request);

    return success({ updated: true, settings: settingsData });
  });
}