import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players, donations, users } from '@/db/schema';
import { eq, desc, sql, or, isNull } from 'drizzle-orm';
import { Navbar } from '@/components/ui/navbar';
import { AdminStats } from '@/components/admin/admin-stats';
import { PlayersList } from '@/components/admin/players-list';
import { UsersList } from '@/components/admin/users-list';
import { BulkImport } from '@/components/admin/bulk-import';
import { DonationsChart } from '@/components/admin/donations-chart';
import { formatCurrency } from '@/lib/utils';
import { ClipboardList, Receipt } from 'lucide-react';
import { DeletedPlayersList } from '@/components/admin/deleted-players-list';

/**
 * Admin dashboard
 * Shows overview of all players and fundraising analytics
 */
export default async function AdminPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login?callbackUrl=/admin');
  }

  // Fetch all active (non-deleted) players
  const allPlayers = await db
    .select()
    .from(players)
    .where(isNull(players.deletedAt))
    .orderBy(desc(players.totalRaised));

  // Fetch all successful donations (includes 'succeeded' and 'completed' statuses)
  const allDonations = await db
    .select()
    .from(donations)
    .where(or(eq(donations.status, 'succeeded'), eq(donations.status, 'completed')))
    .orderBy(desc(donations.createdAt));

  // Fetch all admin users
  const adminUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, 'admin'))
    .orderBy(desc(users.createdAt));

  // Calculate stats
  const totalRaised = allPlayers.reduce(
    (sum, player) => sum + parseFloat(player.totalRaised),
    0
  );
  const totalGoal = allPlayers.reduce(
    (sum, player) => sum + parseFloat(player.goal),
    0
  );
  const totalPlayers = allPlayers.length;
  const totalDonations = allDonations.length;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-lg text-gray-600">
              Manage players and view fundraising analytics
            </p>
          </div>

          {/* Stats */}
          <AdminStats
            totalRaised={totalRaised}
            totalGoal={totalGoal}
            totalPlayers={totalPlayers}
            totalDonations={totalDonations}
          />

          {/* Charts */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Fundraising Analytics</h2>
            <DonationsChart donations={allDonations} players={allPlayers} />
          </div>

          {/* Players List */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Players Management</h2>
            <PlayersList players={allPlayers} />
          </div>

          {/* Deleted Players */}
          <div className="mt-8">
            <DeletedPlayersList />
          </div>

          {/* Bulk Import */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bulk Import</h2>
            <BulkImport />
          </div>

          {/* Admin Users */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Users</h2>
            <UsersList users={adminUsers} currentUserId={session.user.id} />
          </div>

          {/* Financial & Monitoring */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Financial & Monitoring</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Transaction Audit */}
              <div className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Transaction Audit</h3>
                      <p className="text-sm text-gray-600">
                        View all payments, amounts, and player associations
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/admin/transactions"
                    className="btn-primary"
                  >
                    View
                  </Link>
                </div>
              </div>

              {/* Audit Logs */}
              <div className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-pink-light rounded-lg flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-primary-pink" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
                      <p className="text-sm text-gray-600">
                        View user logins and administrative actions
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/admin/audit-logs"
                    className="btn-primary"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
