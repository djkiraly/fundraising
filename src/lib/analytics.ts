/**
 * Analytics utility functions
 */

/**
 * Parse user agent to extract device, browser, and OS information
 */
export function parseUserAgent(userAgent: string | null): {
  deviceType: string;
  browser: string;
  os: string;
} {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: 'unknown', os: 'unknown' };
  }

  const ua = userAgent.toLowerCase();

  // Detect device type
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  }

  // Detect browser
  let browser = 'unknown';
  if (ua.includes('edg/')) {
    browser = 'Edge';
  } else if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('opera') || ua.includes('opr/')) {
    browser = 'Opera';
  } else if (ua.includes('msie') || ua.includes('trident/')) {
    browser = 'Internet Explorer';
  }

  // Detect OS
  let os = 'unknown';
  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac os x') || ua.includes('macintosh')) {
    os = 'macOS';
  } else if (ua.includes('linux') && !ua.includes('android')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
  } else if (ua.includes('cros')) {
    os = 'Chrome OS';
  }

  return { deviceType, browser, os };
}

/**
 * Generate a unique session ID for anonymous tracking
 */
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

/**
 * Get or create session ID from cookies (client-side)
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return generateSessionId();
  }

  const cookieName = 'analytics_session';
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === cookieName) {
      return value;
    }
  }

  // Create new session
  const sessionId = generateSessionId();
  // Set cookie to expire in 30 minutes of inactivity
  document.cookie = `${cookieName}=${sessionId}; path=/; max-age=1800; SameSite=Lax`;
  return sessionId;
}

/**
 * Extend session cookie expiry (call on each page view)
 */
export function extendSession(sessionId: string): void {
  if (typeof window === 'undefined') return;
  document.cookie = `analytics_session=${sessionId}; path=/; max-age=1800; SameSite=Lax`;
}

/**
 * Track a page view
 */
export async function trackPageView(data: {
  path: string;
  referrer?: string;
  playerId?: string;
}): Promise<void> {
  try {
    const sessionId = getSessionId();
    extendSession(sessionId);

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'pageview',
        sessionId,
        ...data,
      }),
    });
  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.debug('Analytics tracking failed:', error);
  }
}

/**
 * Track an analytics event
 */
export async function trackEvent(data: {
  eventType: string;
  path: string;
  playerId?: string;
  squareId?: string;
  donationId?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const sessionId = getSessionId();
    extendSession(sessionId);

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'event',
        sessionId,
        ...data,
      }),
    });
  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.debug('Analytics tracking failed:', error);
  }
}

/**
 * Analytics event types
 */
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: 'page_view',
  SQUARE_CLICK: 'square_click',
  SQUARE_HOVER: 'square_hover',
  DONATION_STARTED: 'donation_started',
  DONATION_COMPLETED: 'donation_completed',
  DONATION_FAILED: 'donation_failed',
  DONATION_CANCELLED: 'donation_cancelled',
  SHARE_CLICK: 'share_click',
  OUTBOUND_LINK: 'outbound_link',
} as const;
