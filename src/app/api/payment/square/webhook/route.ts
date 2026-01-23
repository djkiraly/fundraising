import { NextRequest, NextResponse } from 'next/server';
import { verifySquareWebhook } from '@/lib/square';
import { db } from '@/db';
import { squares, donations, players } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { processPostDonationEmails } from '@/lib/email-service';
import { logDonationCompleted, logDonationFailed } from '@/lib/audit';

interface SquareWebhookEvent {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: {
      payment?: {
        id: string;
        status: string;
        amount_money?: {
          amount: number;
          currency: string;
        };
        reference_id?: string;
        order_id?: string;
      };
    };
  };
}

/**
 * Square webhook handler
 * Processes payment events and updates database
 * Supports multi-square transactions (one payment, multiple squares)
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-square-hmacsha256-signature') || '';
  const webhookUrl = request.url;

  // Verify webhook signature
  const isValid = await verifySquareWebhook(body, signature, webhookUrl);
  if (!isValid) {
    console.error('Invalid Square webhook signature');
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  try {
    const event: SquareWebhookEvent = JSON.parse(body);

    // Handle payment events
    switch (event.type) {
      case 'payment.completed': {
        await handlePaymentCompleted(event);
        break;
      }

      case 'payment.updated': {
        await handlePaymentUpdated(event);
        break;
      }

      case 'payment.failed': {
        await handlePaymentFailed(event);
        break;
      }

      default:
        console.log(`Unhandled Square event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Square webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

/**
 * Handle completed payment webhook
 * Supports multi-square transactions
 */
