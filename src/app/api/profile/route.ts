import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users, players } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

/**
 * GET /api/profile - Get current user's profile
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch user data
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user is a player, fetch player data too
    let playerData = null;
    if (user.role === 'player') {
      const [player] = await db
        .select({
          id: players.id,
          name: players.name,
          parentEmail: players.parentEmail,
          photoUrl: players.photoUrl,
          slug: players.slug,
        })
        .from(players)
        .where(eq(players.userId, user.id))
        .limit(1);

      playerData = player || null;
    }

    return NextResponse.json({
      user,
      player: playerData,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

/**
 * PUT /api/profile - Update current user's profile
 */
export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, currentPassword, newPassword, parentEmail } = body;

    // Fetch current user
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password' },
          { status: 400 }
        );
      }

      const isValidPassword = await bcrypt.compare(currentPassword, currentUser.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters' },
          { status: 400 }
        );
      }
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== currentUser.email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 400 }
        );
      }
    }

    // Build update object for users table
    const userUpdate: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name && name.trim()) {
      userUpdate.name = name.trim();
    }

    if (email && email.trim()) {
      userUpdate.email = email.trim().toLowerCase();
    }

    if (newPassword) {
      userUpdate.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    // Update user
    await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, session.user.id));

    // If user is a player and parentEmail is provided, update player record
    if (currentUser.role === 'player') {
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.userId, session.user.id))
        .limit(1);

      if (player) {
        const playerUpdate: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        // Update player name to match user name
        if (name && name.trim()) {
          playerUpdate.name = name.trim();
        }

        // Update parent email if provided
        if (parentEmail !== undefined) {
          playerUpdate.parentEmail = parentEmail?.trim() || null;
        }

        await db
          .update(players)
          .set(playerUpdate)
          .where(eq(players.id, player.id));
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
