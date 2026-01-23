import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt, encrypt, maskSecret } from './encryption';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// In-memory cache
const cache = new Map<string, CacheEntry<string | null>>();

/**
 * Clear the config cache
 */
export function clearConfigCache(): void {
  cache.clear();
}

/**
 * Get a single config value by key
 * Falls back to environment variable if not found in database
 */
export async function getConfig(key: string): Promise<string | null> {
  // Check cache first
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (setting) {
      // Decrypt if it's a secret
      const value = setting.isSecret ? decrypt(setting.value) : setting.value;

      // Cache the result
      cache.set(key, {
        value,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return value;
    }
  } catch (error) {
    console.error(`Error fetching config for key "${key}":`, error);
  }

  // Fall back to environment variable
  const envValue = getEnvFallback(key);

  // Cache the fallback result
  cache.set(key, {
    value: envValue,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return envValue;
}

/**
 * Get environment variable fallback for a config key
 */
function getEnvFallback(key: string): string | null {
  const envMapping: Record<string, string | undefined> = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    // Square configuration
    SQUARE_APPLICATION_ID: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
    SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
    SQUARE_LOCATION_ID: process.env.SQUARE_LOCATION_ID,
    SQUARE_WEBHOOK_SIGNATURE_KEY: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT,
    // Payment provider settings
    PAYMENT_PROVIDER_ACTIVE: process.env.PAYMENT_PROVIDER_ACTIVE,
    PAYMENT_PROVIDER_DEFAULT: process.env.PAYMENT_PROVIDER_DEFAULT,
  };

  return envMapping[key] ?? null;
}

/**
 * Get all config values for a category
 */
export async function getConfigByCategory(category: string): Promise<Record<string, string>> {
  try {
    const categorySettings = await db
      .select()
      .from(settings)
      .where(eq(settings.category, category));

    const result: Record<string, string> = {};

    for (const setting of categorySettings) {
      const value = setting.isSecret ? decrypt(setting.value) : setting.value;
      result[setting.key] = value;

      // Update cache
      cache.set(setting.key, {
        value,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }

    return result;
  } catch (error) {
    console.error(`Error fetching config for category "${category}":`, error);
    return {};
  }
}

/**
 * Get Stripe configuration
 * Returns all Stripe-related keys needed for initialization
 */
export async function getStripeConfig(): Promise<{
  secretKey: string | null;
  webhookSecret: string | null;
  publishableKey: string | null;
}> {
  const [secretKey, webhookSecret, publishableKey] = await Promise.all([
    getConfig('STRIPE_SECRET_KEY'),
    getConfig('STRIPE_WEBHOOK_SECRET'),
    getConfig('STRIPE_PUBLISHABLE_KEY'),
  ]);

  return {
    secretKey,
    webhookSecret,
    publishableKey,
  };
}

/**
 * Get Square configuration
 * Returns all Square-related keys needed for initialization
 */
export async function getSquareConfig(): Promise<{
  applicationId: string | null;
  accessToken: string | null;
  locationId: string | null;
  webhookSignatureKey: string | null;
  environment: 'sandbox' | 'production';
}> {
  const [applicationId, accessToken, locationId, webhookSignatureKey, environment] = await Promise.all([
    getConfig('SQUARE_APPLICATION_ID'),
    getConfig('SQUARE_ACCESS_TOKEN'),
    getConfig('SQUARE_LOCATION_ID'),
    getConfig('SQUARE_WEBHOOK_SIGNATURE_KEY'),
    getConfig('SQUARE_ENVIRONMENT'),
  ]);

  return {
    applicationId,
    accessToken,
    locationId,
    webhookSignatureKey,
    environment: (environment === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
  };
}

/**
 * Get payment provider configuration
 * Returns which payment provider is active: 'stripe', 'square', or 'none' (simulation)
 * Only one provider can be active at a time
 */
export async function getPaymentProviderConfig(): Promise<{
  active: 'stripe' | 'square' | 'none';
  stripeEnabled: boolean;
  squareEnabled: boolean;
}> {
  const [stripeEnabled, squareEnabled] = await Promise.all([
    getConfig('STRIPE_ENABLED'),
    getConfig('SQUARE_ENABLED'),
  ]);

  const isStripeEnabled = stripeEnabled === 'true';
  const isSquareEnabled = squareEnabled === 'true';

  // Determine active provider (only one can be active)
  let active: 'stripe' | 'square' | 'none' = 'none';
  if (isStripeEnabled) {
    active = 'stripe';
  } else if (isSquareEnabled) {
    active = 'square';
  }

  return {
    active,
    stripeEnabled: isStripeEnabled,
    squareEnabled: isSquareEnabled,
  };
}

/**
 * Get square randomization configuration
 * Returns settings for randomizing heart grid square values
 */
export async function getSquareRandomizationConfig(): Promise<{
  minValue: number;
  maxValue: number;
  targetTotal: number;
}> {
  const [minValue, maxValue, targetTotal] = await Promise.all([
    getConfig('SQUARE_MIN_VALUE'),
    getConfig('SQUARE_MAX_VALUE'),
    getConfig('SQUARE_TARGET_TOTAL'),
  ]);

  return {
    minValue: minValue ? parseFloat(minValue) : 1,
    maxValue: maxValue ? parseFloat(maxValue) : 10,
    targetTotal: targetTotal ? parseFloat(targetTotal) : 100,
  };
}

/**
 * Set a config value (for use by admin API)
 * Automatically encrypts secret values
 */
export async function setConfig(
  key: string,
  value: string,
  options: {
    category: string;
    isSecret?: boolean;
    description?: string;
  }
): Promise<void> {
  const storedValue = options.isSecret ? encrypt(value) : value;

  // Check if setting exists
  const [existing] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);

  if (existing) {
    // Update existing setting
    await db
      .update(settings)
      .set({
        value: storedValue,
        category: options.category,
        isSecret: options.isSecret ?? false,
        description: options.description,
        updatedAt: new Date(),
      })
      .where(eq(settings.key, key));
  } else {
    // Create new setting
    await db.insert(settings).values({
      key,
      value: storedValue,
      category: options.category,
      isSecret: options.isSecret ?? false,
      description: options.description,
    });
  }

  // Invalidate cache for this key
  cache.delete(key);
}

/**
 * Get all settings for admin display
 * Masks secret values
 */
export async function getAllSettings(): Promise<
  Array<{
    id: string;
    key: string;
    value: string;
    maskedValue: string;
    category: string;
    isSecret: boolean;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  const allSettings = await db.select().from(settings);

  return allSettings.map((setting) => {
    let decryptedValue: string;
    try {
      decryptedValue = setting.isSecret ? decrypt(setting.value) : setting.value;
    } catch {
      decryptedValue = '';
    }

    return {
      id: setting.id,
      key: setting.key,
      value: decryptedValue,
      maskedValue: setting.isSecret ? maskSecret(decryptedValue) : decryptedValue,
      category: setting.category,
      isSecret: setting.isSecret,
      description: setting.description,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  });
}

/**
 * Delete a config value
 */
export async function deleteConfig(key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
  cache.delete(key);
}

/**
 * Get Gmail configuration
 * Returns all Gmail-related keys needed for OAuth and sending emails
 */
export async function getGmailConfig(): Promise<{
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: string | null;
  senderEmail: string | null;
  enabled: boolean;
}> {
  const [
    clientId,
    clientSecret,
    redirectUri,
    accessToken,
    refreshToken,
    tokenExpiry,
    senderEmail,
    enabled,
  ] = await Promise.all([
    getConfig('GMAIL_CLIENT_ID'),
    getConfig('GMAIL_CLIENT_SECRET'),
    getConfig('GMAIL_REDIRECT_URI'),
    getConfig('GMAIL_ACCESS_TOKEN'),
    getConfig('GMAIL_REFRESH_TOKEN'),
    getConfig('GMAIL_TOKEN_EXPIRY'),
    getConfig('GMAIL_SENDER_EMAIL'),
    getConfig('GMAIL_ENABLED'),
  ]);

  return {
    clientId,
    clientSecret,
    redirectUri,
    accessToken,
    refreshToken,
    tokenExpiry,
    senderEmail,
    enabled: enabled === 'true',
  };
}

/**
 * Get branding configuration
 * Returns all branding-related settings for customizing the app appearance
 */
export async function getBrandingConfig(): Promise<{
  siteTitle: string;
  siteDescription: string;
  primaryColor: string;
  primaryColorLight: string;
  primaryColorDark: string;
  logoUrl: string | null;
  welcomeMessage: string | null;
}> {
  const [
    siteTitle,
    siteDescription,
    primaryColor,
    primaryColorLight,
    primaryColorDark,
    logoUrl,
    welcomeMessage,
  ] = await Promise.all([
    getConfig('SITE_TITLE'),
    getConfig('SITE_DESCRIPTION'),
    getConfig('PRIMARY_COLOR'),
    getConfig('PRIMARY_COLOR_LIGHT'),
    getConfig('PRIMARY_COLOR_DARK'),
    getConfig('LOGO_URL'),
    getConfig('WELCOME_MESSAGE'),
  ]);

  return {
    siteTitle: siteTitle || 'Volleyball Club Fundraiser',
    siteDescription: siteDescription || 'Support our volleyball players by purchasing squares on their fundraising hearts!',
    primaryColor: primaryColor || '#FF69B4',
    primaryColorLight: primaryColorLight || '#FFB6D9',
    primaryColorDark: primaryColorDark || '#FF1493',
    logoUrl: logoUrl || null,
    welcomeMessage: welcomeMessage || null,
  };
}
