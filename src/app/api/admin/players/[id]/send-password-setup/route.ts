import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users, players, passwordResetTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, isGmailConfigured, isGmailEnabled } from '@/lib/gmail';
import { getPasswordSetupEmailHtml } from '@/lib/email-templates';
import { getConfig } from '@/lib/config';
import crypto from 'crypto';

const TOKEN_EXPIRY_HOURS = 72; // Password setup token expires in 72 hours (3 days)

/**
 * POST /api/admin/players/[id]/send-password-setup
 * Send a password setup email to a player
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

    // Check if Gmail is configured and enabled
    const gmailConfigured = await isGmailConfigured();
    const gmailEnabled = await isGmailEnabled();

    if (!gmailConfigured || !gmailEnabled) {
      return NextResponse.json(
        { error: 'Email is not configured. Please configure Gmail in settings.' },
        { status: 503 }
      );
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Save the token to the database
    await db.insert(passwordResetTokens).values({
      userId: player.user.id,
      token,
      expiresAt,
    });

    // Generate the setup URL
    const appUrl = await getConfig('APP_URL') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const setupUrl = `${appUrl}/reset-password?token=${token}`;

    // Generate email HTML
    const html = getPasswordSetupEmailHtml({
      playerName: player.player.name,
      setupUrl,
      expiryHours: TOKEN_EXPIRY_HOURS,
    });

    // Send the email
    const result = await sendEmail({
      to: player.user.email,
      subject: 'Set Up Your Fundraiser Account Password',
      html,
    });

    if (!result.success) {
      console.error('Failed to send password setup email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Password setup email sent to ${player.user.email}`,
    });
  } catch (error) {
    console.error('Error sending password setup email:', error);
    return NextResponse.json(
      { error: 'Failed to send password setup email' },
      { status: 500 }
    );
  }
}
