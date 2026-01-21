import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Navbar } from '@/components/ui/navbar';
import { AuditLogs } from '@/components/admin/audit-logs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Admin Audit Logs page
 * View all user activity and system events
 */
export default async function AuditLogsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin"
              className="inline-flex items-center text-primary-pink hover:text-primary-pink-dark mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Admin Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600 mt-2">
              View user activity including logins, donations, and administrative actions
            </p>
          </div>

          {/* Audit Logs Component */}
          <AuditLogs />
        </div>
      </main>
    </>
  );
}
