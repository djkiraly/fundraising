'use client';

import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, RefreshCw, CheckCircle, XCircle, Mail, ExternalLink, CreditCard, Zap, Palette, Send, MessageSquare, Shield } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';

interface Setting {
  id: string;
  key: string;
  value: string;
  maskedValue: string;
  category: string;
  isSecret: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SettingsFormProps {
  initialSettings: Setting[];
  onTestStripe: () => Promise<{ success: boolean; error?: string; account?: { id: string } }>;
  onTestSquare: () => Promise<{ success: boolean; error?: string; location?: { id: string; name: string; address?: string } }>;
  onTestGmail: () => Promise<{ success: boolean; error?: string; email?: string; enabled?: boolean }>;
  onAuthorizeGmail: () => Promise<{ success: boolean; error?: string; authUrl?: string }>;
  onSendTestEmail: (recipientEmail: string) => Promise<{ success: boolean; error?: string; message?: string }>;
}

// Default settings configuration
const DEFAULT_SETTINGS: Array<{
  key: string;
  category: string;
  isSecret: boolean;
  description: string;
  placeholder?: string;
  defaultValue?: string;
}> = [
  // Stripe settings
  {
    key: 'STRIPE_SECRET_KEY',
    category: 'stripe',
    isSecret: true,
    description: 'Stripe API secret key',
    placeholder: 'sk_live_... or sk_test_...',
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    category: 'stripe',
    isSecret: true,
    description: 'Stripe webhook signing secret',
    placeholder: 'whsec_...',
  },
  {
    key: 'STRIPE_PUBLISHABLE_KEY',
    category: 'stripe',
    isSecret: false,
    description: 'Stripe publishable key for client-side',
    placeholder: 'pk_live_... or pk_test_...',
  },
  // Square settings
  {
    key: 'SQUARE_APPLICATION_ID',
    category: 'square',
    isSecret: false,
    description: 'Square Application ID',
    placeholder: 'sandbox-... or sq0idp-...',
  },
  {
    key: 'SQUARE_ACCESS_TOKEN',
    category: 'square',
    isSecret: true,
    description: 'Square Access Token',
    placeholder: 'EAAA...',
  },
  {
    key: 'SQUARE_LOCATION_ID',
    category: 'square',
    isSecret: false,
    description: 'Square Location ID',
    placeholder: 'L...',
  },
  {
    key: 'SQUARE_WEBHOOK_SIGNATURE_KEY',
    category: 'square',
    isSecret: true,
    description: 'Square webhook signature key',
    placeholder: 'Webhook signature key',
  },
  {
    key: 'SQUARE_ENVIRONMENT',
    category: 'square',
    isSecret: false,
    description: 'Square environment',
    placeholder: 'sandbox or production',
    defaultValue: 'sandbox',
  },
  // Payment provider flags (handled separately via toggles)
  {
    key: 'STRIPE_ENABLED',
    category: 'payment',
    isSecret: false,
    description: 'Enable Stripe as the active payment provider',
    defaultValue: 'false',
  },
  {
    key: 'SQUARE_ENABLED',
    category: 'payment',
    isSecret: false,
    description: 'Enable Square as the active payment provider',
    defaultValue: 'false',
  },
  // Square value settings
  {
    key: 'SQUARE_MIN_VALUE',
    category: 'squares',
    isSecret: false,
    description: 'Minimum dollar value per square',
    placeholder: '1',
    defaultValue: '1',
  },
  {
    key: 'SQUARE_MAX_VALUE',
    category: 'squares',
    isSecret: false,
    description: 'Maximum dollar value per square',
    placeholder: '10',
    defaultValue: '10',
  },
  {
    key: 'SQUARE_TARGET_TOTAL',
    category: 'squares',
    isSecret: false,
    description: 'Target total for all squares combined',
    placeholder: '100',
    defaultValue: '100',
  },
  // Gmail settings
  {
    key: 'GMAIL_CLIENT_ID',
    category: 'gmail',
    isSecret: false,
    description: 'Google OAuth Client ID',
    placeholder: '...apps.googleusercontent.com',
  },
  {
    key: 'GMAIL_CLIENT_SECRET',
    category: 'gmail',
    isSecret: true,
    description: 'Google OAuth Client Secret',
    placeholder: 'Client secret from Google Cloud Console',
  },
  {
    key: 'GMAIL_ENABLED',
    category: 'gmail',
    isSecret: false,
    description: 'Enable email sending',
    defaultValue: 'false',
  },
  // Branding settings
  {
    key: 'SITE_TITLE',
    category: 'branding',
    isSecret: false,
    description: 'The main title of the application',
    placeholder: 'Volleyball Club Fundraiser',
    defaultValue: 'Volleyball Club Fundraiser',
  },
  {
    key: 'SITE_DESCRIPTION',
    category: 'branding',
    isSecret: false,
    description: 'Short description for SEO and meta tags',
    placeholder: 'Support our players...',
    defaultValue: 'Support our volleyball players by purchasing squares on their fundraising hearts!',
  },
  {
    key: 'PRIMARY_COLOR',
    category: 'branding',
    isSecret: false,
    description: 'Primary brand color (hex)',
    placeholder: '#FF69B4',
    defaultValue: '#FF69B4',
  },
  {
    key: 'PRIMARY_COLOR_LIGHT',
    category: 'branding',
    isSecret: false,
    description: 'Light variant of primary color',
    placeholder: '#FFB6D9',
    defaultValue: '#FFB6D9',
  },
  {
    key: 'PRIMARY_COLOR_DARK',
    category: 'branding',
    isSecret: false,
    description: 'Dark variant of primary color',
    placeholder: '#FF1493',
    defaultValue: '#FF1493',
  },
  {
    key: 'LOGO_URL',
    category: 'branding',
    isSecret: false,
    description: 'URL to your logo image (optional)',
    placeholder: 'https://example.com/logo.png',
  },
  {
    key: 'WELCOME_MESSAGE',
    category: 'branding',
    isSecret: false,
    description: 'Welcome message displayed above player cards (supports rich text)',
    placeholder: 'Welcome to our fundraiser! Support our players by purchasing squares.',
    defaultValue: '',
  },
  // reCAPTCHA settings
  {
    key: 'RECAPTCHA_ENABLED',
    category: 'security',
    isSecret: false,
    description: 'Enable reCAPTCHA protection',
    defaultValue: 'false',
  },
  {
    key: 'RECAPTCHA_SITE_KEY',
    category: 'security',
    isSecret: false,
    description: 'Google reCAPTCHA v3 Site Key',
    placeholder: '6L...',
  },
  {
    key: 'RECAPTCHA_SECRET_KEY',
    category: 'security',
    isSecret: true,
    description: 'Google reCAPTCHA v3 Secret Key',
    placeholder: '6L...',
  },
];

export function SettingsForm({ initialSettings, onTestStripe, onTestSquare, onTestGmail, onAuthorizeGmail, onSendTestEmail }: SettingsFormProps) {
  // Track all field values (existing + new)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Test states
  const [testingStripe, setTestingStripe] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingSquare, setTestingSquare] = useState(false);
  const [squareTestResult, setSquareTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingGmail, setTestingGmail] = useState(false);
  const [gmailTestResult, setGmailTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [authorizingGmail, setAuthorizingGmail] = useState(false);

  const [togglingPayment, setTogglingPayment] = useState(false);
  const [gmailCallbackUrl, setGmailCallbackUrl] = useState('/api/admin/settings/gmail-callback');

  // Test email state
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Gmail toggle state
  const [togglingGmail, setTogglingGmail] = useState(false);

  // reCAPTCHA toggle state
  const [togglingRecaptcha, setTogglingRecaptcha] = useState(false);

  // Initialize field values from existing settings
  useEffect(() => {
    const values: Record<string, string> = {};
    const saved = new Set<string>();

    // First, set default values
    DEFAULT_SETTINGS.forEach(setting => {
      values[setting.key] = setting.defaultValue || '';
    });

    // Then, override with existing values from database
    initialSettings.forEach(setting => {
      values[setting.key] = setting.value;
      saved.add(setting.key);
    });

    setFieldValues(values);
    setSavedKeys(saved);
  }, [initialSettings]);

  useEffect(() => {
    setGmailCallbackUrl(`${window.location.origin}/api/admin/settings/gmail-callback`);
  }, []);

  // Get setting config
  const getSettingConfig = (key: string) => DEFAULT_SETTINGS.find(s => s.key === key);

  // Check if a setting exists in the database
  const settingExists = (key: string) => savedKeys.has(key);

  // Save a single field
  const handleSave = async (key: string) => {
    const config = getSettingConfig(key);
    if (!config) return;

    const value = fieldValues[key] || '';

    setSaving(prev => ({ ...prev, [key]: true }));
    setError(null);

    try {
      const exists = settingExists(key);
      const response = await fetch('/api/admin/settings', {
        method: exists ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value,
          category: config.category,
          isSecret: config.isSecret,
          description: config.description,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save setting');
      }

      // Mark as saved
      setSavedKeys(prev => new Set([...prev, key]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save setting');
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  // Payment provider toggles
  const isStripeEnabled = fieldValues['STRIPE_ENABLED'] === 'true';
  const isSquareEnabled = fieldValues['SQUARE_ENABLED'] === 'true';

  const handlePaymentProviderToggle = async (provider: 'stripe' | 'square') => {
    setTogglingPayment(true);
    setError(null);

    try {
      const newStripeEnabled = provider === 'stripe' ? !isStripeEnabled : false;
      const newSquareEnabled = provider === 'square' ? !isSquareEnabled : false;

      // Update STRIPE_ENABLED
      await fetch('/api/admin/settings', {
        method: settingExists('STRIPE_ENABLED') ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'STRIPE_ENABLED',
          value: newStripeEnabled.toString(),
          category: 'payment',
          isSecret: false,
          description: 'Enable Stripe as the active payment provider',
        }),
      });

      // Update SQUARE_ENABLED
      await fetch('/api/admin/settings', {
        method: settingExists('SQUARE_ENABLED') ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'SQUARE_ENABLED',
          value: newSquareEnabled.toString(),
          category: 'payment',
          isSecret: false,
          description: 'Enable Square as the active payment provider',
        }),
      });

      // Update local state
      setFieldValues(prev => ({
        ...prev,
        STRIPE_ENABLED: newStripeEnabled.toString(),
        SQUARE_ENABLED: newSquareEnabled.toString(),
      }));
      setSavedKeys(prev => new Set([...prev, 'STRIPE_ENABLED', 'SQUARE_ENABLED']));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment provider');
    } finally {
      setTogglingPayment(false);
    }
  };

  // Test handlers
  const handleTestStripe = async () => {
    setTestingStripe(true);
    setStripeTestResult(null);
    try {
      const result = await onTestStripe();
      setStripeTestResult({
        success: result.success,
        message: result.success
          ? `Connected! Account: ${result.account?.id}`
          : result.error || 'Connection failed',
      });
    } catch (err) {
      setStripeTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setTestingStripe(false);
    }
  };

  const handleTestSquare = async () => {
    setTestingSquare(true);
    setSquareTestResult(null);
    try {
      const result = await onTestSquare();
      setSquareTestResult({
        success: result.success,
        message: result.success
          ? `Connected! Location: ${result.location?.name}`
          : result.error || 'Connection failed',
      });
    } catch (err) {
      setSquareTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setTestingSquare(false);
    }
  };

  const handleTestGmail = async () => {
    setTestingGmail(true);
    setGmailTestResult(null);
    try {
      const result = await onTestGmail();
      setGmailTestResult({
        success: result.success,
        message: result.success
          ? `Connected! Email: ${result.email}`
          : result.error || 'Connection failed',
      });
    } catch (err) {
      setGmailTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      });
    } finally {
      setTestingGmail(false);
    }
  };

