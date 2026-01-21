import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players, squares } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Fixed dollar values for squares
const SQUARE_VALUES = [5, 10, 20];

/**
 * Generate random square values with even distribution of $5, $10, $20
 */
function generateSquareValues(count: number): number[] {
  if (count === 0) return [];

  const values: number[] = [];

  // Distribute evenly across the three values
  const perValue = Math.floor(count / 3);
  const remainder = count % 3;

  // Add base distribution
  for (let i = 0; i < 3; i++) {
    const extraOne = i < remainder ? 1 : 0;
    for (let j = 0; j < perValue + extraOne; j++) {
      values.push(SQUARE_VALUES[i]);
    }
  }

  // Shuffle the values using Fisher-Yates algorithm
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }

  return values;
}

/**
 * POST /api/admin/players/[id]/randomize-squares
 * Randomize the dollar values of unpurchased squares for a player
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: playerId } = await params;

  try {
    // Verify player exists
    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get unpurchased squares for this player
    const unpurchasedSquares = await db
      .select()
      .from(squares)
      .where(
        and(
          eq(squares.playerId, playerId),
          eq(squares.isPurchased, false)
        )
      );

    if (unpurchasedSquares.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unpurchased squares to randomize',
        squaresUpdated: 0,
      });
    }

    // Generate new random values ($5, $10, $20 with even distribution)
    const newValues = generateSquareValues(unpurchasedSquares.length);

    // Update each square with its new value
    for (let i = 0; i < unpurchasedSquares.length; i++) {
      await db
        .update(squares)
        .set({ value: newValues[i].toFixed(2) })
        .where(eq(squares.id, unpurchasedSquares[i].id));
    }

    // Calculate actual total
    const actualTotal = newValues.reduce((sum, v) => sum + v, 0);

    // Count distribution
    const distribution = {
      $5: newValues.filter(v => v === 5).length,
      $10: newValues.filter(v => v === 10).length,
      $20: newValues.filter(v => v === 20).length,
    };

    return NextResponse.json({
      success: true,
      message: `Randomized ${unpurchasedSquares.length} squares`,
      squaresUpdated: unpurchasedSquares.length,
      distribution,
      actualTotal: actualTotal.toFixed(2),
    });
  } catch (error) {
    console.error('Error randomizing squares:', error);
    return NextResponse.json(
      { error: 'Failed to randomize squares' },
      { status: 500 }
    );
  }
}
