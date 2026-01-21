import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { settingsAuditLog, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { decrypt, maskSecret } from '@/lib/encryption';

/**
 * GET /api/admin/settings/audit
 * Fetch settings audit log (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const settingKey = searchParams.get('key');

    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // Build query
    let query = db
      .select({
        id: settingsAuditLog.id,
        settingId: settingsAuditLog.settingId,
        settingKey: settingsAuditLog.settingKey,
        userId: settingsAuditLog.userId,
        action: settingsAuditLog.action,
        oldValue: settingsAuditLog.oldValue,
        newValue: settingsAuditLog.newValue,
        createdAt: settingsAuditLog.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(settingsAuditLog)
      .leftJoin(users, eq(settingsAuditLog.userId, users.id))
      .orderBy(desc(settingsAuditLog.createdAt))
      .limit(limit)
      .offset(offset);

    if (settingKey) {
      query = query.where(eq(settingsAuditLog.settingKey, settingKey)) as typeof query;
    }

    const logs = await query;

    // Process logs to mask secret values
    const processedLogs = logs.map((log) => {
      let oldValueDisplay = log.oldValue;
      let newValueDisplay = log.newValue;

      // Check if this looks like an encrypted value (base64 encoded)
      const isEncrypted = (value: string | null) => {
        if (!value) return false;
        // Base64 pattern with minimum length for encrypted content
        return value.length > 50 && /^[A-Za-z0-9+/=]+$/.test(value);
      };

      if (log.oldValue && isEncrypted(log.oldValue)) {
        try {
          const decrypted = decrypt(log.oldValue);
          oldValueDisplay = maskSecret(decrypted);
        } catch {
          oldValueDisplay = '****';
        }
      }

      if (log.newValue && isEncrypted(log.newValue)) {
        try {
          const decrypted = decrypt(log.newValue);
          newValueDisplay = maskSecret(decrypted);
        } catch {
          newValueDisplay = '****';
        }
      }

      return {
        id: log.id,
        settingKey: log.settingKey,
        action: log.action,
        oldValue: oldValueDisplay,
        newValue: newValueDisplay,
        createdAt: log.createdAt,
        user: log.userName
          ? { name: log.userName, email: log.userEmail }
          : null,
      };
    });

    return NextResponse.json({ logs: processedLogs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
