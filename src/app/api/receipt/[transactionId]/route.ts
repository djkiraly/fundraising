import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { donations, players, squares } from '@/db/schema';
import { eq, like } from 'drizzle-orm';

/**
 * GET /api/receipt/[transactionId]
 * Fetch receipt data for a transaction
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Find donations by transaction ID (could be squarePaymentId or stripePaymentIntentId)
    let donationRecords = await db
      .select({
        donation: donations,
        player: players,
        square: squares,
      })
      .from(donations)
      .leftJoin(players, eq(donations.playerId, players.id))
      .leftJoin(squares, eq(donations.squareId, squares.id))
      .where(eq(donations.squarePaymentId, transactionId));

    // If not found by squarePaymentId, try stripePaymentIntentId (exact match)
    if (donationRecords.length === 0) {
      donationRecords = await db
        .select({
          donation: donations,
          player: players,
          square: squares,
        })
        .from(donations)
        .leftJoin(players, eq(donations.playerId, players.id))
        .leftJoin(squares, eq(donations.squareId, squares.id))
        .where(eq(donations.stripePaymentIntentId, transactionId));
    }

    // If still not found, try prefix match for simulation payments (sim_xxx_0, sim_xxx_1, etc.)
    if (donationRecords.length === 0 && transactionId.startsWith('sim_')) {
      donationRecords = await db
        .select({
          donation: donations,
          player: players,
          square: squares,
        })
        .from(donations)
        .leftJoin(players, eq(donations.playerId, players.id))
        .leftJoin(squares, eq(donations.squareId, squares.id))
        .where(like(donations.stripePaymentIntentId, `${transactionId}%`));
    }

    if (donationRecords.length === 0) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Calculate total amount
    const totalAmount = donationRecords.reduce(
      (sum, record) => sum + parseFloat(record.donation.amount),
      0
    );

    // Get first donation for shared fields
    const firstDonation = donationRecords[0].donation;
    const player = donationRecords[0].player;

    // Build receipt data
    const receiptData = {
      transactionId,
      donorName: firstDonation.donorName,
      donorEmail: firstDonation.donorEmail,
      isAnonymous: firstDonation.isAnonymous,
      playerName: player?.name || 'Unknown Player',
      playerSlug: player?.slug || '',
      playerId: player?.id || '',
      totalAmount: totalAmount.toFixed(2),
      paymentProvider: firstDonation.paymentProvider,
      status: firstDonation.status,
      completedAt: firstDonation.completedAt?.toISOString() || firstDonation.createdAt.toISOString(),
      createdAt: firstDonation.createdAt.toISOString(),
      squareCount: donationRecords.length,
      squares: donationRecords.map(record => ({
        id: record.square?.id,
        value: record.square?.value || record.donation.amount,
        positionX: record.square?.positionX,
        positionY: record.square?.positionY,
      })),
    };

    return NextResponse.json(receiptData);
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipt' },
      { status: 500 }
    );
  }
}
