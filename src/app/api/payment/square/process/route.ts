import { NextRequest, NextResponse } from 'next/server';
import { createSquarePayment } from '@/lib/square';
import { db } from '@/db';
import { squares, donations, players } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logDonationCompleted, logDonationFailed } from '@/lib/audit';

/**
 * API route to process a Square payment
 * Receives card nonce from Web Payments SDK and creates payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { squareId, sourceId, donorName, donorEmail, isAnonymous } = body;

    if (!squareId) {
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

    // Fetch the square (heart grid square)
    const [square] = await db
      .select()
      .from(squares)
      .where(and(eq(squares.id, squareId), eq(squares.isPurchased, false)))
      .limit(1);

    if (!square) {
      return NextResponse.json(
        { error: 'Square not found or already purchased' },
        { status: 404 }
      );
    }

    // Calculate amount in cents
    const amountCents = Math.round(parseFloat(square.value) * 100);

    // Create Square payment
    const paymentResult = await createSquarePayment(
      amountCents,
      sourceId,
      square.playerId,
      square.id,
      donorEmail
    );

    // Check if payment was successful
    if (paymentResult.status === 'COMPLETED') {
      // Update the square
      await db
        .update(squares)
        .set({
          isPurchased: true,
          donorName: isAnonymous ? null : donorName,
          isAnonymous: isAnonymous ?? false,
          purchasedAt: new Date(),
        })
        .where(eq(squares.id, squareId));

      // Create donation record
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
        completedAt: new Date(),
      }).returning();

      // Log to audit
      await logDonationCompleted({
        donationId: donation.id,
        playerId: square.playerId,
        amount: square.value,
        donorName: isAnonymous ? null : donorName,
        paymentProvider: 'square',
      });

      // Update player's total raised
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.id, square.playerId))
        .limit(1);

      if (player) {
        const newTotal = parseFloat(player.totalRaised) + parseFloat(square.value);
        await db
          .update(players)
          .set({ totalRaised: newTotal.toFixed(2) })
          .where(eq(players.id, square.playerId));
      }

      return NextResponse.json({
        success: true,
        paymentId: paymentResult.paymentId,
        status: paymentResult.status,
      });
    } else if (paymentResult.status === 'PENDING' || paymentResult.status === 'APPROVED') {
      // Payment is still processing, create pending donation record
      await db.insert(donations).values({
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
      });

      return NextResponse.json({
        success: true,
        paymentId: paymentResult.paymentId,
        status: paymentResult.status,
        message: 'Payment is being processed',
      });
    } else {
      // Payment failed - log it
      await logDonationFailed({
        playerId: square.playerId,
        amount: square.value,
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
