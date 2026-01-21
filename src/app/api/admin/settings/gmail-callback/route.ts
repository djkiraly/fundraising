import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { exchangeCodeForTokens, getGmailClient, clearGmailClient } from '@/lib/gmail';
import { getConfig, setConfig, deleteConfig } from '@/lib/config';

/**
 * GET /api/admin/settings/gmail-callback
 * Handle OAuth callback from Google
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const settingsUrl = `${baseUrl}/admin/settings`;

  // Check for OAuth errors
  if (error) {
    console.error('Gmail OAuth error:', error);
    return NextResponse.redirect(
      `${settingsUrl}?gmail_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${settingsUrl}?gmail_error=${encodeURIComponent('Missing authorization code or state')}`
    );
  }

  try {
    // Verify session
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.redirect(
        `${settingsUrl}?gmail_error=${encodeURIComponent('Unauthorized')}`
      );
    }

    // Verify CSRF state
    const storedState = await getConfig('GMAIL_OAUTH_STATE');
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${settingsUrl}?gmail_error=${encodeURIComponent('Invalid state parameter')}`
      );
    }

    // Clear the state token
    await deleteConfig('GMAIL_OAUTH_STATE');

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Clear existing client so it picks up new tokens
    clearGmailClient();

    // Store tokens
    await Promise.all([
      setConfig('GMAIL_ACCESS_TOKEN', tokens.accessToken, {
        category: 'gmail',
        isSecret: true,
        description: 'Gmail OAuth access token',
      }),
      setConfig('GMAIL_REFRESH_TOKEN', tokens.refreshToken, {
        category: 'gmail',
        isSecret: true,
        description: 'Gmail OAuth refresh token',
      }),
      setConfig('GMAIL_TOKEN_EXPIRY', tokens.expiryDate.toString(), {
        category: 'gmail',
        isSecret: false,
        description: 'Gmail token expiration timestamp',
      }),
    ]);

    // Get the sender email from the authorized account
    try {
      const gmail = await getGmailClient();
      const profile = await gmail.users.getProfile({ userId: 'me' });

      if (profile.data.emailAddress) {
        await setConfig('GMAIL_SENDER_EMAIL', profile.data.emailAddress, {
          category: 'gmail',
          isSecret: false,
          description: 'Authorized Gmail sender email address',
        });
      }
    } catch (profileError) {
      console.error('Failed to fetch Gmail profile:', profileError);
      // Continue anyway, the authorization was still successful
    }

    return NextResponse.redirect(
      `${settingsUrl}?gmail_success=true`
    );
  } catch (error) {
    console.error('Error handling Gmail OAuth callback:', error);
    return NextResponse.redirect(
      `${settingsUrl}?gmail_error=${encodeURIComponent(
        error instanceof Error ? error.message : 'OAuth callback failed'
      )}`
    );
  }
}
