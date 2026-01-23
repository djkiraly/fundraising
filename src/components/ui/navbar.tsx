'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { Heart, LogOut, LayoutDashboard, Home, Settings, UserCircle } from 'lucide-react';
import { useBranding } from '@/components/branding-provider';

/**
 * Navigation bar component
 */
export function Navbar() {
  const { data: session } = useSession();
  const branding = useBranding();

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary-pink">
            {branding.logoUrl ? (
              <Image src={branding.logoUrl} alt={branding.siteTitle} width={32} height={32} className="w-8 h-8 object-contain" />
            ) : (
              <Heart className="w-6 h-6 fill-current" />
            )}
            <span>{branding.siteTitle}</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>

            {session ? (
              <>
                <Link
                  href={session.user.role === 'admin' ? '/admin' : '/dashboard'}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>

                {session.user.role === 'admin' && (
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                )}

                <button
                  onClick={async () => {
                    await signOut({ redirect: false });
                    window.location.href = '/';
                  }}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>

                <Link
                  href="/profile"
                  className="ml-4 pl-4 border-l border-gray-300 flex items-center gap-3 hover:bg-gray-50 rounded-lg py-1 px-2 -mr-2 transition-colors"
                  title="Edit Profile"
                >
                  <UserCircle className="w-8 h-8 text-gray-400" />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{session.user.name}</div>
                    <div className="text-gray-500 capitalize">{session.user.role}</div>
                  </div>
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-primary-pink text-white rounded-lg hover:bg-primary-pink-dark transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
