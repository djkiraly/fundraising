'use client';

import { SessionProvider } from 'next-auth/react';
import { BrandingProvider } from './branding-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BrandingProvider>{children}</BrandingProvider>
    </SessionProvider>
  );
}
