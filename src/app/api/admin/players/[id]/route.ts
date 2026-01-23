import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players, squares, donations, users } from '@/db/schema';
import { eq, sql, ne } from 'drizzle-orm';
import { generateUniqueSlug } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/players/[id]
 * Get a single player with full details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, id))
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get square stats
    const squareStats = await db
      .select({
        total: sql<number>`count(*)`,
        purchased: sql<number>`sum(case when ${squares.isPurchased} then 1 else 0 end)`,
        totalValue: sql<number>`sum(${squares.value})`,
        purchasedValue: sql<number>`sum(case when ${squares.isPurchased} then ${squares.value} else 0 end)`,
      })
      .from(squares)
      .where(eq(squares.playerId, id));

    const stats = squareStats[0] || { total: 0, purchased: 0, totalValue: 0, purchasedValue: 0 };

    // Get donation count
    const [donationStats] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(donations)
      .where(eq(donations.playerId, id));

    // Get linked user info if exists
    let userInfo = null;
    if (player.userId) {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, player.userId))
        .limit(1);
      userInfo = user || null;
    }

    return NextResponse.json({
      ...player,
      user: userInfo,
      stats: {
        squaresTotal: Number(stats.total) || 0,
        squaresPurchased: Number(stats.purchased) || 0,
        squaresTotalValue: Number(stats.totalValue) || 0,
        squaresPurchasedValue: Number(stats.purchasedValue) || 0,
        donationsCount: Number(donationStats?.count) || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/players/[id]
 * Update a player
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, photoUrl, goal, isActive, email, parentEmail } = body;

    // Check if player exists
    const [existingPlayer] = await db
      .select()
      .from(players)
      .where(eq(players.id, id))
      .limit(1);

    if (!existingPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Update linked user's email if provided and user exists
    if (email !== undefined && existingPlayer.userId) {
      // Check if email is already used by another user
      const [existingUserWithEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUserWithEmail && existingUserWithEmail.id !== existingPlayer.userId) {
        return NextResponse.json(
          { error: 'Email is already in use by another account' },
          { status: 400 }
        );
      }

      // Update the user's email
      await db
        .update(users)
        .set({ email, updatedAt: new Date() })
        .where(eq(users.id, existingPlayer.userId));
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name;
      // Regenerate slug when name changes
      const existingSlugs = await db
        .select({ slug: players.slug })
        .from(players)
        .where(ne(players.id, id));
      const slugList = existingSlugs.map(p => p.slug);
      updateData.slug = generateUniqueSlug(name, slugList);
    }
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (goal !== undefined) updateData.goal = String(goal);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (parentEmail !== undefined) updateData.parentEmail = parentEmail;

    const [updatedPlayer] = await db
      .update(players)
      .set(updateData)
      .where(eq(players.id, id))
      .returning();

    // Get updated user info for response
    let userInfo = null;
    if (updatedPlayer.userId) {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, updatedPlayer.userId))
        .limit(1);
      userInfo = user || null;
    }

    return NextResponse.json({
      ...updatedPlayer,
      user: userInfo,
    });
  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/players/[id]
 * Soft delete a player (sets deletedAt timestamp)
 * Player records, donations, and squares are preserved for archival purposes
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if player exists and is not already deleted
    const [existingPlayer] = await db
      .select()
      .from(players)
      .where(eq(players.id, id))
      .limit(1);

    if (!existingPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (existingPlayer.deletedAt) {
      return NextResponse.json({ error: 'Player is already deleted' }, { status: 400 });
    }

    // Soft delete: set deletedAt timestamp instead of deleting
    await db
      .update(players)
      .set({
        deletedAt: new Date(),
        isActive: false, // Also deactivate the player
        updatedAt: new Date(),
      })
      .where(eq(players.id, id));

    return NextResponse.json({ success: true, message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Error deleting player:', error);
    return NextResponse.json(
      { error: 'Failed to delete player' },
      { status: 500 }
    );
  }
}
