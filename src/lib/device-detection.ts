import { headers } from 'next/headers';

/**
 * Detect if the request is coming from a mobile device
 * Based on User-Agent header analysis
 */
export async function isMobileDevice(): Promise<boolean> {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';

  // Common mobile device patterns
  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /IEMobile/i,
    /Opera Mini/i,
    /Mobile/i,
    /mobile/i,
    /CriOS/i, // Chrome on iOS
    /FxiOS/i, // Firefox on iOS
  ];

  return mobilePatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Get device type from User-Agent
 */
export async function getDeviceType(): Promise<'mobile' | 'tablet' | 'desktop'> {
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';

  // Tablet patterns (check first as tablets often include "Mobile" in UA)
  const tabletPatterns = [
    /iPad/i,
    /Android(?!.*Mobile)/i, // Android without "Mobile" is usually tablet
    /Tablet/i,
  ];

  if (tabletPatterns.some(pattern => pattern.test(userAgent))) {
    return 'tablet';
  }

  // Mobile patterns
  const mobilePatterns = [
    /iPhone/i,
    /iPod/i,
    /Android.*Mobile/i,
    /webOS/i,
    /BlackBerry/i,
    /IEMobile/i,
    /Opera Mini/i,
    /Mobile Safari/i,
  ];

  if (mobilePatterns.some(pattern => pattern.test(userAgent))) {
    return 'mobile';
  }

  return 'desktop';
}
