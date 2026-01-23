import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/ui/navbar';
import { ProfileForm } from '@/components/profile-form';
import { ArrowLeft, UserCircle } from 'lucide-react';

/**
 * User profile page
 * Allows users to edit their profile information
 */
export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect('/login?callbackUrl=/profile');
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={session.user.role === 'admin' ? '/admin' : '/dashboard'}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-pink to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <UserCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">My Profile</h1>
                <p className="text-lg text-gray-600">
                  Manage your account settings
                </p>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <ProfileForm />
        </div>
      </main>
    </>
  );
}
