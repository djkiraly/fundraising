import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendEmail, isGmailConfigured } from '@/lib/gmail';
import { getGmailConfig } from '@/lib/config';
import { getTestEmailHtml } from '@/lib/email-templates';

/**
 * POST /api/admin/settings/send-test-email
 * Send a test email to verify Gmail configuration (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientEmail } = body;

    // Validate recipient email
    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Recipient email is required',
      }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email address',
      }, { status: 400 });
    }

    // Check if Gmail is configured
    const configured = await isGmailConfigured();
    if (!configured) {
      return NextResponse.json({
        success: false,
        error: 'Gmail is not fully configured. Please complete the OAuth authorization first.',
      });
    }

    // Get Gmail config for sender email
    const config = await getGmailConfig();

    if (!config.enabled) {
      return NextResponse.json({
        success: false,
        error: 'Gmail sending is disabled. Enable it in the settings to send test emails.',
      });
    }

    const senderEmail = config.senderEmail || 'Unknown';
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'long',
    });

    // Generate test email HTML
    const html = getTestEmailHtml({
      recipientEmail,
      senderEmail,
      timestamp,
    });

    // Send the test email
    const result = await sendEmail({
      to: recipientEmail,
      subject: 'Test Email - Volleyball Fundraiser',
      html,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${recipientEmail}`,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to send test email',
      });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send test email',
    }, { status: 500 });
  }
}
