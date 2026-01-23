import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players, squares, users } from '@/db/schema';
import { eq, desc, sql, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateHeartSquares } from '@/lib/squares';
import { generateUniqueSlug } from '@/lib/utils';

/**
 * GET /api/admin/players
 * List all players with stats
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active (non-deleted) players with their square stats
    const allPlayers = await db
      .select({
        id: players.id,
        userId: players.userId,
        name: players.name,
        photoUrl: players.photoUrl,
        parentEmail: players.parentEmail,
        goal: players.goal,
        totalRaised: players.totalRaised,
        isActive: players.isActive,
        createdAt: players.createdAt,
        updatedAt: players.updatedAt,
      })
      .from(players)
      .where(isNull(players.deletedAt))
      .orderBy(desc(players.createdAt));

    // Get square stats for each player
    const playersWithStats = await Promise.all(
      allPlayers.map(async (player) => {
        const squareStats = await db
          .select({
            total: sql<number>`count(*)`,
            purchased: sql<number>`sum(case when ${squares.isPurchased} then 1 else 0 end)`,
          })
          .from(squares)
          .where(eq(squares.playerId, player.id));

        const stats = squareStats[0] || { total: 0, purchased: 0 };

        return {
          ...player,
          squaresTotal: Number(stats.total) || 0,
          squaresPurchased: Number(stats.purchased) || 0,
        };
      })
    );

    return NextResponse.json(playersWithStats);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/players
 * Create a new player
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, photoUrl, goal, isActive, generateSquares, parentEmail } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Player name is required' },
        { status: 400 }
      );
    }

    // If email and password are provided, create a user account
    let userId: string | null = null;
    if (email && password) {
      // Check if email already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        );
      }

      // Create user
      const passwordHash = await bcrypt.hash(password, 10);
      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          name,
          passwordHash,
          role: 'player',
        })
        .returning();

      userId = newUser.id;
    }

    // Get existing slugs to ensure uniqueness
    const existingSlugs = await db
      .select({ slug: players.slug })
      .from(players);
    const slugList = existingSlugs.map(p => p.slug);

    // Generate unique slug from name
    const slug = generateUniqueSlug(name, slugList);

    // Create the player
    const [newPlayer] = await db
      .insert(players)
      .values({
        userId,
        name,
        slug,
        photoUrl: photoUrl || null,
        parentEmail: parentEmail || null,
        goal: goal ? String(goal) : '100.00',
        isActive: isActive ?? true,
      })
      .returning();

    // Generate squares if requested
    if (generateSquares !== false) {
      await generateHeartSquares(newPlayer.id);
    }

    return NextResponse.json(newPlayer, { status: 201 });
  } catch (error) {
    console.error('Error creating player:', error);
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
}
