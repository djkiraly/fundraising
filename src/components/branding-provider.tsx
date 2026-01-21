'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface BrandingConfig {
  siteTitle: string;
  siteDescription: string;
  primaryColor: string;
  primaryColorLight: string;
  primaryColorDark: string;
  logoUrl: string | null;
}

const defaultBranding: BrandingConfig = {
  siteTitle: 'Volleyball Club Fundraiser',
  siteDescription: 'Support our volleyball players by purchasing squares on their fundraising hearts!',
  primaryColor: '#FF69B4',
  primaryColorLight: '#FFB6D9',
  primaryColorDark: '#FF1493',
  logoUrl: null,
};

const BrandingContext = createContext<BrandingConfig>(defaultBranding);

export function useBranding() {
  return useContext(BrandingContext);
}

interface BrandingProviderProps {
  children: ReactNode;
  initialBranding?: BrandingConfig;
}

export function BrandingProvider({ children, initialBranding }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingConfig>(initialBranding || defaultBranding);

  useEffect(() => {
    // Fetch branding config from API
    async function fetchBranding() {
      try {
        const response = await fetch('/api/config/public');
        if (response.ok) {
          const data = await response.json();
          if (data.branding) {
            setBranding(data.branding);
          }
        }
      } catch (error) {
        console.error('Failed to fetch branding config:', error);
      }
    }

    // Only fetch if we don't have initial branding
    if (!initialBranding) {
      fetchBranding();
    }
  }, [initialBranding]);

  // Apply CSS variables whenever branding changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-pink', branding.primaryColor);
    root.style.setProperty('--primary-pink-light', branding.primaryColorLight);
    root.style.setProperty('--primary-pink-dark', branding.primaryColorDark);

    // Also update the document title
    document.title = branding.siteTitle;
  }, [branding]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}
