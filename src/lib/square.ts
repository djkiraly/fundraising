import { SquareClient, SquareEnvironment, SquareError, WebhooksHelper } from 'square';
import { getSquareConfig } from './config';
import crypto from 'crypto';

let squareClient: SquareClient | null = null;
let squareAccessToken: string | null = null;
let squareEnvironment: string | null = null;

/**
 * Reset the Square client cache
 * Call this when Square settings are updated
 */
export function resetSquareClient(): void {
  squareClient = null;
  squareAccessToken = null;
  squareEnvironment = null;
}

/**
 * Get or create a Square client instance
 * Lazy-loads configuration from database, falls back to env vars
 */
export async function getSquareClient(): Promise<SquareClient> {
  const config = await getSquareConfig();
  const accessToken = config.accessToken || process.env.SQUARE_ACCESS_TOKEN;
  const environment = config.environment;

  // If the access token or environment has changed, recreate the instance
  if (accessToken && (accessToken !== squareAccessToken || environment !== squareEnvironment)) {
    squareClient = new SquareClient({
      token: accessToken,
      environment: environment === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });
    squareAccessToken = accessToken;
    squareEnvironment = environment;
  }

  // If we have no instance yet, try to create one
  if (!squareClient) {
    if (!accessToken) {
      throw new Error('Square access token is not configured. Please set it in the admin settings or SQUARE_ACCESS_TOKEN environment variable.');
    }

    squareClient = new SquareClient({
      token: accessToken,
      environment: environment === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });
    squareAccessToken = accessToken;
    squareEnvironment = environment;
  }

  return squareClient;
}

/**
 * Get location ID from config
 */
export async function getSquareLocationId(): Promise<string> {
  const config = await getSquareConfig();
  const locationId = config.locationId || process.env.SQUARE_LOCATION_ID;

  if (!locationId) {
    throw new Error('Square location ID is not configured. Please set it in the admin settings or SQUARE_LOCATION_ID environment variable.');
  }

  return locationId;
}

/**
 * Create a Square payment
 */
export async function createSquarePayment(
  amountCents: number,
  sourceId: string, // Card nonce from Web Payments SDK
  playerId: string,
  squareId: string, // The heart grid square ID
  donorEmail?: string
): Promise<{
  paymentId: string;
  orderId?: string;
  status: string;
}> {
  const client = await getSquareClient();
  const locationId = await getSquareLocationId();

  // Generate idempotency key
  const idempotencyKey = crypto.randomUUID();

  try {
    const response = await client.payments.create({
      sourceId,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD',
      },
      locationId,
      referenceId: squareId, // Use heart grid square ID as reference
      note: `Donation for player ${playerId}`,
      buyerEmailAddress: donorEmail || undefined,
    });

    if (!response.payment) {
      throw new Error('Payment creation failed - no payment returned');
    }

    return {
      paymentId: response.payment.id || '',
      orderId: response.payment.orderId,
      status: response.payment.status || 'UNKNOWN',
    };
  } catch (error) {
    if (error instanceof SquareError) {
      const errorMessage = error.message;
      throw new Error(`Square payment failed: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Get a Square payment by ID
 */
export async function getSquarePayment(paymentId: string): Promise<{
  id: string;
  status: string;
  amountMoney?: { amount?: bigint | null; currency?: string };
  referenceId?: string;
}> {
  const client = await getSquareClient();

  try {
    const response = await client.payments.get({ paymentId });

    if (!response.payment) {
      throw new Error('Payment not found');
    }

    return {
      id: response.payment.id || '',
      status: response.payment.status || 'UNKNOWN',
      amountMoney: response.payment.amountMoney,
      referenceId: response.payment.referenceId,
    };
  } catch (error) {
    if (error instanceof SquareError) {
      const errorMessage = error.message;
      throw new Error(`Failed to get Square payment: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Verify Square webhook signature
 */
export async function verifySquareWebhook(
  body: string,
  signature: string,
  webhookUrl: string
): Promise<boolean> {
  const config = await getSquareConfig();
  const signatureKey = config.webhookSignatureKey || process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!signatureKey) {
    console.warn('Square webhook signature key not configured, skipping verification');
    return true; // Allow processing if key not configured (for development)
  }

  try {
    // Use Square's WebhooksHelper for signature verification
    return WebhooksHelper.verifySignature({
      requestBody: body,
      signatureHeader: signature,
      signatureKey,
      notificationUrl: webhookUrl,
    });
  } catch {
    // Fallback to manual verification if WebhooksHelper fails
    const payload = webhookUrl + body;
    const expectedSignature = crypto
      .createHmac('sha256', signatureKey)
      .update(payload)
      .digest('base64');

    return signature === expectedSignature;
  }
}

/**
 * Test Square connection with the current configuration
 */
export async function testSquareConnection(): Promise<{
  success: boolean;
  error?: string;
  location?: {
    id: string;
    name: string;
    address?: string;
  };
}> {
  try {
    const client = await getSquareClient();
    const locationId = await getSquareLocationId();

    // Retrieve the location to verify connection
    const response = await client.locations.get({ locationId });

    if (!response.location) {
      return {
        success: false,
        error: 'Location not found',
      };
    }

    return {
      success: true,
      location: {
        id: response.location.id || '',
        name: response.location.name || '',
        address: response.location.address?.addressLine1 ?? undefined,
      },
    };
  } catch (error) {
    if (error instanceof SquareError) {
      const errorMessage = error.message;
      return {
        success: false,
        error: errorMessage,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if Square is properly configured
 */
export async function isSquareConfigured(): Promise<boolean> {
  try {
    const config = await getSquareConfig();
    return !!(config.accessToken && config.locationId && config.applicationId);
  } catch {
    return false;
  }
}
