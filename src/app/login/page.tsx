'use client';

import { Suspense, useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, AlertCircle } from 'lucide-react';

interface BrandingConfig {
  siteTitle: string;
  siteDescription: string;
  primaryColor: string;
  primaryColorLight: string;
  primaryColorDark: string;
  logoUrl: string | null;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">
              Password
            </label>
            <Link href="/forgot-password" className="text-sm text-primary-pink hover:text-primary-pink-dark">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full btn-primary ${loading ? 'btn-disabled' : ''}`}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </>
  );
}

/**
 * Login page
 */
export default function LoginPage() {
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
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your dashboard and manage your fundraiser
          </p>
        </div>

        {/* Login Form */}
        <div className="card">
          <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-primary-pink hover:text-primary-pink-dark font-medium">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
