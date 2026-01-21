import { google, Auth } from 'googleapis';
import { getGmailConfig } from './config';
import { setConfig } from './config';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

let oauth2Client: Auth.OAuth2Client | null = null;

/**
 * Get or create an OAuth2 client instance
 */
export async function getOAuth2Client() {
  const config = await getGmailConfig();

  if (!config.clientId || !config.clientSecret) {
    throw new Error('Gmail OAuth credentials are not configured');
  }

  // Create or recreate the client if credentials changed
  if (!oauth2Client) {
    oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri || `${process.env.NEXTAUTH_URL}/api/admin/settings/gmail-callback`
    );
  }

  // Set credentials if we have any tokens
  // We need at least a refresh token to be able to get new access tokens
  if (config.refreshToken || config.accessToken) {
    oauth2Client.setCredentials({
      access_token: config.accessToken || undefined,
      refresh_token: config.refreshToken || undefined,
      expiry_date: config.tokenExpiry ? parseInt(config.tokenExpiry, 10) : undefined,
    });
  }

  return oauth2Client;
}

/**
 * Generate authorization URL for OAuth consent flow
 */
export async function generateAuthUrl(state: string): Promise<string> {
  // Clear any cached client to ensure fresh credentials are used
  clearGmailClient();

  const client = await getOAuth2Client();

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}> {
  const client = await getOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain access and refresh tokens');
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
  };
}

/**
 * Refresh the access token if expired
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const config = await getGmailConfig();

    if (!config.refreshToken) {
      console.error('No refresh token available');
      return false;
    }

    const client = await getOAuth2Client();
    client.setCredentials({
      refresh_token: config.refreshToken,
    });

    const { credentials } = await client.refreshAccessToken();

    if (credentials.access_token) {
      // Save the new access token
      await setConfig('GMAIL_ACCESS_TOKEN', credentials.access_token, {
        category: 'gmail',
        isSecret: true,
        description: 'Gmail OAuth access token',
      });

      if (credentials.expiry_date) {
        await setConfig('GMAIL_TOKEN_EXPIRY', credentials.expiry_date.toString(), {
          category: 'gmail',
          isSecret: false,
          description: 'Gmail token expiration timestamp',
        });
      }

      // Update the client
      oauth2Client = null; // Reset to pick up new token

      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to refresh Gmail access token:', error);
    return false;
  }
}

/**
 * Get an authenticated Gmail API client
 */
export async function getGmailClient() {
  const config = await getGmailConfig();

  // Check if we have the minimum required credentials
  if (!config.refreshToken && !config.accessToken) {
    throw new Error('Gmail is not authorized. Please complete the OAuth flow by clicking "Authorize Gmail".');
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const tokenExpiry = config.tokenExpiry ? parseInt(config.tokenExpiry, 10) : 0;
  const isExpired = !config.accessToken || tokenExpiry < Date.now() + 5 * 60 * 1000;

  if (isExpired && config.refreshToken) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw new Error('Gmail access token expired and refresh failed. Please re-authorize Gmail.');
    }
    // Clear cached client to pick up new tokens
    oauth2Client = null;
  }

  const client = await getOAuth2Client();
  return google.gmail({ version: 'v1', auth: client });
}

/**
 * Check if Gmail is fully configured and authorized
 * Requires clientId, clientSecret, and at least a refreshToken (accessToken can be obtained from refresh)
 */
export async function isGmailConfigured(): Promise<boolean> {
  try {
    const config = await getGmailConfig();
    return !!(
      config.clientId &&
      config.clientSecret &&
      config.refreshToken
    );
  } catch {
    return false;
  }
}

/**
 * Check if Gmail sending is enabled
 */
export async function isGmailEnabled(): Promise<boolean> {
  try {
    const config = await getGmailConfig();
    return config.enabled && await isGmailConfigured();
  } catch {
    return false;
  }
}

/**
 * Test Gmail connection by fetching the user's profile
 */
export async function testGmailConnection(): Promise<{
  success: boolean;
  email?: string;
  error?: string;
}> {
  try {
    const gmail = await getGmailClient();
    const profile = await gmail.users.getProfile({ userId: 'me' });

    return {
      success: true,
      email: profile.data.emailAddress || undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send an email via Gmail API
 */
export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = await getGmailConfig();

    if (!config.enabled) {
      console.log('Gmail sending is disabled');
      return { success: false, error: 'Gmail sending is disabled' };
    }

    const gmail = await getGmailClient();
    const senderEmail = config.senderEmail || 'me';

    // Create the email message in RFC 2822 format
    const messageParts = [
      `From: ${senderEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
    ];

    if (replyTo) {
      messageParts.push(`Reply-To: ${replyTo}`);
    }

    messageParts.push('', html);

    const message = messageParts.join('\r\n');

    // Encode in base64url format
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return {
      success: true,
      messageId: response.data.id || undefined,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear the cached OAuth client (useful when credentials change)
 */
export function clearGmailClient(): void {
  oauth2Client = null;
}
