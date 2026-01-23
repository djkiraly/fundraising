import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players, squares, donations, users, passwordResetTokens, auditLogs, settingsAuditLog, donationsAuditLog } from '@/db/schema';
import { eq, isNotNull } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/players/[id]/purge
 * Permanently delete a soft-deleted player and all associated data
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
        { error: 'Player is not deleted. Soft delete the player first before purging.' },
        { status: 400 }
      );
    }

    // Get counts for the response
    const [squareCount] = await db
      .select({ count: eq(squares.playerId, id) })
      .from(squares)
      .where(eq(squares.playerId, id));

    const [donationCount] = await db
      .select({ count: eq(donations.playerId, id) })
      .from(donations)
      .where(eq(donations.playerId, id));

    // Store userId before deleting player
    const userId = existingPlayer.userId;

    // Delete squares first (due to foreign key constraints)
    await db.delete(squares).where(eq(squares.playerId, id));

    // Delete donations audit logs for this player
    await db.delete(donationsAuditLog).where(eq(donationsAuditLog.playerId, id));

    // Delete donations
    await db.delete(donations).where(eq(donations.playerId, id));

    // Delete audit logs for this player
    await db.delete(auditLogs).where(eq(auditLogs.playerId, id));

    // Delete the player
    await db.delete(players).where(eq(players.id, id));

    // Delete the linked user account and related records if it exists
    let userDeleted = false;
    if (userId) {
      // Delete password reset tokens for this user
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

      // Delete audit logs for this user
      await db.delete(auditLogs).where(eq(auditLogs.userId, userId));

      // Delete settings audit logs for this user
      await db.delete(settingsAuditLog).where(eq(settingsAuditLog.userId, userId));

      // Delete donations audit logs for this user
      await db.delete(donationsAuditLog).where(eq(donationsAuditLog.userId, userId));

      // Delete the user account
      await db.delete(users).where(eq(users.id, userId));
      userDeleted = true;
    }

    return NextResponse.json({
      success: true,
      message: `Player "${existingPlayer.name}" and all associated data permanently deleted${userDeleted ? ' (including user account)' : ''}`,
      deleted: {
        playerName: existingPlayer.name,
        userAccountDeleted: userDeleted,
      },
    });
  } catch (error) {
    console.error('Error purging player:', error);
    return NextResponse.json(
      { error: 'Failed to purge player' },
      { status: 500 }
    );
  }
}
