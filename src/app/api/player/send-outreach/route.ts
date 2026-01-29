import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { sendEmail, isGmailConfigured, isGmailEnabled } from '@/lib/gmail';
import { getConfig } from '@/lib/config';
import DOMPurify from 'isomorphic-dompurify';

// Maximum emails per request
const MAX_EMAILS_PER_REQUEST = 10;

// Configure DOMPurify to allow style attribute with text-align
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  if (data.attrName === 'style') {
    const style = data.attrValue;
    const textAlignMatch = style.match(/text-align:\s*(left|center|right|justify)/i);
    if (textAlignMatch) {
      data.attrValue = `text-align: ${textAlignMatch[1]}`;
    } else {
      data.attrValue = '';
    }
  }
});

/**
 * POST /api/player/send-outreach
 * Send outreach emails to potential donors
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Gmail is configured and enabled
    const gmailConfigured = await isGmailConfigured();
    const gmailEnabled = await isGmailEnabled();

    if (!gmailConfigured || !gmailEnabled) {
      return NextResponse.json(
        { error: 'Email is not configured. Please contact an administrator.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { emails, message } = body;

    // Validate emails array
    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'At least one email address is required' },
        { status: 400 }
      );
    }

    if (emails.length > MAX_EMAILS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_EMAILS_PER_REQUEST} emails per request` },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((email: string) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid email format: ${invalidEmails.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate message
    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'A message is required' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message is too long. Maximum 5000 characters allowed.' },
        { status: 400 }
      );
    }

    // Get the player associated with this user
    const [player] = await db
      .select()
      .from(players)
      .where(and(eq(players.userId, session.user.id), isNull(players.deletedAt)))
      .limit(1);

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Generate the player's fundraiser URL
    const appUrl = await getConfig('APP_URL') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const playerUrl = `${appUrl}/player/${player.slug}`;

    // Sanitize the message
    const sanitizedMessage = DOMPurify.sanitize(message, {
      ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 'br'],
      ALLOWED_ATTR: ['style'],
    });

    // Build the email HTML
    const emailHtml = buildOutreachEmailHtml({
      playerName: player.name,
      message: sanitizedMessage,
      playerUrl,
    });

    // Send emails
    const subject = `${player.name} is fundraising for their Panhandle Powerhouse Volleyball Club`;
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const email of emails) {
      try {
        const result = await sendEmail({
          to: email,
          subject,
          html: emailHtml,
        });

        results.push({
          email,
          success: result.success,
          error: result.error,
        });
      } catch (err) {
        results.push({
          email,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to send',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: emails.length,
        sent: successCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    console.error('Error sending outreach emails:', error);
    return NextResponse.json(
      { error: 'Failed to send outreach emails' },
      { status: 500 }
    );
  }
}

/**
 * Build the outreach email HTML
 */
function buildOutreachEmailHtml({
  playerName,
  message,
  playerUrl,
}: {
  playerName: string;
  message: string;
  playerUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support ${playerName}'s Fundraiser</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fdf2f8;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fdf2f8;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #fce7f3;">
              <div style="width: 60px; height: 60px; margin: 0 auto 16px; background: linear-gradient(135deg, #FFB6D9 0%, #FF69B4 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 30px;">❤️</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1f2937;">
                Support ${playerName}'s Fundraiser
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">
                Panhandle Powerhouse Volleyball Club
              </p>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding: 30px 40px;">
              <div style="font-size: 16px; line-height: 1.6; color: #374151;">
                ${message}
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 10px 40px 40px; text-align: center;">
              <a href="${playerUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #FF69B4 0%, #FF1493 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px rgba(255, 105, 180, 0.4);">
                Support ${playerName}'s Fundraiser
              </a>
              <p style="margin: 16px 0 0; font-size: 13px; color: #9ca3af;">
                Click the button above to visit the fundraising page
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #fdf2f8; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                This email was sent by ${playerName} via their fundraising page.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">
                <a href="${playerUrl}" style="color: #FF69B4; text-decoration: none;">${playerUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
