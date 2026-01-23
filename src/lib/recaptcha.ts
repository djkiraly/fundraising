import { getConfig } from './config';

/**
 * Verify a reCAPTCHA v3 token on the server side
 * Returns score (0.0 - 1.0) and success status
 */
export async function verifyRecaptcha(
  token: string,
  expectedAction?: string
): Promise<{ success: boolean; score: number; action?: string; error?: string }> {
  const secretKey = await getConfig('RECAPTCHA_SECRET_KEY');

  if (!secretKey) {
    // reCAPTCHA not configured - allow request to proceed
    console.warn('reCAPTCHA not configured, skipping verification');
    return { success: true, score: 1.0 };
  }

  if (!token) {
    return { success: false, score: 0, error: 'No reCAPTCHA token provided' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        score: 0,
        error: data['error-codes']?.join(', ') || 'Verification failed',
      };
    }

    // Check action if specified
    if (expectedAction && data.action !== expectedAction) {
      return {
        success: false,
        score: data.score || 0,
        action: data.action,
        error: `Action mismatch: expected ${expectedAction}, got ${data.action}`,
      };
    }

    return {
      success: true,
      score: data.score || 1.0,
      action: data.action,
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return {
      success: false,
      score: 0,
      error: 'Failed to verify reCAPTCHA',
    };
  }
}

/**
 * Check if reCAPTCHA is configured
 */
export async function isRecaptchaConfigured(): Promise<boolean> {
  const [siteKey, secretKey] = await Promise.all([
    getConfig('RECAPTCHA_SITE_KEY'),
    getConfig('RECAPTCHA_SECRET_KEY'),
  ]);

  return !!(siteKey && secretKey);
}

/**
 * Get reCAPTCHA site key for client-side use
 */
export async function getRecaptchaSiteKey(): Promise<string | null> {
  return getConfig('RECAPTCHA_SITE_KEY');
}

/**
 * Minimum score threshold for allowing requests
 * 1.0 is very likely a good interaction, 0.0 is very likely a bot
 */
export const RECAPTCHA_SCORE_THRESHOLD = 0.5;

/**
 * Check if reCAPTCHA is enabled
 */
export async function isRecaptchaEnabled(): Promise<boolean> {
  const enabled = await getConfig('RECAPTCHA_ENABLED');
  return enabled === 'true';
}

/**
 * Verify reCAPTCHA and check score threshold
 * Skips verification if reCAPTCHA is disabled in settings
 */
export async function verifyRecaptchaWithThreshold(
  token: string,
  expectedAction?: string,
  threshold: number = RECAPTCHA_SCORE_THRESHOLD
): Promise<{ success: boolean; error?: string }> {
  // Check if reCAPTCHA is enabled
  const enabled = await isRecaptchaEnabled();
  if (!enabled) {
    // reCAPTCHA is disabled - allow request to proceed
    return { success: true };
  }

  const result = await verifyRecaptcha(token, expectedAction);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  if (result.score < threshold) {
    return {
      success: false,
      error: `Security check failed. Please try again.`,
    };
  }

  return { success: true };
}
