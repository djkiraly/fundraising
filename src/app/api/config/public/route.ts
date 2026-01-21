import { NextResponse } from 'next/server';
import { getConfig, getSquareConfig, getPaymentProviderConfig, getBrandingConfig } from '@/lib/config';

/**
 * GET /api/config/public
 * Fetch public configuration values (no auth required)
 * Only exposes non-secret public configuration
 */
export async function GET() {
  try {
    // Get payment provider config
    const providerConfig = await getPaymentProviderConfig();

    // Get the Stripe publishable key from config
    const stripePublishableKey = await getConfig('STRIPE_PUBLISHABLE_KEY');

    // Get Square public configuration
    const squareConfig = await getSquareConfig();

    // Get branding configuration
    const brandingConfig = await getBrandingConfig();

    return NextResponse.json({
      // Stripe
      stripePublishableKey,
      // Square (public config only)
      squareApplicationId: squareConfig.applicationId,
      squareLocationId: squareConfig.locationId,
      squareEnvironment: squareConfig.environment,
      // Payment provider settings (active: 'stripe', 'square', or 'none')
      paymentProviderActive: providerConfig.active,
      stripeEnabled: providerConfig.stripeEnabled,
      squareEnabled: providerConfig.squareEnabled,
      // Branding
      branding: brandingConfig,
    });
  } catch (error) {
    console.error('Error fetching public config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}