  const handleAuthorizeGmail = async () => {
    setAuthorizingGmail(true);
    setGmailTestResult(null);
    try {
      const result = await onAuthorizeGmail();
      if (result.success && result.authUrl) {
        window.location.href = result.authUrl;
      } else {
        setGmailTestResult({
          success: false,
          message: result.error || 'Failed to initiate authorization',
        });
        setAuthorizingGmail(false);
      }
    } catch (err) {
      setGmailTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Authorization failed',
      });
      setAuthorizingGmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient.trim()) {
      setTestEmailResult({
        success: false,
        message: 'Please enter a recipient email address',
      });
      return;
    }

    setSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const result = await onSendTestEmail(testEmailRecipient.trim());
      setTestEmailResult({
        success: result.success,
        message: result.success
          ? result.message || `Test email sent to ${testEmailRecipient}`
          : result.error || 'Failed to send test email',
      });
      if (result.success) {
        setTestEmailRecipient('');
      }
    } catch (err) {
      setTestEmailResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send test email',
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Gmail enabled state
  const isGmailEnabled = fieldValues['GMAIL_ENABLED'] === 'true';

  const handleGmailToggle = async () => {
    setTogglingGmail(true);
    setError(null);

    try {
      const newGmailEnabled = !isGmailEnabled;

      await fetch('/api/admin/settings', {
        method: settingExists('GMAIL_ENABLED') ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'GMAIL_ENABLED',
          value: newGmailEnabled.toString(),
          category: 'gmail',
          isSecret: false,
          description: 'Enable email sending',
        }),
      });

      setFieldValues(prev => ({
        ...prev,
        GMAIL_ENABLED: newGmailEnabled.toString(),
      }));
      setSavedKeys(prev => new Set([...prev, 'GMAIL_ENABLED']));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update Gmail setting');
    } finally {
      setTogglingGmail(false);
    }
  };

  // reCAPTCHA enabled state
  const isRecaptchaEnabled = fieldValues['RECAPTCHA_ENABLED'] === 'true';

  const handleRecaptchaToggle = async () => {
    setTogglingRecaptcha(true);
    setError(null);

    try {
      const newRecaptchaEnabled = !isRecaptchaEnabled;

      await fetch('/api/admin/settings', {
        method: settingExists('RECAPTCHA_ENABLED') ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'RECAPTCHA_ENABLED',
          value: newRecaptchaEnabled.toString(),
          category: 'security',
          isSecret: false,
          description: 'Enable reCAPTCHA protection',
        }),
      });

      setFieldValues(prev => ({
        ...prev,
        RECAPTCHA_ENABLED: newRecaptchaEnabled.toString(),
      }));
      setSavedKeys(prev => new Set([...prev, 'RECAPTCHA_ENABLED']));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reCAPTCHA setting');
    } finally {
      setTogglingRecaptcha(false);
    }
  };

  // Render a single setting field
  const renderField = (key: string) => {
    const config = getSettingConfig(key);
    if (!config) return null;

    const value = fieldValues[key] || '';
    const isSecret = config.isSecret;
    const showSecret = showSecrets[key];
    const isSaving = saving[key];
    const isSaved = settingExists(key);

    return (
      <div key={key} className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {config.description}
          </label>
          {isSaved && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={isSecret && !showSecret ? 'password' : 'text'}
              value={value}
              onChange={(e) => setFieldValues(prev => ({ ...prev, [key]: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-pink focus:border-transparent pr-10"
              placeholder={config.placeholder || ''}
            />
            {isSecret && (
              <button
                type="button"
                onClick={() => setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
          <button
            onClick={() => handleSave(key)}
            disabled={isSaving}
            className="px-3 py-2 bg-primary-pink text-white rounded-lg hover:bg-primary-pink-dark disabled:opacity-50 flex items-center gap-1 text-sm"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    );
  };

  // Get branding colors for preview
  const primaryColor = fieldValues['PRIMARY_COLOR'] || '#FF69B4';
  const primaryLight = fieldValues['PRIMARY_COLOR_LIGHT'] || '#FFB6D9';
  const primaryDark = fieldValues['PRIMARY_COLOR_DARK'] || '#FF1493';

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* ==================== PAYMENT SECTION ==================== */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary-pink to-pink-400 px-6 py-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Payment Settings</h2>
              <p className="text-pink-100 text-sm">Configure payment providers and processing</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Payment Provider Status & Toggle */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Provider</h3>

            <div className={`p-4 rounded-lg mb-4 flex items-center gap-3 ${
              !isStripeEnabled && !isSquareEnabled
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              <Zap className={`w-5 h-5 ${
                !isStripeEnabled && !isSquareEnabled ? 'text-yellow-600' : 'text-green-600'
              }`} />
              <div>
                <p className={`font-medium ${
                  !isStripeEnabled && !isSquareEnabled ? 'text-yellow-800' : 'text-green-800'
                }`}>
                  {isStripeEnabled ? 'Stripe is active' : isSquareEnabled ? 'Square is active' : 'Simulation Mode'}
                </p>
                <p className={`text-sm ${
                  !isStripeEnabled && !isSquareEnabled ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {!isStripeEnabled && !isSquareEnabled
                    ? 'No payment provider enabled. Donations will be simulated.'
                    : 'Real payments are being processed.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stripe Toggle */}
              <div className={`p-4 rounded-lg border-2 transition-colors ${
                isStripeEnabled ? 'border-primary-pink bg-pink-50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isStripeEnabled ? 'bg-primary-pink text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Stripe</h4>
                      <p className="text-xs text-gray-500">Cards, Apple Pay, Google Pay</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePaymentProviderToggle('stripe')}
                    disabled={togglingPayment}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isStripeEnabled ? 'bg-primary-pink' : 'bg-gray-300'
                    } ${togglingPayment ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isStripeEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Square Toggle */}
              <div className={`p-4 rounded-lg border-2 transition-colors ${
                isSquareEnabled ? 'border-primary-pink bg-pink-50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSquareEnabled ? 'bg-primary-pink text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4.5 0A4.5 4.5 0 000 4.5v15A4.5 4.5 0 004.5 24h15a4.5 4.5 0 004.5-4.5v-15A4.5 4.5 0 0019.5 0h-15zm2.25 6.75h10.5a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5H6.75a1.5 1.5 0 01-1.5-1.5v-7.5a1.5 1.5 0 011.5-1.5z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Square</h4>
                      <p className="text-xs text-gray-500">Cards, Square payments</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePaymentProviderToggle('square')}
                    disabled={togglingPayment}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isSquareEnabled ? 'bg-primary-pink' : 'bg-gray-300'
                    } ${togglingPayment ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isSquareEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {togglingPayment && (
              <div className="mt-3 flex items-center gap-2 text-gray-500">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Updating payment provider...</span>
              </div>
            )}
          </div>

          {/* Stripe Configuration */}
          <div className={`border rounded-lg overflow-hidden ${isStripeEnabled ? 'border-primary-pink' : 'border-gray-200'}`}>
            <div className={`px-4 py-3 flex items-center justify-between ${isStripeEnabled ? 'bg-pink-50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Stripe Configuration</h3>
                {isStripeEnabled && (
                  <span className="px-2 py-0.5 bg-primary-pink text-white text-xs rounded-full">Active</span>
                )}
              </div>
              <button
                onClick={handleTestStripe}
                disabled={testingStripe}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
              >
                {testingStripe ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Test
              </button>
            </div>

            <div className="p-4 space-y-4">
              {stripeTestResult && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                  stripeTestResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {stripeTestResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {stripeTestResult.message}
                </div>
              )}

              {renderField('STRIPE_SECRET_KEY')}
              {renderField('STRIPE_WEBHOOK_SECRET')}
              {renderField('STRIPE_PUBLISHABLE_KEY')}
            </div>
          </div>

          {/* Square Configuration */}
          <div className={`border rounded-lg overflow-hidden ${isSquareEnabled ? 'border-primary-pink' : 'border-gray-200'}`}>
            <div className={`px-4 py-3 flex items-center justify-between ${isSquareEnabled ? 'bg-pink-50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Square Configuration</h3>
                {isSquareEnabled && (
                  <span className="px-2 py-0.5 bg-primary-pink text-white text-xs rounded-full">Active</span>
                )}
              </div>
              <button
                onClick={handleTestSquare}
                disabled={testingSquare}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
              >
                {testingSquare ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Test
              </button>
            </div>

            <div className="p-4 space-y-4">
              {squareTestResult && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                  squareTestResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {squareTestResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {squareTestResult.message}
                </div>
              )}

              {renderField('SQUARE_APPLICATION_ID')}
              {renderField('SQUARE_ACCESS_TOKEN')}
              {renderField('SQUARE_LOCATION_ID')}
              {renderField('SQUARE_WEBHOOK_SIGNATURE_KEY')}
              {renderField('SQUARE_ENVIRONMENT')}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== GMAIL SECTION ==================== */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Gmail Configuration
            </h3>
            <p className="text-sm text-gray-500">Send email notifications, receipts, and confirmations</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAuthorizeGmail}
              disabled={authorizingGmail}
              className="px-4 py-2 bg-primary-pink text-white rounded-lg hover:bg-primary-pink-dark disabled:opacity-50 flex items-center gap-2"
            >
              {authorizingGmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Authorize Gmail
            </button>
            <button
              onClick={handleTestGmail}
              disabled={testingGmail}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
            >
              {testingGmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Test
            </button>
          </div>
        </div>

        {gmailTestResult && (
          <div className={`p-4 rounded-lg mb-4 flex items-center gap-2 ${
            gmailTestResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {gmailTestResult.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            {gmailTestResult.message}
          </div>
        )}

        {/* Gmail Enable/Disable Toggle */}
        <div className={`p-4 rounded-lg border-2 mb-4 ${
          isGmailEnabled ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isGmailEnabled ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Email Sending</h4>
                <p className="text-xs text-gray-500">
                  {isGmailEnabled ? 'Emails will be sent for donations and notifications' : 'Email sending is disabled'}
                </p>
              </div>
            </div>
            <button
              onClick={handleGmailToggle}
              disabled={togglingGmail}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isGmailEnabled ? 'bg-green-500' : 'bg-gray-300'
              } ${togglingGmail ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isGmailEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          {togglingGmail && (
            <div className="mt-2 flex items-center gap-2 text-gray-500 text-sm">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Updating...
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-blue-800 mb-2">Setup Instructions</h4>
          <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
            <li>Create a project in the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
            <li>Enable the Gmail API for your project</li>
            <li>Configure the OAuth consent screen</li>
            <li>Create OAuth 2.0 credentials (Web application type)</li>
            <li>Add <code className="bg-blue-100 px-1 rounded">{gmailCallbackUrl}</code> as an authorized redirect URI</li>
            <li>Enter your Client ID and Client Secret below</li>
            <li>Click &quot;Authorize Gmail&quot; to complete the OAuth flow</li>
          </ol>
        </div>

        <div className="space-y-4">
          {renderField('GMAIL_CLIENT_ID')}
          {renderField('GMAIL_CLIENT_SECRET')}
        </div>

        {/* Send Test Email Section */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="font-medium text-gray-900 mb-2">Send Test Email</h4>
          <p className="text-sm text-gray-500 mb-3">
            Verify your Gmail integration by sending a test email to any address.
          </p>

          {testEmailResult && (
            <div className={`p-3 rounded-lg mb-3 flex items-center gap-2 text-sm ${
              testEmailResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {testEmailResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testEmailResult.message}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="email"
              value={testEmailRecipient}
              onChange={(e) => setTestEmailRecipient(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-pink focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendTestEmail();
                }
              }}
            />
            <button
              onClick={handleSendTestEmail}
              disabled={sendingTestEmail || !testEmailRecipient.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {sendingTestEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Test
            </button>
          </div>
        </div>
      </div>

      {/* ==================== BRANDING SECTION ==================== */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="w-5 h-5 text-purple-600" />
          <h3 className="text-xl font-bold text-gray-900">Branding &amp; Appearance</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Customize the look and feel of your fundraiser site.
        </p>

        {/* Color Preview */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Color Preview</h4>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-lg border-2 border-gray-200"
                style={{ backgroundColor: primaryLight }}
              />
              <span className="text-xs text-gray-500 mt-1 block">Light</span>
            </div>
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-lg border-2 border-gray-300 shadow-md"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="text-xs text-gray-600 font-medium mt-1 block">Primary</span>
            </div>
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-lg border-2 border-gray-200"
                style={{ backgroundColor: primaryDark }}
              />
              <span className="text-xs text-gray-500 mt-1 block">Dark</span>
            </div>
            <div className="ml-4 flex-1">
              <div
                className="h-10 rounded-lg text-white font-medium flex items-center justify-center text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                Sample Button
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {renderField('SITE_TITLE')}
          {renderField('SITE_DESCRIPTION')}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>{renderField('PRIMARY_COLOR')}</div>
            <div>{renderField('PRIMARY_COLOR_LIGHT')}</div>
            <div>{renderField('PRIMARY_COLOR_DARK')}</div>
          </div>
          {renderField('LOGO_URL')}
        </div>
      </div>

      {/* ==================== WELCOME MESSAGE SECTION ==================== */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Welcome Message</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          This message appears above the player cards on the home page. Use the formatting tools to style your text.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Welcome Message Content
            </label>
            {settingExists('WELCOME_MESSAGE') && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Saved
              </span>
            )}
          </div>

          <RichTextEditor
            value={fieldValues['WELCOME_MESSAGE'] || ''}
            onChange={(value) => setFieldValues(prev => ({ ...prev, WELCOME_MESSAGE: value }))}
            placeholder="Welcome to our fundraiser! Support our players by purchasing squares on their heart-shaped grids."
          />

          <div className="flex justify-end">
            <button
              onClick={() => handleSave('WELCOME_MESSAGE')}
              disabled={saving['WELCOME_MESSAGE']}
              className="px-4 py-2 bg-primary-pink text-white rounded-lg hover:bg-primary-pink-dark disabled:opacity-50 flex items-center gap-2"
            >
              {saving['WELCOME_MESSAGE'] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Welcome Message
            </button>
          </div>

          {/* Preview */}
          {fieldValues['WELCOME_MESSAGE'] && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
              <div
                className="prose prose-sm max-w-none text-gray-700 [&>*]:my-2"
                dangerouslySetInnerHTML={{ __html: fieldValues['WELCOME_MESSAGE'] }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ==================== SQUARE VALUES SECTION ==================== */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Square Value Settings</h3>
        <p className="text-sm text-gray-500 mb-4">
          Configure the randomization of dollar values for heart grid squares.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>{renderField('SQUARE_MIN_VALUE')}</div>
          <div>{renderField('SQUARE_MAX_VALUE')}</div>
          <div>{renderField('SQUARE_TARGET_TOTAL')}</div>
        </div>
      </div>

      {/* ==================== SECURITY SECTION ==================== */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-green-600" />
          <h3 className="text-xl font-bold text-gray-900">Security (reCAPTCHA v3)</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Protect login and payment forms from bots and abuse using Google reCAPTCHA v3.
          Get your keys from the{' '}
          <a
            href="https://www.google.com/recaptcha/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-pink hover:underline inline-flex items-center gap-1"
          >
            Google reCAPTCHA Admin Console
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>

        {/* reCAPTCHA Enable/Disable Toggle */}
        <div className={`p-4 rounded-lg border-2 mb-4 ${
          isRecaptchaEnabled ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isRecaptchaEnabled ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">reCAPTCHA Protection</h4>
                <p className="text-xs text-gray-500">
                  {isRecaptchaEnabled ? 'Bot protection is active on login and payment forms' : 'reCAPTCHA protection is disabled'}
                </p>
              </div>
            </div>
            <button
              onClick={handleRecaptchaToggle}
              disabled={togglingRecaptcha || (!isRecaptchaEnabled && (!fieldValues['RECAPTCHA_SITE_KEY'] || !fieldValues['RECAPTCHA_SECRET_KEY']))}
              title={!isRecaptchaEnabled && (!fieldValues['RECAPTCHA_SITE_KEY'] || !fieldValues['RECAPTCHA_SECRET_KEY']) ? 'Configure keys first' : ''}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isRecaptchaEnabled ? 'bg-green-500' : 'bg-gray-300'
              } ${togglingRecaptcha || (!isRecaptchaEnabled && (!fieldValues['RECAPTCHA_SITE_KEY'] || !fieldValues['RECAPTCHA_SECRET_KEY'])) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isRecaptchaEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          {togglingRecaptcha && (
            <div className="mt-2 flex items-center gap-2 text-gray-500 text-sm">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Updating...
            </div>
          )}
        </div>

        <div className="space-y-4">
          {renderField('RECAPTCHA_SITE_KEY')}
          {renderField('RECAPTCHA_SECRET_KEY')}
        </div>

        {/* Status indicator */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {isRecaptchaEnabled && fieldValues['RECAPTCHA_SITE_KEY'] && fieldValues['RECAPTCHA_SECRET_KEY'] ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">reCAPTCHA is enabled and protecting forms</span>
              </>
            ) : fieldValues['RECAPTCHA_SITE_KEY'] && fieldValues['RECAPTCHA_SECRET_KEY'] ? (
              <>
                <XCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-700">
                  reCAPTCHA keys are configured but protection is disabled. Enable the toggle above to activate.
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">
                  reCAPTCHA is not configured. Enter your Site Key and Secret Key to enable protection.
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
