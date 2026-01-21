import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe';
import { db } from '@/db';
import { squares, donations, players } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { processPostDonationEmails } from '@/lib/email-service';

/**
 * Stripe webhook handler
 * Processes payment events and updates database
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  try {
    const event = await constructWebhookEvent(body, signature);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(paymentIntent);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { playerId, squareId, donorEmail, donorName } = paymentIntent.metadata;

  if (!playerId || !squareId) {
    console.error('Missing metadata in payment intent');
    return;
  }

  try {
    // Start a transaction
    const amount = paymentIntent.amount / 100; // Convert from cents

    // Get player's current total before updating (for milestone check)
    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1);

    const previousTotal = player ? parseFloat(player.totalRaised) : 0;

    // Update the square
    await db
      .update(squares)
      .set({
        isPurchased: true,
        purchasedAt: new Date(),
      })
      .where(eq(squares.id, squareId));

    // Create donation record
    await db.insert(donations).values({
      playerId,
      squareId,
      amount: amount.toFixed(2),
      donorEmail: donorEmail !== 'anonymous' ? donorEmail : null,
      donorName: donorName || null,
      isAnonymous: donorEmail === 'anonymous',
      paymentProvider: 'stripe',
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: paymentIntent.customer as string | null,
      status: 'succeeded',
      completedAt: new Date(),
    });

    // Update player's total raised
    if (player) {
      const newTotal = previousTotal + amount;
      await db
        .update(players)
        .set({ totalRaised: newTotal.toFixed(2) })
        .where(eq(players.id, playerId));
    }

    console.log(`Payment succeeded for square ${squareId}`);

    // Send email notifications (non-blocking)
    processPostDonationEmails({
      playerId,
      squareId,
      amount,
      donorEmail: donorEmail !== 'anonymous' ? donorEmail : null,
      donorName: donorName || null,
      transactionId: paymentIntent.id,
      previousTotal,
    }).catch((err) => {
      console.error('Error sending post-donation emails:', err);
    });
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const { playerId, squareId } = paymentIntent.metadata;

  if (!playerId || !squareId) {
    return;
  }

  try {
    // Record the failed donation
    await db.insert(donations).values({
      playerId,
      squareId,
      amount: (paymentIntent.amount / 100).toFixed(2),
      paymentProvider: 'stripe',
      stripePaymentIntentId: paymentIntent.id,
      status: 'failed',
    });

    console.log(`Payment failed for square ${squareId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}
