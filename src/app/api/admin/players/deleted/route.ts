import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players, squares, donations, users } from '@/db/schema';
import { eq, desc, sql, isNotNull } from 'drizzle-orm';

/**
 * GET /api/admin/players/deleted
 * List all soft-deleted players
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all soft-deleted players with their stats
    const deletedPlayers = await db
      .select({
        id: players.id,
        userId: players.userId,
        name: players.name,
        photoUrl: players.photoUrl,
        parentEmail: players.parentEmail,
        goal: players.goal,
        totalRaised: players.totalRaised,
        isActive: players.isActive,
        deletedAt: players.deletedAt,
        createdAt: players.createdAt,
        updatedAt: players.updatedAt,
      })
      .from(players)
      .where(isNotNull(players.deletedAt))
      .orderBy(desc(players.deletedAt));

    // Get stats for each deleted player
    const playersWithStats = await Promise.all(
      deletedPlayers.map(async (player) => {
        // Get square stats
        const squareStats = await db
          .select({
            total: sql<number>`count(*)`,
            purchased: sql<number>`sum(case when ${squares.isPurchased} then 1 else 0 end)`,
          })
          .from(squares)
          .where(eq(squares.playerId, player.id));

        const stats = squareStats[0] || { total: 0, purchased: 0 };

        // Get donation count
        const [donationStats] = await db
          .select({
            count: sql<number>`count(*)`,
            total: sql<number>`coalesce(sum(${donations.amount}), 0)`,
          })
          .from(donations)
          .where(eq(donations.playerId, player.id));

        // Get linked user email if exists
        let userEmail = null;
        if (player.userId) {
          const [user] = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, player.userId))
            .limit(1);
          userEmail = user?.email || null;
        }

        return {
          ...player,
          userEmail,
          squaresTotal: Number(stats.total) || 0,
          squaresPurchased: Number(stats.purchased) || 0,
          donationsCount: Number(donationStats?.count) || 0,
          donationsTotal: Number(donationStats?.total) || 0,
        };
      })
    );

    return NextResponse.json(playersWithStats);
  } catch (error) {
    console.error('Error fetching deleted players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deleted players' },
      { status: 500 }
    );
  }
}