async function handlePaymentCompleted(event: SquareWebhookEvent) {
  const payment = event.data.object.payment;
  if (!payment) {
    console.error('No payment data in webhook event');
    return;
  }

  const paymentId = payment.id;
  const primarySquareId = payment.reference_id; // Primary heart grid square ID

  if (!primarySquareId) {
    console.error('No reference_id (squareId) in payment');
    return;
  }

  try {
    // Get ALL donations with this payment ID (multi-square support)
    const existingDonations = await db
      .select()
      .from(donations)
      .where(eq(donations.squarePaymentId, paymentId));

    // Check if already processed
    const alreadySucceeded = existingDonations.some(d => d.status === 'succeeded');
    if (alreadySucceeded) {
      console.log(`Payment ${paymentId} already processed`);
      return;
    }

    const now = new Date();

    if (existingDonations.length > 0) {
      // Update all existing donation records to succeeded
      const donationIds = existingDonations.map(d => d.id);
      await db
        .update(donations)
        .set({
          status: 'succeeded',
          completedAt: now,
        })
        .where(inArray(donations.id, donationIds));

      // Get all square IDs from donations and mark them purchased
      const squareIds = existingDonations.map(d => d.squareId).filter((id): id is string => id !== null);
      if (squareIds.length > 0) {
        await db
          .update(squares)
          .set({
            isPurchased: true,
            purchasedAt: now,
          })
          .where(inArray(squares.id, squareIds));
      }

      // Calculate total amount and get player ID
      const totalAmount = existingDonations.reduce(
        (sum, d) => sum + parseFloat(d.amount),
        0
      );
      const playerId = existingDonations[0].playerId;

      // Log audit for each donation
      await Promise.all(
        existingDonations.map(donation =>
          logDonationCompleted({
            donationId: donation.id,
            playerId: donation.playerId,
            amount: donation.amount,
            donorName: donation.donorName || null,
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
        const previousTotal = parseFloat(player.totalRaised);
        const newTotal = previousTotal + totalAmount;
        await db
          .update(players)
          .set({ totalRaised: newTotal.toFixed(2) })
          .where(eq(players.id, playerId));

        // Send email notifications for first donation (non-blocking)
        const firstDonation = existingDonations[0];
        processPostDonationEmails({
          playerId,
          squareId: firstDonation.squareId || primarySquareId,
          amount: totalAmount,
          donorEmail: firstDonation.donorEmail || null,
          donorName: firstDonation.donorName || null,
          transactionId: paymentId,
          previousTotal,
        }).catch((err) => {
          console.error('Error sending post-donation emails:', err);
        });
      }

      console.log(`Square payment ${paymentId} completed for ${existingDonations.length} square(s)`);
    } else {
      // No existing donations - create one for the primary square (fallback)
      const [square] = await db
        .select()
        .from(squares)
        .where(eq(squares.id, primarySquareId))
        .limit(1);

      if (!square) {
        console.error(`Square ${primarySquareId} not found`);
        return;
      }

      // Update the square
      if (!square.isPurchased) {
        await db
          .update(squares)
          .set({
            isPurchased: true,
            purchasedAt: now,
          })
          .where(eq(squares.id, primarySquareId));
      }

      // Create donation record
      const donationAmount = payment.amount_money?.amount
        ? (Number(payment.amount_money.amount) / 100).toFixed(2)
        : square.value;

      const [newDonation] = await db.insert(donations).values({
        playerId: square.playerId,
        squareId: square.id,
        amount: donationAmount,
        paymentProvider: 'square',
        squarePaymentId: paymentId,
        squareOrderId: payment.order_id,
        status: 'succeeded',
        completedAt: now,
      }).returning();

      // Log to audit
      await logDonationCompleted({
        donationId: newDonation.id,
        playerId: square.playerId,
        amount: donationAmount,
        donorName: null,
        paymentProvider: 'square',
      });

      // Update player's total raised
      const amount = parseFloat(donationAmount);
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.id, square.playerId))
        .limit(1);

      if (player) {
        const previousTotal = parseFloat(player.totalRaised);
        const newTotal = previousTotal + amount;
        await db
          .update(players)
          .set({ totalRaised: newTotal.toFixed(2) })
          .where(eq(players.id, square.playerId));

        // Send email notifications (non-blocking)
        processPostDonationEmails({
          playerId: square.playerId,
          squareId: square.id,
          amount,
          donorEmail: null,
          donorName: null,
          transactionId: paymentId,
          previousTotal,
        }).catch((err) => {
          console.error('Error sending post-donation emails:', err);
        });
      }

      console.log(`Square payment ${paymentId} completed for square ${primarySquareId}`);
    }
  } catch (error) {
    console.error('Error handling Square payment completion:', error);
    throw error;
  }
}

/**
 * Handle payment updated webhook
 */
async function handlePaymentUpdated(event: SquareWebhookEvent) {
  const payment = event.data.object.payment;
  if (!payment) return;

  // If payment is now completed, handle it
  if (payment.status === 'COMPLETED') {
    await handlePaymentCompleted(event);
  }
}

/**
 * Handle failed payment webhook
 * Supports multi-square transactions
 */
async function handlePaymentFailed(event: SquareWebhookEvent) {
  const payment = event.data.object.payment;
  if (!payment) {
    console.error('No payment data in webhook event');
    return;
  }

  const paymentId = payment.id;
  const primarySquareId = payment.reference_id;

  if (!primarySquareId) return;

  try {
    // Get ALL donations with this payment ID
    const existingDonations = await db
      .select()
      .from(donations)
      .where(eq(donations.squarePaymentId, paymentId));

    if (existingDonations.length > 0) {
      // Update all donations to failed
      const donationIds = existingDonations.map(d => d.id);
      await db
        .update(donations)
        .set({ status: 'failed' })
        .where(inArray(donations.id, donationIds));

      // Log audit for each
      const totalAmount = existingDonations.reduce(
        (sum, d) => sum + parseFloat(d.amount),
        0
      );

      await logDonationFailed({
        donationId: existingDonations[0].id,
        playerId: existingDonations[0].playerId,
        amount: totalAmount.toFixed(2),
        reason: 'Square payment failed',
        paymentProvider: 'square',
      });

      console.log(`Square payment ${paymentId} failed for ${existingDonations.length} donation(s)`);
    } else {
      // No existing donations - create failed record for primary square
      const [square] = await db
        .select()
        .from(squares)
        .where(eq(squares.id, primarySquareId))
        .limit(1);

      if (square) {
        const amount = payment.amount_money?.amount
          ? (Number(payment.amount_money.amount) / 100).toFixed(2)
          : square.value;

        const [newDonation] = await db.insert(donations).values({
          playerId: square.playerId,
          squareId: square.id,
          amount,
          paymentProvider: 'square',
          squarePaymentId: paymentId,
          squareOrderId: payment.order_id,
          status: 'failed',
        }).returning();

        await logDonationFailed({
          donationId: newDonation.id,
          playerId: square.playerId,
          amount,
          reason: 'Square payment failed',
          paymentProvider: 'square',
        });
      }

      console.log(`Square payment ${paymentId} failed`);
    }
  } catch (error) {
    console.error('Error handling Square payment failure:', error);
  }
}
