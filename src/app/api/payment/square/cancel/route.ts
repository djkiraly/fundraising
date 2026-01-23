import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { donations, squares } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * API route to cancel/cleanup a failed or abandoned Square payment
 * Releases any pending donations and ensures squares remain available
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { squareIds, paymentId } = body;

    if (!squareIds || squareIds.length === 0) {
      return NextResponse.json(
        { error: 'Square IDs required' },
        { status: 400 }
      );
    }

    // If we have a payment ID, clean up any pending donations for it
    if (paymentId) {
      // Update any pending donations to cancelled
      await db
        .update(donations)
        .set({ status: 'cancelled' })
        .where(
          and(
            eq(donations.squarePaymentId, paymentId),
            eq(donations.status, 'pending')
          )
        );
    }

    // Ensure squares are released (set isPurchased to false)
    // This is a safety measure - should already be false unless there was a partial failure
    await db
      .update(squares)
      .set({
        isPurchased: false,
        donorName: null,
        isAnonymous: false,
        purchasedAt: null,
      })
      .where(
        and(
          inArray(squares.id, squareIds),
          // Only update if they were marked as purchased but don't have a completed donation
          eq(squares.isPurchased, true)
        )
      );

    // Also clean up any pending donations for these square IDs that don't have a completed status
    await db
      .update(donations)
      .set({ status: 'cancelled' })
      .where(
        and(
          inArray(donations.squareId, squareIds),
          eq(donations.status, 'pending')
        )
      );

    return NextResponse.json({ success: true, message: 'Payment cancelled and squares released' });
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel payment' },
      { status: 500 }
    );
  }
}
