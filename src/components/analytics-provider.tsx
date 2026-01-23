'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView, getSessionId, extendSession } from '@/lib/analytics';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * Analytics provider that tracks page views automatically
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Create full path with search params
    const fullPath = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    // Avoid double tracking on same path
    if (lastPathRef.current === fullPath) return;
    lastPathRef.current = fullPath;

    // Extract player ID from path if on player page
    let playerId: string | undefined;
    const playerMatch = pathname.match(/^\/player\/([^/]+)/);
    if (playerMatch) {
      // The match is a slug, not an ID - we'll let the server resolve it
      // For now, we pass null and track by path
    }

    // Track the page view
    trackPageView({
      path: pathname,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      playerId,
    });
  }, [pathname, searchParams]);

  // Extend session on user activity
  useEffect(() => {
    const handleActivity = () => {
      const sessionId = getSessionId();
      extendSession(sessionId);
    };

    // Extend session periodically on user activity
    let activityTimeout: NodeJS.Timeout;
    const throttledActivity = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(handleActivity, 5000); // Throttle to once per 5 seconds
    };

    window.addEventListener('click', throttledActivity, { passive: true });
    window.addEventListener('scroll', throttledActivity, { passive: true });
    window.addEventListener('keydown', throttledActivity, { passive: true });

    return () => {
      clearTimeout(activityTimeout);
      window.removeEventListener('click', throttledActivity);
      window.removeEventListener('scroll', throttledActivity);
      window.removeEventListener('keydown', throttledActivity);
    };
  }, []);

  return <>{children}</>;
}
