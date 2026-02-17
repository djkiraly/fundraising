import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { donations, players } from '@/db/schema';
import { desc, eq, or } from 'drizzle-orm';
import { Navbar } from '@/components/ui/navbar';
import { DonorsReport } from '@/components/admin/donors-report';
import { ArrowLeft, FileText } from 'lucide-react';

/**
 * Admin reports page
 * Donor report: all donors, amounts, attributed player, and transaction date
 */
export default async function ReportsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login?callbackUrl=/admin/reports');
  }

  // Fetch all players for the filter dropdown (include deleted so historical
  // donations still resolve to a name)
  const allPlayers = await db
    .select({ id: players.id, name: players.name })
    .from(players);

  const playerMap = new Map(allPlayers.map(p => [p.id, p.name]));

  // Fetch all successful donations ordered by most recent first
  const allDonations = await db
    .select({
      id: donations.id,
      playerId: donations.playerId,
      donorName: donations.donorName,
      donorEmail: donations.donorEmail,
      isAnonymous: donations.isAnonymous,
      amount: donations.amount,
      createdAt: donations.createdAt,
    })
    .from(donations)
    .where(or(eq(donations.status, 'succeeded'), eq(donations.status, 'completed')))
    .orderBy(desc(donations.createdAt));

  const donorRows = allDonations.map(d => ({
    id: d.id,
    playerId: d.playerId,
    playerName: playerMap.get(d.playerId) ?? 'Unknown Player',
    donorName: d.donorName,
    donorEmail: d.donorEmail,
    isAnonymous: d.isAnonymous,
    amount: d.amount,
    createdAt: d.createdAt,
  }));

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-pink to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Reports</h1>
                <p className="text-lg text-gray-600">
                  Donor report — all donations with player attribution and date
                </p>
              </div>
            </div>
          </div>

          {/* Donors Report */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Donor Report</h2>
          <DonorsReport donors={donorRows} players={allPlayers} />
        </div>
      </main>
    </>
  );
}
