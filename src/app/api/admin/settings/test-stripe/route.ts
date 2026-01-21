import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { testStripeConnection, getStripeClient } from '@/lib/stripe';

/**
 * POST /api/admin/settings/test-stripe
 * Test the Stripe connection with current configuration (admin only)
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await testStripeConnection();

    if (result.success) {
      // Get some additional info about the Stripe account
      const stripe = await getStripeClient();
      const account = await stripe.accounts.retrieve();

      return NextResponse.json({
        success: true,
        message: 'Stripe connection successful',
        account: {
          id: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error testing Stripe connection:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test connection',
    });
  }
}
