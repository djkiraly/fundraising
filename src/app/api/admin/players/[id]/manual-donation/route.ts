import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players, donations, donationsAuditLog } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/players/[id]/manual-donation
 * Add a manual donation (cash, check, etc.) to a player
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: playerId } = await params;
    const body = await request.json();
    const { amount, donorName, donorEmail, paymentMethod, notes, isAnonymous } = body;

    // Validate required fields
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!paymentMethod || !['cash', 'check', 'other'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Valid payment method is required (cash, check, or other)' },
        { status: 400 }
      );
    }

    // Check if player exists
    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const donationAmount = parseFloat(amount).toFixed(2);
    const now = new Date();

    // Create the donation record
    const [newDonation] = await db
      .insert(donations)
      .values({
        playerId,
        amount: donationAmount,
        donorName: donorName || null,
        donorEmail: donorEmail || null,
        isAnonymous: isAnonymous || false,
        paymentProvider: 'manual',
        manualPaymentMethod: paymentMethod,
        notes: notes || null,
        createdByUserId: session.user.id,
        status: 'succeeded',
        completedAt: now,
      })
      .returning();

    // Update player's total raised
    const newTotal = (parseFloat(player.totalRaised) + parseFloat(donationAmount)).toFixed(2);
    await db
      .update(players)
      .set({
        totalRaised: newTotal,
        updatedAt: now,
      })
      .where(eq(players.id, playerId));

    // Create audit log entry
    await db.insert(donationsAuditLog).values({
      donationId: newDonation.id,
      playerId,
      userId: session.user.id,
      action: 'manual_donation',
      amount: donationAmount,
      paymentMethod,
      donorName: donorName || null,
      notes: notes || null,
      details: JSON.stringify({
        donorEmail: donorEmail || null,
        isAnonymous: isAnonymous || false,
        previousTotal: player.totalRaised,
        newTotal,
        adminEmail: session.user.email,
      }),
    });

    return NextResponse.json({
      success: true,
      donation: newDonation,
      newTotal,
      message: `Successfully added $${donationAmount} ${paymentMethod} donation for ${player.name}`,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating manual donation:', error);
    return NextResponse.json(
      { error: 'Failed to create manual donation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/players/[id]/manual-donation
 * Get manual donation history for a player
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: playerId } = await params;

    // Get manual donations for this player
    const manualDonations = await db
      .select()
      .from(donations)
      .where(
        sql`${donations.playerId} = ${playerId} AND ${donations.paymentProvider} = 'manual'`
      )
      .orderBy(sql`${donations.createdAt} DESC`);

    return NextResponse.json(manualDonations);
  } catch (error) {
    console.error('Error fetching manual donations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manual donations' },
      { status: 500 }
    );
  }
}
