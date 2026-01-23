'use client';

import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

interface UseRecaptchaReturn {
  ready: boolean;
  loading: boolean;
  error: string | null;
  executeRecaptcha: (action: string) => Promise<string | null>;
  siteKey: string | null;
  enabled: boolean;
}

/**
 * Hook for using Google reCAPTCHA v3
 * Loads the script and provides an execute function
 * Only loads if reCAPTCHA is enabled in settings
 */
export function useRecaptcha(): UseRecaptchaReturn {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  // Fetch site key and load reCAPTCHA script
  useEffect(() => {
    let mounted = true;

    const initRecaptcha = async () => {
      try {
        // Fetch config from API
        const response = await fetch('/api/config/public');
        if (!response.ok) {
          throw new Error('Failed to fetch config');
        }

        const config = await response.json();
        const key = config.recaptchaSiteKey;
        const isEnabled = config.recaptchaEnabled === true;

        if (mounted) {
          setEnabled(isEnabled);
        }

        // If reCAPTCHA is disabled or not configured, skip loading
        if (!isEnabled || !key) {
          if (mounted) {
            setLoading(false);
            setReady(true); // Allow forms to work without reCAPTCHA
          }
          return;
        }

        if (mounted) {
          setSiteKey(key);
        }

        // Check if script already loaded
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => {
            if (mounted) {
              setReady(true);
              setLoading(false);
            }
          });
          return;
        }

        // Load reCAPTCHA script
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/api.js?render=${key}`;
        script.async = true;

        script.onload = () => {
          if (window.grecaptcha) {
            window.grecaptcha.ready(() => {
              if (mounted) {
                setReady(true);
                setLoading(false);
              }
            });
          }
        };

        script.onerror = () => {
          if (mounted) {
            setError('Failed to load reCAPTCHA');
            setLoading(false);
          }
        };

        document.body.appendChild(script);
      } catch (err) {
        if (mounted) {
          console.error('reCAPTCHA init error:', err);
          setError('Failed to initialize reCAPTCHA');
          setLoading(false);
          setReady(true); // Allow forms to work even if reCAPTCHA fails
        }
      }
    };

    initRecaptcha();

    return () => {
      mounted = false;
    };
  }, []);

  // Execute reCAPTCHA and get token
  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      // If reCAPTCHA is disabled, return null (no token needed)
      if (!enabled) {
        return null;
      }

      if (!siteKey || !window.grecaptcha) {
        // reCAPTCHA not available - return null to indicate no token
        return null;
      }

      try {
        const token = await window.grecaptcha.execute(siteKey, { action });
        return token;
      } catch (err) {
        console.error('reCAPTCHA execute error:', err);
        return null;
      }
    },
    [siteKey, enabled]
  );

  return {
    ready,
    loading,
    error,
    executeRecaptcha,
    siteKey,
    enabled,
  };
}
