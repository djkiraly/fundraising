import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import DOMPurify from 'isomorphic-dompurify';

// Maximum message length (in characters of HTML)
const MAX_MESSAGE_LENGTH = 5000;

// Configure DOMPurify to allow style attribute with text-align
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  if (data.attrName === 'style') {
    // Only allow text-align styles
    const style = data.attrValue;
    const textAlignMatch = style.match(/text-align:\s*(left|center|right|justify)/i);
    if (textAlignMatch) {
      data.attrValue = `text-align: ${textAlignMatch[1]}`;
    } else {
      data.attrValue = '';
    }
  }
});

/**
 * GET /api/player/message
 * Get the current player's message
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the player associated with this user
    const [player] = await db
      .select({ message: players.message })
      .from(players)
      .where(and(eq(players.userId, session.user.id), isNull(players.deletedAt)))
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json({ message: player.message || '' });
  } catch (error) {
    console.error('Error fetching player message:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/player/message
 * Update the current player's message
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    // Validate message
    if (typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message must be a string' },
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message is too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` },
        { status: 400 }
      );
    }

    // Sanitize the HTML to prevent XSS
    const sanitizedMessage = DOMPurify.sanitize(message, {
      ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 'br'],
      ALLOWED_ATTR: ['style'],
    });

    // Get the player associated with this user
    const [player] = await db
      .select({ id: players.id })
      .from(players)
      .where(and(eq(players.userId, session.user.id), isNull(players.deletedAt)))
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Update the player's message
    await db
      .update(players)
      .set({
        message: sanitizedMessage || null,
        updatedAt: new Date(),
      })
      .where(eq(players.id, player.id));

    return NextResponse.json({
      success: true,
      message: sanitizedMessage,
    });
  } catch (error) {
    console.error('Error updating player message:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}
