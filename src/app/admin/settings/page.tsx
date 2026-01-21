import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/ui/navbar';
import { SettingsForm } from '@/components/admin/settings-form';
import { AuditLog } from '@/components/admin/audit-log';
import { getAllSettings, getGmailConfig, setConfig } from '@/lib/config';
import { generateAuthUrl, testGmailConnection, sendEmail, isGmailConfigured } from '@/lib/gmail';
import { testStripeConnection } from '@/lib/stripe';
import { testSquareConnection } from '@/lib/square';
import { getTestEmailHtml } from '@/lib/email-templates';
import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react';
import crypto from 'crypto';

async function testStripe(): Promise<{ success: boolean; error?: string; account?: { id: string } }> {
  'use server';

  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }
    return await testStripeConnection();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function testSquare(): Promise<{ success: boolean; error?: string; location?: { id: string; name: string; address?: string } }> {
  'use server';

  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }
    return await testSquareConnection();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function testGmail(): Promise<{ success: boolean; error?: string; email?: string; enabled?: boolean }> {
  'use server';

  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    const config = await getGmailConfig();
    const result = await testGmailConnection();

    return {
      ...result,
      enabled: config.enabled,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function authorizeGmail(): Promise<{ success: boolean; error?: string; authUrl?: string }> {
  'use server';

  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    const config = await getGmailConfig();

    if (!config.clientId || !config.clientSecret) {
      return { success: false, error: 'Gmail Client ID and Client Secret must be configured first' };
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

    return { success: true, authUrl };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to initiate OAuth' };
  }
}

async function sendTestEmail(recipientEmail: string): Promise<{ success: boolean; error?: string; message?: string }> {
  'use server';

  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate recipient email
    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return { success: false, error: 'Recipient email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return { success: false, error: 'Invalid email address' };
    }

    // Check if Gmail is configured
    const configured = await isGmailConfigured();
    if (!configured) {
      return { success: false, error: 'Gmail is not fully configured. Please complete the OAuth authorization first.' };
    }

    // Get Gmail config
    const config = await getGmailConfig();

    if (!config.enabled) {
      return { success: false, error: 'Gmail sending is disabled. Enable it in the settings to send test emails.' };
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
      return { success: true, message: `Test email sent successfully to ${recipientEmail}` };
    } else {
      return { success: false, error: result.error || 'Failed to send test email' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send test email' };
  }
}

/**
 * Admin settings page
 * Manage application configuration
 */
export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login?callbackUrl=/admin/settings');
  }

  // Fetch all settings
  let settings: Awaited<ReturnType<typeof getAllSettings>> = [];
  try {
    settings = await getAllSettings();
  } catch (error) {
    console.error('Error fetching settings:', error);
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary-pink" />
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Settings</h1>
                <p className="text-lg text-gray-600">
                  Manage application configuration and API keys
                </p>
              </div>
            </div>
          </div>

          {/* Settings Form */}
          <div className="mb-8">
            <SettingsForm
              initialSettings={settings}
              onTestStripe={testStripe}
              onTestSquare={testSquare}
              onTestGmail={testGmail}
              onAuthorizeGmail={authorizeGmail}
              onSendTestEmail={sendTestEmail}
            />
          </div>

          {/* Audit Log */}
          <AuditLog />
        </div>
      </main>
    </>
  );
}
