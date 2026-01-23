'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView, trackEvent, ANALYTICS_EVENTS, getSessionId, extendSession } from '@/lib/analytics';

interface UseAnalyticsOptions {
  playerId?: string;
}

/**
 * Hook to track page views and provide event tracking functions
 */
export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const pathname = usePathname();
  const { playerId } = options;
  const lastPathRef = useRef<string | null>(null);

  // Track page view on path change
  useEffect(() => {
    // Avoid double tracking
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    trackPageView({
      path: pathname,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      playerId,
    });
  }, [pathname, playerId]);

  // Extend session on user activity
  useEffect(() => {
    const handleActivity = () => {
      const sessionId = getSessionId();
      extendSession(sessionId);
    };

    // Extend session on clicks and scrolls
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);

  // Event tracking functions
  const trackSquareClick = useCallback((squareId: string, value: number) => {
    trackEvent({
      eventType: ANALYTICS_EVENTS.SQUARE_CLICK,
      path: pathname,
      playerId,
      squareId,
      value,
    });
  }, [pathname, playerId]);

  const trackSquareHover = useCallback((squareId: string) => {
    trackEvent({
      eventType: ANALYTICS_EVENTS.SQUARE_HOVER,
      path: pathname,
      playerId,
      squareId,
    });
  }, [pathname, playerId]);

  const trackDonationStarted = useCallback((amount: number) => {
    trackEvent({
      eventType: ANALYTICS_EVENTS.DONATION_STARTED,
      path: pathname,
      playerId,
      value: amount,
    });
  }, [pathname, playerId]);

  const trackDonationCompleted = useCallback((donationId: string, amount: number) => {
    trackEvent({
      eventType: ANALYTICS_EVENTS.DONATION_COMPLETED,
      path: pathname,
      playerId,
      donationId,
      value: amount,
    });
  }, [pathname, playerId]);

  const trackDonationFailed = useCallback((amount: number, reason?: string) => {
    trackEvent({
      eventType: ANALYTICS_EVENTS.DONATION_FAILED,
      path: pathname,
      playerId,
      value: amount,
      metadata: reason ? { reason } : undefined,
    });
  }, [pathname, playerId]);

  const trackDonationCancelled = useCallback((amount?: number) => {
    trackEvent({
      eventType: ANALYTICS_EVENTS.DONATION_CANCELLED,
      path: pathname,
      playerId,
      value: amount,
    });
  }, [pathname, playerId]);

  const trackShareClick = useCallback((platform: string) => {
    trackEvent({
      eventType: ANALYTICS_EVENTS.SHARE_CLICK,
      path: pathname,
      playerId,
      metadata: { platform },
    });
  }, [pathname, playerId]);

  const trackOutboundLink = useCallback((url: string) => {
    trackEvent({
      eventType: ANALYTICS_EVENTS.OUTBOUND_LINK,
      path: pathname,
      playerId,
      metadata: { url },
    });
  }, [pathname, playerId]);

  return {
    trackSquareClick,
    trackSquareHover,
    trackDonationStarted,
    trackDonationCompleted,
    trackDonationFailed,
    trackDonationCancelled,
    trackShareClick,
    trackOutboundLink,
  };
}
