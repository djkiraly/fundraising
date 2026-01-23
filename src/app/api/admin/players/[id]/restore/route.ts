import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/players/[id]/restore
 * Restore a soft-deleted player
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if player exists and is soft-deleted
    const [existingPlayer] = await db
      .select()
      .from(players)
      .where(eq(players.id, id))
      .limit(1);

    if (!existingPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (!existingPlayer.deletedAt) {
      return NextResponse.json(
        { error: 'Player is not deleted' },
        { status: 400 }
      );
    }

    // Restore the player by clearing deletedAt
    const [restoredPlayer] = await db
      .update(players)
      .set({
        deletedAt: null,
        isActive: true, // Optionally reactivate the player
        updatedAt: new Date(),
      })
      .where(eq(players.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: `Player "${restoredPlayer.name}" has been restored`,
      player: restoredPlayer,
    });
  } catch (error) {
    console.error('Error restoring player:', error);
    return NextResponse.json(
      { error: 'Failed to restore player' },
      { status: 500 }
    );
  }
}
