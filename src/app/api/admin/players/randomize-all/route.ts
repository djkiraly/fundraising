import { NextResponse } from 'next/server';
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
 * POST /api/admin/players/randomize-all
 * Randomize the dollar values of unpurchased squares for all players
 */
export async function POST() {
  // Check authentication
  const session = await auth();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all players
    const allPlayers = await db.select().from(players);

    let totalSquaresUpdated = 0;
    const results: Array<{ playerName: string; squaresUpdated: number }> = [];

    for (const player of allPlayers) {
      // Get unpurchased squares for this player
      const unpurchasedSquares = await db
        .select()
        .from(squares)
        .where(
          and(
            eq(squares.playerId, player.id),
            eq(squares.isPurchased, false)
          )
        );

      if (unpurchasedSquares.length === 0) {
        results.push({ playerName: player.name, squaresUpdated: 0 });
        continue;
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

      totalSquaresUpdated += unpurchasedSquares.length;
      results.push({ playerName: player.name, squaresUpdated: unpurchasedSquares.length });
    }

    return NextResponse.json({
      success: true,
      message: `Randomized squares for ${allPlayers.length} players`,
      totalSquaresUpdated,
      values: SQUARE_VALUES,
      results,
    });
  } catch (error) {
    console.error('Error randomizing all squares:', error);
    return NextResponse.json(
      { error: 'Failed to randomize squares' },
      { status: 500 }
    );
  }
}
