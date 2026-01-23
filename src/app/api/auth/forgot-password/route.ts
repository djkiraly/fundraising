import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, isGmailConfigured, isGmailEnabled } from '@/lib/gmail';
import { getPasswordResetEmailHtml } from '@/lib/email-templates';
import { isPasswordEmailEnabled } from '@/lib/config';
import crypto from 'crypto';

const TOKEN_EXPIRY_HOURS = 1; // Token expires in 1 hour

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Always return success to prevent email enumeration attacks
    // But only actually send email if user exists
    if (!user) {
      // Simulate some processing time to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 500));
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.',
      });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Save the token to the database
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // Check if Gmail is configured and enabled, and password emails are enabled
    const gmailConfigured = await isGmailConfigured();
    const gmailEnabled = await isGmailEnabled();
    const passwordEmailsEnabled = await isPasswordEmailEnabled();

    if (gmailConfigured && gmailEnabled && passwordEmailsEnabled) {
      // Generate the reset URL
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      // Generate email HTML
      const html = getPasswordResetEmailHtml({
        userName: user.name,
        resetUrl,
        expiryHours: TOKEN_EXPIRY_HOURS,
      });

      // Send the email
      const result = await sendEmail({
        to: user.email,
        subject: 'Reset Your Password - Volleyball Fundraiser',
        html,
      });

      if (!result.success) {
        console.error('Failed to send password reset email:', result.error);
        // Don't expose email sending failures to the user
      }
    } else {
      // Log that email couldn't be sent (for debugging)
      if (!passwordEmailsEnabled) {
        console.warn('Password reset requested but password emails are disabled in settings');
      } else {
        console.warn('Password reset requested but Gmail is not configured or enabled');
      }
      console.log(`Reset token for ${email}: ${token}`);
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.',
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
