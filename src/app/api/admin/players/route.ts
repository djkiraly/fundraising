import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players, squares, users, passwordResetTokens } from '@/db/schema';
import { eq, desc, sql, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateHeartSquares } from '@/lib/squares';
import { generateUniqueSlug } from '@/lib/utils';
import { sendEmail, isGmailConfigured, isGmailEnabled } from '@/lib/gmail';
import { getPasswordSetupEmailHtml } from '@/lib/email-templates';
import { getConfig, isPasswordEmailEnabled } from '@/lib/config';

const PASSWORD_SETUP_TOKEN_EXPIRY_HOURS = 72; // 3 days

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

    // Fetch all active (non-deleted) players with their square stats and user info
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
        lastLogin: users.lastLogin,
      })
      .from(players)
      .leftJoin(users, eq(players.userId, users.id))
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

    // Send password setup email if enabled and user was created
    let emailSent = false;
    let emailError: string | undefined;
    if (userId && email) {
      try {
        const passwordEmailsEnabled = await isPasswordEmailEnabled();
        const gmailConfigured = await isGmailConfigured();
        const gmailEnabled = await isGmailEnabled();

        if (passwordEmailsEnabled && gmailConfigured && gmailEnabled) {
          // Generate a secure random token
          const token = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + PASSWORD_SETUP_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

          // Save the token to the database
          await db.insert(passwordResetTokens).values({
            userId,
            token,
            expiresAt,
          });

          // Generate the setup URL
          const appUrl = await getConfig('APP_URL') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
          const setupUrl = `${appUrl}/reset-password?token=${token}`;

          // Generate email HTML
          const html = getPasswordSetupEmailHtml({
            playerName: name,
            setupUrl,
            expiryHours: PASSWORD_SETUP_TOKEN_EXPIRY_HOURS,
          });

          // Send the email
          const result = await sendEmail({
            to: email.toLowerCase(),
            subject: 'Set Up Your Fundraiser Account Password',
            html,
          });

          emailSent = result.success;
          if (!result.success) {
            emailError = result.error;
            console.error('Failed to send password setup email:', result.error);
          }
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'Failed to send email';
        console.error('Error sending password setup email:', err);
      }
    }

    return NextResponse.json({
      ...newPlayer,
      emailSent: userId ? emailSent : undefined,
      emailError
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating player:', error);
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
}
