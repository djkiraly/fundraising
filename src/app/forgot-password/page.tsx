'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

interface BrandingConfig {
  siteTitle: string;
  logoUrl: string | null;
}

/**
 * Forgot password page
 * Allows users to request a password reset email
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<BrandingConfig | null>(null);

  useEffect(() => {
    async function fetchBranding() {
      try {
        const response = await fetch('/api/config/public');
        if (response.ok) {
          const data = await response.json();
          setBranding(data.branding);
        }
      } catch (error) {
        console.error('Failed to fetch branding:', error);
      }
    }
    fetchBranding();
  }, []);

  const siteTitle = branding?.siteTitle || 'Volleyball Fundraiser';
  const logoUrl = branding?.logoUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 text-2xl font-bold text-primary-pink mb-4">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={siteTitle}
                width={40}
                height={40}
                className="object-contain"
              />
            ) : (
              <Heart className="w-8 h-8 fill-current" />
            )}
            <span>{siteTitle}</span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Reset your password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we&apos;ll send you a link to reset your password
          </p>
        </div>

        {/* Form */}
        <div className="card">
          {success ? (
            <div className="text-center py-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Check your email</h3>
              <p className="text-sm text-gray-600 mb-4">
                If an account exists with that email address, we&apos;ve sent you instructions to reset your password.
              </p>
              <p className="text-xs text-gray-500">
                Don&apos;t see the email? Check your spam folder.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="label">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full btn-primary ${loading ? 'btn-disabled' : ''}`}
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center text-primary-pink hover:text-primary-pink-dark font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
