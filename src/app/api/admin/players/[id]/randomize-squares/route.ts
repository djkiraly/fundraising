import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players, squares } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSquareRandomizationConfig } from '@/lib/config';

// Valid US dollar bill denominations
const DOLLAR_DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100];

/**
 * Generate random square values using config min/max values
 * Only generates valid US dollar bill denominations ($1, $2, $5, $10, $20, $50, $100)
 */
function generateSquareValues(count: number, minValue: number, maxValue: number): number[] {
  if (count === 0) return [];

  // Filter denominations to only those within the min/max range
  const validDenominations = DOLLAR_DENOMINATIONS.filter(
    d => d >= minValue && d <= maxValue
  );

  // Fallback to closest valid denomination if none in range
  if (validDenominations.length === 0) {
    const closest = DOLLAR_DENOMINATIONS.reduce((prev, curr) =>
      Math.abs(curr - minValue) < Math.abs(prev - minValue) ? curr : prev
    );
    validDenominations.push(closest);
  }

  const values: number[] = [];

  // Generate random values from valid denominations
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * validDenominations.length);
    values.push(validDenominations[randomIndex]);
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

    // Get square configuration from admin settings
    const config = await getSquareRandomizationConfig();
    const { minValue, maxValue } = config;

    // Generate new random values using config
    const newValues = generateSquareValues(unpurchasedSquares.length, minValue, maxValue);

    // Update each square with its new value (whole dollar amounts)
    for (let i = 0; i < unpurchasedSquares.length; i++) {
      await db
        .update(squares)
        .set({ value: String(newValues[i]) })
        .where(eq(squares.id, unpurchasedSquares[i].id));
    }

    // Calculate actual total
    const actualTotal = newValues.reduce((sum, v) => sum + v, 0);

    // Count distribution by value
    const valueCounts = newValues.reduce((acc, v) => {
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return NextResponse.json({
      success: true,
      message: `Randomized ${unpurchasedSquares.length} squares`,
      squaresUpdated: unpurchasedSquares.length,
      config: { minValue, maxValue },
      distribution: valueCounts,
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
