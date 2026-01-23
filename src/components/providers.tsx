'use client';

import { Suspense } from 'react';
import { SessionProvider } from 'next-auth/react';
import { BrandingProvider } from './branding-provider';
import { AnalyticsProvider } from './analytics-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BrandingProvider>
        <Suspense fallback={null}>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </Suspense>
      </BrandingProvider>
    </SessionProvider>
  );
}
