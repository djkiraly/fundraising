import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent, isStripeConfigured } from '@/lib/stripe';
import { isSquareConfigured } from '@/lib/square';
import { db } from '@/db';
import { squares } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getPaymentProviderConfig } from '@/lib/config';

/**
 * API route to create a Stripe payment intent
 * Returns provider info for client to determine which payment form to show
 * Falls back to simulation mode if no payment provider is configured
 * Supports single squareId or multiple squareIds
 */
export async function POST(request: NextRequest) {
  let squaresData: Array<{ id: string; value: string; playerId: string }> = [];

  try {
    const body = await request.json();
    const { squareId, squareIds, donorEmail } = body;

    // Support both single squareId and multiple squareIds
    const ids: string[] = squareIds || (squareId ? [squareId] : []);

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Square ID(s) required' },
        { status: 400 }
      );
    }

    // Fetch all squares (heart grid squares)
    const fetchedSquares = await db
      .select()
      .from(squares)
      .where(and(
        eq(squares.isPurchased, false)
      ));

    // Filter to only requested squares that aren't purchased
    const requestedSquares = fetchedSquares.filter(s => ids.includes(s.id));

    if (requestedSquares.length === 0) {
      return NextResponse.json(
        { error: 'No valid squares found or already purchased' },
        { status: 404 }
      );
    }

    if (requestedSquares.length !== ids.length) {
      return NextResponse.json(
        { error: 'Some squares not found or already purchased' },
        { status: 400 }
      );
    }

    // Store squares data for potential use in error handling
    squaresData = requestedSquares.map(s => ({ id: s.id, value: s.value, playerId: s.playerId }));

    // Calculate total amount
    const totalAmount = requestedSquares.reduce((sum, s) => sum + parseFloat(s.value), 0);
    const playerId = requestedSquares[0].playerId;

    // Get payment provider config to determine which provider is active
    const providerConfig = await getPaymentProviderConfig();

    // If no payment provider is enabled, use simulation mode
    if (providerConfig.active === 'none') {
      return NextResponse.json({
        provider: 'simulation',
        amount: totalAmount.toFixed(2),
        squareIds: ids,
        playerId,
      });
    }

    // Check if the active provider is actually configured
    if (providerConfig.active === 'stripe') {
      const stripeConfigured = await isStripeConfigured();
      if (!stripeConfigured) {
        // Stripe enabled but not configured, fall back to simulation
        return NextResponse.json({
          provider: 'simulation',
          amount: totalAmount.toFixed(2),
          squareIds: ids,
          playerId,
        });
      }

      // Create Stripe payment intent
      const paymentIntent = await createPaymentIntent(
        totalAmount,
        playerId,
        ids.join(','),
        donorEmail
      );

      return NextResponse.json({
        provider: 'stripe',
        clientSecret: paymentIntent.client_secret,
        amount: totalAmount.toFixed(2),
        squareIds: ids,
      });
    }

    if (providerConfig.active === 'square') {
      const squareConfigured = await isSquareConfigured();
      if (!squareConfigured) {
        // Square enabled but not configured, fall back to simulation
        return NextResponse.json({
          provider: 'simulation',
          amount: totalAmount.toFixed(2),
          squareIds: ids,
          playerId,
        });
      }

      return NextResponse.json({
        provider: 'square',
        amount: totalAmount.toFixed(2),
        squareIds: ids,
        playerId,
      });
    }

    // Should not reach here, but fall back to simulation
    return NextResponse.json({
      provider: 'simulation',
      amount: totalAmount.toFixed(2),
      squareIds: ids,
      playerId,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);

    // If we have squares data, fall back to simulation mode
    if (squaresData.length > 0) {
      const totalAmount = squaresData.reduce((sum, s) => sum + parseFloat(s.value), 0);
      return NextResponse.json({
        provider: 'simulation',
        amount: totalAmount.toFixed(2),
        squareIds: squaresData.map(s => s.id),
        playerId: squaresData[0].playerId,
      });
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
