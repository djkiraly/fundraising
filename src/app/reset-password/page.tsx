'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';

interface BrandingConfig {
  siteTitle: string;
  logoUrl: string | null;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Validate token on load
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidating(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenValid(true);
        } else {
          setError(data.error || 'Invalid or expired reset link');
        }
      } catch {
        setError('Failed to validate reset link');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 text-primary-pink animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Validating reset link...</p>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Invalid Reset Link</h3>
        <p className="text-sm text-gray-600 mb-4">
          {error || 'This password reset link is invalid or has expired.'}
        </p>
        <Link href="/forgot-password" className="text-primary-pink hover:text-primary-pink-dark font-medium">
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Password Reset Successfully</h3>
        <p className="text-sm text-gray-600 mb-4">
          Your password has been updated. Redirecting you to login...
        </p>
        <Link href="/login" className="text-primary-pink hover:text-primary-pink-dark font-medium">
          Go to login now
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="password" className="label">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="••••••••"
            minLength={8}
          />
          <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full btn-primary ${loading ? 'btn-disabled' : ''}`}
        >
          {loading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </>
  );
}

/**
 * Reset password page
 * Allows users to set a new password using the token from email
 */
export default function ResetPasswordPage() {
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
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Set new password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
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
