import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { auditLogs, users, players, donations } from '@/db/schema';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * GET /api/admin/audit-logs
 * Get audit logs with optional filtering
 * Query params:
 * - eventType: filter by event type
 * - userId: filter by user ID
 * - playerId: filter by player ID
 * - startDate: filter by start date (ISO string)
 * - endDate: filter by end date (ISO string)
 * - limit: number of records to return (default 50, max 200)
 * - offset: pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const eventType = searchParams.get('eventType');
    const userId = searchParams.get('userId');
    const playerId = searchParams.get('playerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build conditions array
    const conditions = [];

    if (eventType) {
      conditions.push(eq(auditLogs.eventType, eventType as typeof auditLogs.eventType.enumValues[number]));
    }

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    if (playerId) {
      conditions.push(eq(auditLogs.playerId, playerId));
    }

    if (startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(endDate)));
    }

    // Get logs with related data
    const logs = await db
      .select({
        id: auditLogs.id,
        eventType: auditLogs.eventType,
        userId: auditLogs.userId,
        playerId: auditLogs.playerId,
        donationId: auditLogs.donationId,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
        playerName: players.name,
        donationAmount: donations.amount,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(players, eq(auditLogs.playerId, players.id))
      .leftJoin(donations, eq(auditLogs.donationId, donations.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Parse details JSON for each log
    const parsedLogs = logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));

    return NextResponse.json({
      logs: parsedLogs,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
