import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { testGmailConnection, isGmailConfigured } from '@/lib/gmail';
import { getGmailConfig } from '@/lib/config';

/**
 * POST /api/admin/settings/test-gmail
 * Test the Gmail connection with current configuration (admin only)
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getGmailConfig();

    // Check if OAuth credentials are configured
    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Gmail Client ID and Client Secret must be configured first',
      });
    }

    // Check if OAuth is complete
    const configured = await isGmailConfigured();
    if (!configured) {
      return NextResponse.json({
        success: false,
        error: 'Gmail OAuth authorization required. Click "Authorize Gmail" to complete setup.',
      });
    }

    // Test the connection
    const result = await testGmailConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Gmail connection successful',
        email: result.email,
        enabled: config.enabled,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to connect to Gmail',
      });
    }
  } catch (error) {
    console.error('Error testing Gmail connection:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test connection',
    }, { status: 500 });
  }
}
