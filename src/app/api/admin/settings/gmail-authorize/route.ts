import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateAuthUrl } from '@/lib/gmail';
import { getGmailConfig, setConfig } from '@/lib/config';
import crypto from 'crypto';

/**
 * POST /api/admin/settings/gmail-authorize
 * Initiate Gmail OAuth flow (admin only)
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getGmailConfig();

    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json(
        { error: 'Gmail Client ID and Client Secret must be configured first' },
        { status: 400 }
      );
    }

    // Generate a CSRF state token
    const state = crypto.randomBytes(32).toString('hex');

    // Store state for verification in callback
    await setConfig('GMAIL_OAUTH_STATE', state, {
      category: 'gmail',
      isSecret: true,
      description: 'Temporary OAuth state for CSRF protection',
    });

    // Generate authorization URL
    const authUrl = await generateAuthUrl(state);

    return NextResponse.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Error initiating Gmail OAuth:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate OAuth',
    }, { status: 500 });
  }
}
