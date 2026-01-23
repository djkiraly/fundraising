import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users, players, passwordResetTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { generateHeartSquares } from '@/lib/squares';
import { generateUniqueSlug } from '@/lib/utils';
import { sendEmail, isGmailConfigured, isGmailEnabled } from '@/lib/gmail';
import { getPasswordSetupEmailHtml } from '@/lib/email-templates';
import { getConfig, isPasswordEmailEnabled } from '@/lib/config';
import crypto from 'crypto';

const PASSWORD_SETUP_TOKEN_EXPIRY_HOURS = 72; // 3 days

const MAX_PLAYERS_PER_IMPORT = 100;

interface PlayerImportRow {
  name: string;
  email: string;
  password?: string;
  photoUrl?: string;
  parentEmail?: string;
  goal?: string;
  isActive?: string;
  generateSquares?: string;
}

interface ImportResult {
  success: boolean;
  row: number;
  name: string;
  email: string;
  error?: string;
  playerId?: string;
  emailSent?: boolean;
  emailError?: string;
}

/**
 * POST /api/admin/players/bulk-import
 * Bulk import players from tab-delimited data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { data, sendPasswordSetupEmails = false } = body;

    if (!data || typeof data !== 'string') {
      return NextResponse.json(
        { error: 'Data is required' },
        { status: 400 }
      );
    }

    // Check if email is configured when sendPasswordSetupEmails is requested
    let canSendEmails = false;
    let appUrl = '';
    if (sendPasswordSetupEmails) {
      const gmailConfigured = await isGmailConfigured();
      const gmailEnabled = await isGmailEnabled();
      const passwordEmailsEnabled = await isPasswordEmailEnabled();
      canSendEmails = gmailConfigured && gmailEnabled && passwordEmailsEnabled;
      appUrl = await getConfig('APP_URL') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    }

    // Parse tab-delimited data
    const lines = data.trim().split('\n');

    if (lines.length === 0) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      );
    }

    // First line should be headers
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split('\t').map(h => h.trim());

    // Validate required headers
    const requiredHeaders = ['name', 'email'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `Missing required headers: ${missingHeaders.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse data rows
    const dataRows = lines.slice(1).filter(line => line.trim().length > 0);

    if (dataRows.length === 0) {
      return NextResponse.json(
        { error: 'No data rows found' },
        { status: 400 }
      );
    }

    if (dataRows.length > MAX_PLAYERS_PER_IMPORT) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PLAYERS_PER_IMPORT} players per import. You provided ${dataRows.length}.` },
        { status: 400 }
      );
    }

    // Map header indices
    const headerIndex: Record<string, number> = {};
    headers.forEach((header, index) => {
      headerIndex[header] = index;
    });

    const results: ImportResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Get existing slugs to ensure uniqueness
    const existingSlugs = await db
      .select({ slug: players.slug })
      .from(players);
    const slugList = existingSlugs.map(p => p.slug);

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const rowNum = i + 2; // +2 because row 1 is headers, and we're 1-indexed
      const values = dataRows[i].split('\t').map(v => v.trim());

      const row: PlayerImportRow = {
        name: values[headerIndex['name']] || '',
        email: values[headerIndex['email']] || '',
        password: headerIndex['password'] !== undefined ? values[headerIndex['password']] : undefined,
        photoUrl: headerIndex['photourl'] !== undefined ? values[headerIndex['photourl']] : undefined,
        parentEmail: headerIndex['parentemail'] !== undefined ? values[headerIndex['parentemail']] : undefined,
        goal: headerIndex['goal'] !== undefined ? values[headerIndex['goal']] : undefined,
        isActive: headerIndex['isactive'] !== undefined ? values[headerIndex['isactive']] : undefined,
        generateSquares: headerIndex['generatesquares'] !== undefined ? values[headerIndex['generatesquares']] : undefined,
      };

      // Validate required fields
      if (!row.name) {
        results.push({
          success: false,
          row: rowNum,
          name: row.name || '(empty)',
          email: row.email || '(empty)',
          error: 'Name is required',
        });
        errorCount++;
        continue;
      }

      if (!row.email) {
        results.push({
          success: false,
          row: rowNum,
          name: row.name,
          email: '(empty)',
          error: 'Email is required',
        });
        errorCount++;
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        results.push({
          success: false,
          row: rowNum,
          name: row.name,
          email: row.email,
          error: 'Invalid email format',
        });
        errorCount++;
        continue;
      }

      // Check for duplicate email in database
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, row.email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        results.push({
          success: false,
          row: rowNum,
          name: row.name,
          email: row.email,
          error: 'Email already exists',
        });
        errorCount++;
        continue;
      }

      try {
        // Generate password if not provided
        const password = row.password || generateRandomPassword();
        const passwordHash = await bcrypt.hash(password, 10);

        // Parse optional fields
        const goal = row.goal ? parseFloat(row.goal) : 100;
        const isActive = row.isActive ? row.isActive.toLowerCase() === 'true' || row.isActive === '1' : true;
        const shouldGenerateSquares = row.generateSquares
          ? row.generateSquares.toLowerCase() === 'true' || row.generateSquares === '1'
          : true;

        // Validate goal
        if (isNaN(goal) || goal <= 0) {
          results.push({
            success: false,
            row: rowNum,
            name: row.name,
            email: row.email,
            error: 'Invalid goal value',
          });
          errorCount++;
          continue;
        }

        // Create user
        const [newUser] = await db
          .insert(users)
          .values({
            email: row.email.toLowerCase(),
            name: row.name,
            passwordHash,
            role: 'player',
          })
          .returning();

        // Generate unique slug and add to tracking list
        const slug = generateUniqueSlug(row.name, slugList);
        slugList.push(slug);

        // Create player
        const [newPlayer] = await db
          .insert(players)
          .values({
            userId: newUser.id,
            name: row.name,
            slug,
            photoUrl: row.photoUrl || null,
            parentEmail: row.parentEmail || null,
            goal: goal.toFixed(2),
            isActive,
          })
          .returning();

        // Generate squares if requested
        if (shouldGenerateSquares) {
          await generateHeartSquares(newPlayer.id);
        }

        // Send password setup email if requested and email is configured
        let emailSent = false;
        let emailError: string | undefined;
        if (sendPasswordSetupEmails && canSendEmails) {
          try {
            // Generate a secure random token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + PASSWORD_SETUP_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

            // Save the token to the database
            await db.insert(passwordResetTokens).values({
              userId: newUser.id,
              token,
              expiresAt,
            });

            // Generate the setup URL
            const setupUrl = `${appUrl}/reset-password?token=${token}`;

            // Generate email HTML
            const html = getPasswordSetupEmailHtml({
              playerName: row.name,
              setupUrl,
              expiryHours: PASSWORD_SETUP_TOKEN_EXPIRY_HOURS,
            });

            // Send the email
            const result = await sendEmail({
              to: row.email.toLowerCase(),
              subject: 'Set Up Your Fundraiser Account Password',
              html,
            });

            emailSent = result.success;
            if (!result.success) {
              emailError = result.error;
            }
          } catch (err) {
            emailError = err instanceof Error ? err.message : 'Failed to send email';
          }
        }

        results.push({
          success: true,
          row: rowNum,
          name: row.name,
          email: row.email,
          playerId: newPlayer.id,
          emailSent: sendPasswordSetupEmails ? emailSent : undefined,
          emailError,
        });
        successCount++;
      } catch (err) {
        results.push({
          success: false,
          row: rowNum,
          name: row.name,
          email: row.email,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        errorCount++;
      }
    }

    // Count emails sent
    const emailsSent = results.filter(r => r.emailSent).length;
    const emailsFailed = results.filter(r => r.success && sendPasswordSetupEmails && !r.emailSent).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: dataRows.length,
        successful: successCount,
        failed: errorCount,
        emailsSent: sendPasswordSetupEmails ? emailsSent : undefined,
        emailsFailed: sendPasswordSetupEmails ? emailsFailed : undefined,
        emailConfigured: sendPasswordSetupEmails ? canSendEmails : undefined,
      },
      results,
    });
  } catch (error) {
    console.error('Error in bulk import:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk import' },
      { status: 500 }
    );
  }
}

/**
 * Generate a random password
 */
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
