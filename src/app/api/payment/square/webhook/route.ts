import { NextRequest, NextResponse } from 'next/server';
import { verifySquareWebhook } from '@/lib/square';
import { db } from '@/db';
import { squares, donations, players } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { processPostDonationEmails } from '@/lib/email-service';

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
 */
async function handlePaymentCompleted(event: SquareWebhookEvent) {
  const payment = event.data.object.payment;
  if (!payment) {
    console.error('No payment data in webhook event');
    return;
  }

  const paymentId = payment.id;
  const squareId = payment.reference_id; // We stored heart grid square ID here

  if (!squareId) {
    console.error('No reference_id (squareId) in payment');
    return;
  }

  try {
    // Check if donation already marked as succeeded
    const [existingDonation] = await db
      .select()
      .from(donations)
      .where(eq(donations.squarePaymentId, paymentId))
      .limit(1);

    if (existingDonation && existingDonation.status === 'succeeded') {
      console.log(`Payment ${paymentId} already processed`);
      return;
    }

    // Get the square (heart grid square)
    const [square] = await db
      .select()
      .from(squares)
      .where(eq(squares.id, squareId))
      .limit(1);

    if (!square) {
      console.error(`Square ${squareId} not found`);
      return;
    }

    // Update the square if not already purchased
    if (!square.isPurchased) {
      await db
        .update(squares)
        .set({
          isPurchased: true,
          purchasedAt: new Date(),
        })
        .where(eq(squares.id, squareId));
    }

    // Update or create donation record
    if (existingDonation) {
      await db
        .update(donations)
        .set({
          status: 'succeeded',
          completedAt: new Date(),
        })
        .where(eq(donations.id, existingDonation.id));
    } else {
      const amount = payment.amount_money?.amount
        ? (Number(payment.amount_money.amount) / 100).toFixed(2)
        : square.value;

      await db.insert(donations).values({
        playerId: square.playerId,
        squareId: square.id,
        amount,
        paymentProvider: 'square',
        squarePaymentId: paymentId,
        squareOrderId: payment.order_id,
        status: 'succeeded',
        completedAt: new Date(),
      });
    }

    // Update player's total raised (only if donation wasn't already succeeded)
    let previousTotal = 0;
    const amount = payment.amount_money?.amount
      ? Number(payment.amount_money.amount) / 100
      : parseFloat(square.value);

    if (!existingDonation || existingDonation.status !== 'succeeded') {
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.id, square.playerId))
        .limit(1);

      if (player) {
        previousTotal = parseFloat(player.totalRaised);
        const newTotal = previousTotal + amount;
        await db
          .update(players)
          .set({ totalRaised: newTotal.toFixed(2) })
          .where(eq(players.id, square.playerId));
      }

      // Send email notifications (non-blocking)
      processPostDonationEmails({
        playerId: square.playerId,
        squareId: square.id,
        amount,
        donorEmail: existingDonation?.donorEmail || null,
        donorName: existingDonation?.donorName || null,
        transactionId: paymentId,
        previousTotal,
      }).catch((err) => {
        console.error('Error sending post-donation emails:', err);
      });
    }

    console.log(`Square payment ${paymentId} completed for square ${squareId}`);
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
 */
async function handlePaymentFailed(event: SquareWebhookEvent) {
  const payment = event.data.object.payment;
  if (!payment) {
    console.error('No payment data in webhook event');
    return;
  }

  const paymentId = payment.id;
  const squareId = payment.reference_id;

  if (!squareId) return;

  try {
    // Update donation record if exists
    const [existingDonation] = await db
      .select()
      .from(donations)
      .where(eq(donations.squarePaymentId, paymentId))
      .limit(1);

    if (existingDonation) {
      await db
        .update(donations)
        .set({ status: 'failed' })
        .where(eq(donations.id, existingDonation.id));
    } else {
      // Get square to get playerId
      const [square] = await db
        .select()
        .from(squares)
        .where(eq(squares.id, squareId))
        .limit(1);

      if (square) {
        const amount = payment.amount_money?.amount
          ? (Number(payment.amount_money.amount) / 100).toFixed(2)
          : square.value;

        await db.insert(donations).values({
          playerId: square.playerId,
          squareId: square.id,
          amount,
          paymentProvider: 'square',
          squarePaymentId: paymentId,
          squareOrderId: payment.order_id,
          status: 'failed',
        });
      }
    }

    console.log(`Square payment ${paymentId} failed`);
  } catch (error) {
    console.error('Error handling Square payment failure:', error);
  }
}
