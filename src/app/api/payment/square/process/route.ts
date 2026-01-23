import { NextRequest, NextResponse } from 'next/server';
import { createSquarePayment } from '@/lib/square';
import { db } from '@/db';
import { squares, donations, players } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { logDonationCompleted, logDonationFailed } from '@/lib/audit';
import { verifyRecaptchaWithThreshold } from '@/lib/recaptcha';

/**
 * API route to process a Square payment
 * Receives card nonce from Web Payments SDK and creates payment
 * Supports multiple squares in a single transaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { squareId, squareIds, sourceId, donorName, donorEmail, isAnonymous, recaptchaToken } = body;

    // Verify reCAPTCHA token if provided
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptchaWithThreshold(recaptchaToken, 'payment');
      if (!recaptchaResult.success) {
        return NextResponse.json(
          { error: recaptchaResult.error || 'Security verification failed' },
          { status: 400 }
        );
      }
    }

    // Support both squareId (single) and squareIds (array) for backwards compatibility
    const resolvedSquareIds: string[] = squareIds || (squareId ? [squareId] : []);

    if (resolvedSquareIds.length === 0) {
      return NextResponse.json(
        { error: 'Square ID is required' },
        { status: 400 }
      );
    }

    if (!sourceId) {
      return NextResponse.json(
        { error: 'Payment source (card nonce) is required' },
        { status: 400 }
      );
    }

    // Fetch all requested squares (heart grid squares)
    const requestedSquares = await db
      .select()
      .from(squares)
      .where(
        and(
          inArray(squares.id, resolvedSquareIds),
          eq(squares.isPurchased, false)
        )
      );

    if (requestedSquares.length === 0) {
      return NextResponse.json(
        { error: 'No available squares found' },
        { status: 404 }
      );
    }

    // Verify all squares belong to the same player
    const playerIds = [...new Set(requestedSquares.map(s => s.playerId))];
    if (playerIds.length > 1) {
      return NextResponse.json(
        { error: 'All squares must belong to the same player' },
        { status: 400 }
      );
    }

    const playerId = playerIds[0];

    // Calculate total amount in cents
    const totalAmountCents = requestedSquares.reduce(
      (sum, s) => sum + Math.round(parseFloat(s.value) * 100),
      0
    );
    const totalAmountDollars = (totalAmountCents / 100).toFixed(2);

    // Use first square ID as reference, store count in note
    const primarySquareId = requestedSquares[0].id;

    // Create single Square payment for total amount
    const paymentResult = await createSquarePayment(
      totalAmountCents,
      sourceId,
      playerId,
      primarySquareId, // Primary reference for webhook matching
      donorEmail
    );

    const purchasedSquareIds = requestedSquares.map(s => s.id);
    const now = new Date();

    // Check if payment was successful
    if (paymentResult.status === 'COMPLETED') {
      // Update all squares as purchased
      await db
        .update(squares)
        .set({
          isPurchased: true,
          donorName: isAnonymous ? null : donorName,
          isAnonymous: isAnonymous ?? false,
          purchasedAt: now,
        })
        .where(inArray(squares.id, purchasedSquareIds));

      // Create donation records for each square
      const donationRecords = await Promise.all(
        requestedSquares.map(async (square) => {
          const [donation] = await db.insert(donations).values({
            playerId: square.playerId,
            squareId: square.id,
            amount: square.value,
            donorName: isAnonymous ? null : donorName,
            donorEmail: donorEmail || null,
            isAnonymous: isAnonymous ?? false,
            paymentProvider: 'square',
            squarePaymentId: paymentResult.paymentId,
            squareOrderId: paymentResult.orderId,
            status: 'succeeded',
            completedAt: now,
          }).returning();
          return donation;
        })
      );

      // Log audit for each donation
      await Promise.all(
        donationRecords.map((donation, index) =>
          logDonationCompleted({
            donationId: donation.id,
            playerId,
            amount: requestedSquares[index].value,
            donorName: isAnonymous ? null : donorName,
            paymentProvider: 'square',
          })
        )
      );

      // Update player's total raised
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.id, playerId))
        .limit(1);

      if (player) {
        const totalDonated = totalAmountCents / 100;
        const newTotal = parseFloat(player.totalRaised) + totalDonated;
        await db
          .update(players)
          .set({ totalRaised: newTotal.toFixed(2) })
          .where(eq(players.id, playerId));
      }

      return NextResponse.json({
        success: true,
        paymentId: paymentResult.paymentId,
        status: paymentResult.status,
        squaresProcessed: purchasedSquareIds.length,
        totalAmount: totalAmountDollars,
      });
    } else if (paymentResult.status === 'PENDING' || paymentResult.status === 'APPROVED') {
      // Payment is still processing, create pending donation records
      await Promise.all(
        requestedSquares.map((square) =>
          db.insert(donations).values({
            playerId: square.playerId,
            squareId: square.id,
            amount: square.value,
            donorName: isAnonymous ? null : donorName,
            donorEmail: donorEmail || null,
            isAnonymous: isAnonymous ?? false,
            paymentProvider: 'square',
            squarePaymentId: paymentResult.paymentId,
            squareOrderId: paymentResult.orderId,
            status: 'pending',
          })
        )
      );

      return NextResponse.json({
        success: true,
        paymentId: paymentResult.paymentId,
        status: paymentResult.status,
        message: 'Payment is being processed',
        squaresProcessed: purchasedSquareIds.length,
        totalAmount: totalAmountDollars,
      });
    } else {
      // Payment failed - log it
      await logDonationFailed({
        playerId,
        amount: totalAmountDollars,
        reason: `Square payment status: ${paymentResult.status}`,
        paymentProvider: 'square',
      });

      return NextResponse.json(
        {
          error: 'Payment was not completed',
          status: paymentResult.status,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing Square payment:', error);

    // Check if this is a Square configuration error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('not configured') || errorMessage.includes('access token')) {
      return NextResponse.json(
        { error: 'Square is not configured. Please add Square credentials in the admin settings.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to process payment' },
      { status: 500 }
    );
  }
}
