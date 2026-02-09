import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users, players } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * POST /api/admin/players/[id]/set-password
 * Directly set a player's password (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { password } = await request.json();

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Get player with user info
    const [player] = await db
      .select({
        player: players,
        user: users,
      })
      .from(players)
      .leftJoin(users, eq(players.userId, users.id))
      .where(eq(players.id, id))
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (!player.user) {
      return NextResponse.json(
        { error: 'Player does not have a login account' },
        { status: 400 }
      );
    }

    // Hash the password and update
    const passwordHash = await bcrypt.hash(password, 10);

    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, player.user.id));

    return NextResponse.json({
      success: true,
      message: `Password updated for ${player.player.name}`,
    });
  } catch (error) {
    console.error('Error setting player password:', error);
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}
