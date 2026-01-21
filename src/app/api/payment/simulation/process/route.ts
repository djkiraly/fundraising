import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { squares, donations, players } from '@/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { processPostDonationEmails } from '@/lib/email-service';

/**
 * API route to process a simulated payment
 * Used when no real payment provider is configured
 * Supports single or multiple squares
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { squareId, squareIds, playerId, donorName, donorEmail, isAnonymous, amount } = body;

    // Support both single squareId and multiple squareIds
    const ids: string[] = squareIds || (squareId ? [squareId] : []);

    if (ids.length === 0 || !playerId) {
      return NextResponse.json(
        { error: 'Square ID(s) and Player ID are required' },
        { status: 400 }
      );
    }

    // Fetch all requested squares
    const requestedSquares = await db
      .select()
      .from(squares)
      .where(inArray(squares.id, ids));

    if (requestedSquares.length === 0) {
      return NextResponse.json(
        { error: 'No squares found' },
        { status: 404 }
      );
    }

    // Check if any squares are already purchased
    const alreadyPurchased = requestedSquares.filter(s => s.isPurchased);
    if (alreadyPurchased.length > 0) {
      return NextResponse.json(
        { error: `${alreadyPurchased.length} square(s) already purchased` },
        { status: 400 }
      );
    }

    // Calculate total amount from squares if not provided
    const calculatedTotal = requestedSquares.reduce((sum, s) => sum + parseFloat(s.value), 0);
    const donationAmount = amount ? parseFloat(amount) : calculatedTotal;

    // Get player's current total before updating (for milestone check)
    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1);

    const previousTotal = player ? parseFloat(player.totalRaised) : 0;

    // Generate a batch ID to associate all donations from this payment
    const batchId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create donation records for each square
    for (let i = 0; i < requestedSquares.length; i++) {
      const square = requestedSquares[i];
      // Each donation needs a unique stripePaymentIntentId due to unique constraint
      const uniquePaymentId = `${batchId}_${i}`;

      await db.insert(donations).values({
        squareId: square.id,
        playerId,
        amount: square.value, // Each donation is for the individual square value
        donorName: isAnonymous ? null : donorName || null,
        donorEmail: donorEmail || null,
        isAnonymous: isAnonymous ?? false,
        paymentProvider: 'simulation',
        stripePaymentIntentId: uniquePaymentId,
        status: 'succeeded',
        completedAt: new Date(),
      });

      // Mark the square as purchased
      await db
        .update(squares)
        .set({
          isPurchased: true,
          donorName: isAnonymous ? null : donorName || null,
          isAnonymous: isAnonymous ?? true,
          purchasedAt: new Date(),
        })
        .where(eq(squares.id, square.id));
    }

    // Update the player's total raised
    await db
      .update(players)
      .set({
        totalRaised: sql`${players.totalRaised} + ${donationAmount.toFixed(2)}::numeric`,
      })
      .where(eq(players.id, playerId));

    // Send email notifications (non-blocking)
    // For multi-square purchases, send one combined notification
    if (requestedSquares.length > 0) {
      processPostDonationEmails({
        playerId,
        squareId: requestedSquares[0].id,
        amount: donationAmount,
        donorEmail: donorEmail || null,
        donorName: isAnonymous ? null : donorName || null,
        transactionId: batchId,
        previousTotal,
      }).catch((err) => {
        console.error('Error sending post-donation emails:', err);
      });
    }

    return NextResponse.json({
      success: true,
      paymentId: batchId,
      squaresProcessed: requestedSquares.length,
      totalAmount: donationAmount.toFixed(2),
      message: `Simulated payment completed for ${requestedSquares.length} square(s)`,
    });
  } catch (error) {
    console.error('Error processing simulated payment:', error);
    return NextResponse.json(
      { error: 'Failed to process simulated payment' },
      { status: 500 }
    );
  }
}
