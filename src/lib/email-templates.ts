/**
 * Email templates for the volleyball club fundraiser
 * All templates use inline CSS for email client compatibility
 */

interface BaseTemplateData {
  appName?: string;
  appUrl?: string;
}

interface DonationReceiptData extends BaseTemplateData {
  donorName?: string;
  playerName: string;
  amount: string;
  donationDate: string;
  transactionId?: string;
}

interface PlayerNotificationData extends BaseTemplateData {
  playerName: string;
  donorName?: string;
  amount: string;
  newTotal: string;
  goalAmount: string;
  progressPercent: number;
}

interface MilestoneData extends BaseTemplateData {
  playerName: string;
  milestone: '50%' | '100%';
  currentAmount: string;
  goalAmount: string;
}

interface WelcomeEmailData extends BaseTemplateData {
  playerName: string;
  playerEmail: string;
  fundraiserUrl: string;
  goalAmount: string;
}

interface TestEmailData extends BaseTemplateData {
  recipientEmail: string;
  senderEmail: string;
  timestamp: string;
}

interface PasswordResetEmailData extends BaseTemplateData {
  userName: string;
  resetUrl: string;
  expiryHours: number;
}

const BASE_STYLES = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
  .header h1 { color: white; margin: 0; font-size: 24px; }
  .content { background: #ffffff; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; }
  .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
  .button { display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; }
  .highlight { background: #fdf2f8; padding: 20px; border-radius: 6px; margin: 20px 0; }
  .amount { font-size: 32px; font-weight: bold; color: #ec4899; }
  .progress-bar { background: #e5e7eb; border-radius: 999px; height: 12px; overflow: hidden; margin: 10px 0; }
  .progress-fill { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); height: 100%; border-radius: 999px; }
  p { color: #374151; line-height: 1.6; margin: 16px 0; }
  .details { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; }
  .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
  .details-row:last-child { border-bottom: none; }
  .details-label { color: #6b7280; }
  .details-value { font-weight: 600; color: #374151; }
`;

function wrapInHtmlDocument(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>`;
}

/**
 * Donation receipt email for donors
 */
export function getDonationReceiptHtml(data: DonationReceiptData): string {
  const { donorName, playerName, amount, donationDate, transactionId, appName = 'Volleyball Fundraiser', appUrl = '' } = data;

  const content = `
    <div class="header">
      <h1>Thank You for Your Donation!</h1>
    </div>
    <div class="content">
      <p>Dear ${donorName || 'Supporter'},</p>

      <p>Thank you for your generous donation to support <strong>${playerName}</strong>'s volleyball fundraiser!</p>

      <div class="highlight" style="text-align: center;">
        <p style="margin: 0; color: #6b7280;">Your Donation Amount</p>
        <p class="amount" style="margin: 10px 0;">$${amount}</p>
      </div>

      <div class="details">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Player</td>
            <td style="padding: 8px 0; font-weight: 600; color: #374151; text-align: right; border-bottom: 1px solid #e5e7eb;">${playerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Date</td>
            <td style="padding: 8px 0; font-weight: 600; color: #374151; text-align: right; border-bottom: 1px solid #e5e7eb;">${donationDate}</td>
          </tr>
          ${transactionId ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Transaction ID</td>
            <td style="padding: 8px 0; font-weight: 600; color: #374151; text-align: right; font-size: 12px;">${transactionId}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p>Your support makes a real difference in helping our athletes achieve their goals. Every contribution brings them one step closer to success!</p>

      ${appUrl ? `
      <p style="text-align: center; margin-top: 30px;">
        <a href="${appUrl}" class="button">Visit Our Fundraiser</a>
      </p>
      ` : ''}
    </div>
    <div class="footer">
      <p style="margin: 0;">${appName}</p>
      <p style="margin: 10px 0 0 0;">This receipt is for your records. Please keep it for tax purposes.</p>
    </div>
  `;

  return wrapInHtmlDocument(content, 'Donation Receipt - Thank You!');
}

/**
 * New donation notification for players
 */
export function getPlayerNotificationHtml(data: PlayerNotificationData): string {
  const {
    playerName,
    donorName,
    amount,
    newTotal,
    goalAmount,
    progressPercent,
    appName = 'Volleyball Fundraiser',
    appUrl = ''
  } = data;

  const content = `
    <div class="header">
      <h1>You Received a Donation!</h1>
    </div>
    <div class="content">
      <p>Hi ${playerName},</p>

      <p>Great news! ${donorName ? `<strong>${donorName}</strong>` : 'Someone'} just donated to your fundraiser!</p>

      <div class="highlight" style="text-align: center;">
        <p style="margin: 0; color: #6b7280;">New Donation</p>
        <p class="amount" style="margin: 10px 0;">$${amount}</p>
      </div>

      <p style="text-align: center;"><strong>Your Progress</strong></p>

      <div class="progress-bar">
        <div class="progress-fill" style="width: ${Math.min(progressPercent, 100)}%;"></div>
      </div>

      <p style="text-align: center; margin: 10px 0;">
        <strong>$${newTotal}</strong> raised of <strong>$${goalAmount}</strong> goal
        <br>
        <span style="color: #ec4899; font-weight: bold;">${progressPercent.toFixed(0)}% complete</span>
      </p>

      <p>Keep sharing your fundraiser page to reach more supporters!</p>

      ${appUrl ? `
      <p style="text-align: center; margin-top: 30px;">
        <a href="${appUrl}" class="button">View Your Fundraiser</a>
      </p>
      ` : ''}
    </div>
    <div class="footer">
      <p style="margin: 0;">${appName}</p>
    </div>
  `;

  return wrapInHtmlDocument(content, 'New Donation Received!');
}

/**
 * Milestone achievement email
 */
export function getMilestoneHtml(data: MilestoneData): string {
  const {
    playerName,
    milestone,
    currentAmount,
    goalAmount,
    appName = 'Volleyball Fundraiser',
    appUrl = ''
  } = data;

  const isFull = milestone === '100%';
  const title = isFull ? 'Goal Achieved!' : 'Halfway There!';
  const emoji = isFull ? '' : '';
  const message = isFull
    ? `Congratulations! You've reached your fundraising goal!`
    : `Amazing progress! You've reached 50% of your fundraising goal!`;

  const content = `
    <div class="header">
      <h1>${emoji} ${title}</h1>
    </div>
    <div class="content">
      <p>Hi ${playerName},</p>

      <p>${message}</p>

      <div class="highlight" style="text-align: center;">
        <p style="margin: 0; color: #6b7280;">Amount Raised</p>
        <p class="amount" style="margin: 10px 0;">$${currentAmount}</p>
        <p style="margin: 0; color: #6b7280;">of $${goalAmount} goal</p>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" style="width: ${isFull ? '100' : '50'}%;"></div>
      </div>

      ${isFull ? `
      <p>This is an incredible achievement! Thank you to everyone who supported your journey. Your hard work in sharing and promoting your fundraiser has paid off!</p>
      ` : `
      <p>You're doing amazing! Keep up the great work and continue sharing your fundraiser with friends and family. You're well on your way to reaching your goal!</p>
      `}

      ${appUrl ? `
      <p style="text-align: center; margin-top: 30px;">
        <a href="${appUrl}" class="button">${isFull ? 'Celebrate Your Success' : 'Keep Going'}</a>
      </p>
      ` : ''}
    </div>
    <div class="footer">
      <p style="margin: 0;">${appName}</p>
    </div>
  `;

  return wrapInHtmlDocument(content, `${title} - ${appName}`);
}

/**
 * Welcome email for new players
 */
export function getWelcomeEmailHtml(data: WelcomeEmailData): string {
  const {
    playerName,
    playerEmail,
    fundraiserUrl,
    goalAmount,
    appName = 'Volleyball Fundraiser',
  } = data;

  const content = `
    <div class="header">
      <h1>Welcome to the Team!</h1>
    </div>
    <div class="content">
      <p>Hi ${playerName},</p>

      <p>Welcome to the volleyball fundraiser! Your personal fundraising page has been created and is ready to share.</p>

      <div class="highlight">
        <p style="margin: 0 0 10px 0;"><strong>Your Account Details:</strong></p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">Email</td>
            <td style="padding: 5px 0; font-weight: 600; color: #374151; text-align: right;">${playerEmail}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #6b7280;">Fundraising Goal</td>
            <td style="padding: 5px 0; font-weight: 600; color: #374151; text-align: right;">$${goalAmount}</td>
          </tr>
        </table>
      </div>

      <p><strong>Tips for Success:</strong></p>
      <ul style="color: #374151; line-height: 1.8;">
        <li>Share your fundraiser link with family, friends, and on social media</li>
        <li>Send personal messages explaining why this fundraiser matters to you</li>
        <li>Thank your supporters promptly</li>
        <li>Post updates about your progress</li>
      </ul>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${fundraiserUrl}" class="button">View Your Fundraiser Page</a>
      </p>

      <p style="margin-top: 30px;">Your unique fundraiser link:<br>
      <a href="${fundraiserUrl}" style="color: #ec4899;">${fundraiserUrl}</a></p>
    </div>
    <div class="footer">
      <p style="margin: 0;">${appName}</p>
      <p style="margin: 10px 0 0 0;">Good luck with your fundraising!</p>
    </div>
  `;

  return wrapInHtmlDocument(content, `Welcome to ${appName}!`);
}

/**
 * Password reset email
 */
export function getPasswordResetEmailHtml(data: PasswordResetEmailData): string {
  const {
    userName,
    resetUrl,
    expiryHours,
    appName = 'Volleyball Fundraiser',
  } = data;

  const content = `
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>

      <p>We received a request to reset your password. Click the button below to create a new password:</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>

      <div class="highlight">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          <strong>Important:</strong> This link will expire in ${expiryHours} hour${expiryHours > 1 ? 's' : ''}.
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>

      <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #ec4899; word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0;">${appName}</p>
      <p style="margin: 10px 0 0 0;">For security, this password reset link will expire soon.</p>
    </div>
  `;

  return wrapInHtmlDocument(content, `Reset Your Password - ${appName}`);
}

/**
 * Test email to verify Gmail configuration
 */
export function getTestEmailHtml(data: TestEmailData): string {
  const {
    recipientEmail,
    senderEmail,
    timestamp,
    appName = 'Volleyball Fundraiser',
  } = data;

  const content = `
    <div class="header">
      <h1>Email Configuration Test</h1>
    </div>
    <div class="content">
      <p>This is a test email from your fundraiser application.</p>

      <div class="highlight">
        <p style="margin: 0 0 10px 0;"><strong>Test Details:</strong></p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Sent To</td>
            <td style="padding: 8px 0; font-weight: 600; color: #374151; text-align: right; border-bottom: 1px solid #e5e7eb;">${recipientEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Sent From</td>
            <td style="padding: 8px 0; font-weight: 600; color: #374151; text-align: right; border-bottom: 1px solid #e5e7eb;">${senderEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Timestamp</td>
            <td style="padding: 8px 0; font-weight: 600; color: #374151; text-align: right;">${timestamp}</td>
          </tr>
        </table>
      </div>

      <div style="background: #d1fae5; border: 1px solid #6ee7b7; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #065f46; font-weight: 600;">Success!</p>
        <p style="margin: 10px 0 0 0; color: #047857;">If you're reading this, your Gmail integration is working correctly. You can now send donation receipts, player notifications, and other emails from your fundraiser application.</p>
      </div>

      <p style="color: #6b7280; font-size: 14px;">This test email was triggered from the Admin Settings page.</p>
    </div>
    <div class="footer">
      <p style="margin: 0;">${appName}</p>
      <p style="margin: 10px 0 0 0;">Email configuration test completed successfully.</p>
    </div>
  `;

  return wrapInHtmlDocument(content, `Test Email - ${appName}`);
}
