import Stripe from 'stripe';
import { getStripeConfig } from './config';

let stripeInstance: Stripe | null = null;
let stripeSecretKey: string | null = null;

/**
 * Get or create a Stripe client instance
 * Lazy-loads configuration from database, falls back to env vars
 */
export async function getStripeClient(): Promise<Stripe> {
  const config = await getStripeConfig();

  // If the secret key has changed, recreate the instance
  if (config.secretKey && config.secretKey !== stripeSecretKey) {
    stripeInstance = new Stripe(config.secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
    stripeSecretKey = config.secretKey;
  }

  // If we have no instance yet, try to create one
  if (!stripeInstance) {
    const secretKey = config.secretKey || process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('Stripe secret key is not configured. Please set it in the admin settings or STRIPE_SECRET_KEY environment variable.');
    }

    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
    stripeSecretKey = secretKey;
  }

  return stripeInstance;
}

/**
 * Get webhook secret from config
 */
export async function getWebhookSecret(): Promise<string> {
  const config = await getStripeConfig();
  const webhookSecret = config.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('Stripe webhook secret is not configured. Please set it in the admin settings or STRIPE_WEBHOOK_SECRET environment variable.');
  }

  return webhookSecret;
}

/**
 * Create a payment intent for a donation
 */
export async function createPaymentIntent(
  amount: number,
  playerId: string,
  squareId: string,
  donorEmail?: string
): Promise<Stripe.PaymentIntent> {
  const stripe = await getStripeClient();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      playerId,
      squareId,
      donorEmail: donorEmail || 'anonymous',
    },
  });

  return paymentIntent;
}

/**
 * Retrieve a payment intent
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  const stripe = await getStripeClient();
  return await stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Construct webhook event from request
 */
export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const stripe = await getStripeClient();
  const webhookSecret = await getWebhookSecret();

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Test Stripe connection with the current configuration
 */
export async function testStripeConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const stripe = await getStripeClient();
    // Make a simple API call to verify the key works
    await stripe.balance.retrieve();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if Stripe is properly configured
 */
export async function isStripeConfigured(): Promise<boolean> {
  try {
    const config = await getStripeConfig();
    return !!(config.secretKey || process.env.STRIPE_SECRET_KEY);
  } catch {
    return false;
  }
}
