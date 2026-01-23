'use client';

import { useEffect, useRef } from 'react';
import { trackPageView, getSessionId, extendSession } from '@/lib/analytics';

interface PlayerPageTrackerProps {
  playerId: string;
  path: string;
}

/**
 * Client component to track player page views with player ID
 */
export function PlayerPageTracker({ playerId, path }: PlayerPageTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    // Only track once per mount
    if (trackedRef.current) return;
    trackedRef.current = true;

    trackPageView({
      path,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      playerId,
    });
  }, [playerId, path]);

  // Extend session on user activity
  useEffect(() => {
    const handleActivity = () => {
      const sessionId = getSessionId();
      extendSession(sessionId);
    };

    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);

  return null; // This component doesn't render anything
}
