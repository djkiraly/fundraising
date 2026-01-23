/**
 * Email service for sending transactional emails
 * Integrates Gmail API with email templates
 */

import { db } from '@/db';
import { players, users, donations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail, isGmailEnabled } from './gmail';
import {
  getDonationReceiptHtml,
  getPlayerNotificationHtml,
  getMilestoneHtml,
  getWelcomeEmailHtml,
} from './email-templates';
import { getConfig } from './config';

const APP_NAME = 'Volleyball Fundraiser';

/**
 * Get the application URL
 */
async function getAppUrl(): Promise<string> {
  const customUrl = await getConfig('APP_URL');
  return customUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

/**
 * Send donation receipt to donor
 */
export async function sendDonationReceipt(data: {
  donorEmail: string;
  donorName?: string;
  playerName: string;
  amount: string;
  transactionId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const enabled = await isGmailEnabled();
    if (!enabled) {
      console.log('Gmail not enabled, skipping donation receipt');
      return { success: false, error: 'Gmail not enabled' };
    }

    const appUrl = await getAppUrl();
    const receiptUrl = data.transactionId ? `${appUrl}/receipt/${data.transactionId}` : undefined;

    const html = getDonationReceiptHtml({
      donorName: data.donorName,
      playerName: data.playerName,
      amount: data.amount,
      donationDate: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      transactionId: data.transactionId,
      receiptUrl,
      appName: APP_NAME,
      appUrl,
    });

    return await sendEmail({
      to: data.donorEmail,
      subject: `Thank you for your donation to ${data.playerName}!`,
      html,
    });
  } catch (error) {
    console.error('Error sending donation receipt:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send notification to player about new donation
 */
export async function sendPlayerDonationNotification(data: {
  playerId: string;
  donorName?: string;
  amount: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const enabled = await isGmailEnabled();
    if (!enabled) {
      console.log('Gmail not enabled, skipping player notification');
      return { success: false, error: 'Gmail not enabled' };
    }

    // Get player and user info
    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, data.playerId))
      .limit(1);

    if (!player || !player.userId) {
      return { success: false, error: 'Player not found or no associated user' };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, player.userId))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const appUrl = await getAppUrl();
    const newTotal = parseFloat(player.totalRaised);
    const goal = parseFloat(player.goal);
    const progressPercent = goal > 0 ? (newTotal / goal) * 100 : 0;

    const html = getPlayerNotificationHtml({
      playerName: player.name,
      donorName: data.donorName,
      amount: data.amount,
      newTotal: newTotal.toFixed(2),
      goalAmount: goal.toFixed(2),
      progressPercent,
      appName: APP_NAME,
      appUrl: `${appUrl}/dashboard`,
    });

    return await sendEmail({
      to: user.email,
      subject: `You received a $${data.amount} donation!`,
      html,
    });
  } catch (error) {
    console.error('Error sending player notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check and send milestone emails (50% and 100%)
 * Returns true if a milestone was reached and email sent
 */
export async function checkAndSendMilestone(data: {
  playerId: string;
  previousTotal: number;
  newTotal: number;
}): Promise<{ sent: boolean; milestone?: '50%' | '100%'; error?: string }> {
  try {
    const enabled = await isGmailEnabled();
    if (!enabled) {
      return { sent: false, error: 'Gmail not enabled' };
    }

    // Get player info
    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, data.playerId))
      .limit(1);

    if (!player || !player.userId) {
      return { sent: false, error: 'Player not found' };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, player.userId))
      .limit(1);

    if (!user) {
      return { sent: false, error: 'User not found' };
    }

    const goal = parseFloat(player.goal);
    if (goal <= 0) {
      return { sent: false, error: 'Invalid goal amount' };
    }

    const previousPercent = (data.previousTotal / goal) * 100;
    const newPercent = (data.newTotal / goal) * 100;

    let milestone: '50%' | '100%' | null = null;

    // Check for 100% milestone first (takes priority)
    if (previousPercent < 100 && newPercent >= 100) {
      milestone = '100%';
    }
    // Check for 50% milestone
    else if (previousPercent < 50 && newPercent >= 50) {
      milestone = '50%';
    }

    if (!milestone) {
      return { sent: false };
    }

    const appUrl = await getAppUrl();
    const html = getMilestoneHtml({
      playerName: player.name,
      milestone,
      currentAmount: data.newTotal.toFixed(2),
      goalAmount: goal.toFixed(2),
      appName: APP_NAME,
      appUrl: `${appUrl}/player/${player.slug}`,
    });

    const title = milestone === '100%' ? 'Goal Achieved!' : 'Halfway There!';
    const result = await sendEmail({
      to: user.email,
      subject: `${title} - ${player.name}'s Fundraiser`,
      html,
    });

    return {
      sent: result.success,
      milestone,
      error: result.error,
    };
  } catch (error) {
    console.error('Error sending milestone email:', error);
    return { sent: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send welcome email to new player
 */
export async function sendWelcomeEmail(data: {
  playerSlug: string;
  playerName: string;
  userEmail: string;
  goalAmount: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const enabled = await isGmailEnabled();
    if (!enabled) {
      console.log('Gmail not enabled, skipping welcome email');
      return { success: false, error: 'Gmail not enabled' };
    }

    const appUrl = await getAppUrl();
    const html = getWelcomeEmailHtml({
      playerName: data.playerName,
      playerEmail: data.userEmail,
      fundraiserUrl: `${appUrl}/player/${data.playerSlug}`,
      goalAmount: data.goalAmount,
      appName: APP_NAME,
    });

    return await sendEmail({
      to: data.userEmail,
      subject: `Welcome to ${APP_NAME}!`,
      html,
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Process email notifications after a successful donation
 * This is the main entry point for payment webhooks
 */
export async function processPostDonationEmails(data: {
  playerId: string;
  squareId: string;
  amount: number;
  donorEmail?: string | null;
  donorName?: string | null;
  transactionId?: string;
  previousTotal?: number;
}): Promise<void> {
  try {
    const enabled = await isGmailEnabled();
    if (!enabled) {
      console.log('Gmail not enabled, skipping post-donation emails');
      return;
    }

    // Get player info for the player name
    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, data.playerId))
      .limit(1);

    if (!player) {
      console.error('Player not found for post-donation emails');
      return;
    }

    const amountStr = data.amount.toFixed(2);

    // Send receipt to donor if email provided
    if (data.donorEmail) {
      const receiptResult = await sendDonationReceipt({
        donorEmail: data.donorEmail,
        donorName: data.donorName || undefined,
        playerName: player.name,
        amount: amountStr,
        transactionId: data.transactionId,
      });
      console.log('Donation receipt sent:', receiptResult.success);
    }

    // Notify player about new donation
    const notifyResult = await sendPlayerDonationNotification({
      playerId: data.playerId,
      donorName: data.donorName || undefined,
      amount: amountStr,
    });
    console.log('Player notification sent:', notifyResult.success);

    // Check for milestones
    if (data.previousTotal !== undefined) {
      const newTotal = parseFloat(player.totalRaised);
      const milestoneResult = await checkAndSendMilestone({
        playerId: data.playerId,
        previousTotal: data.previousTotal,
        newTotal,
      });
      if (milestoneResult.sent) {
        console.log(`Milestone ${milestoneResult.milestone} email sent`);
      }
    }
  } catch (error) {
    // Log but don't throw - email failures shouldn't break payment processing
    console.error('Error processing post-donation emails:', error);
  }
}
