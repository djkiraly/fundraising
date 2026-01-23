import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { donations, players } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Navbar } from '@/components/ui/navbar';
import { TransactionsTable } from '@/components/admin/transactions-table';
import { ArrowLeft, Receipt } from 'lucide-react';

/**
 * Admin transactions audit page
 * Shows all transactions with filtering and export capabilities
 */
export default async function TransactionsPage() {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/login?callbackUrl=/admin/transactions');
  }

  // Fetch all players for lookup
  const allPlayers = await db
    .select({
      id: players.id,
      name: players.name,
    })
    .from(players);

  const playerMap = new Map(allPlayers.map(p => [p.id, p.name]));

  // Fetch all donations with player info
  const allDonations = await db
    .select()
    .from(donations)
    .orderBy(desc(donations.createdAt));

  // Transform donations to include player name
  const transactions = allDonations.map(donation => ({
    id: donation.id,
    playerId: donation.playerId,
    playerName: playerMap.get(donation.playerId) || 'Unknown Player',
    amount: donation.amount,
    donorName: donation.donorName,
    donorEmail: donation.donorEmail,
    isAnonymous: donation.isAnonymous,
    paymentProvider: donation.paymentProvider,
    stripePaymentIntentId: donation.stripePaymentIntentId,
    squarePaymentId: donation.squarePaymentId,
    status: donation.status,
    createdAt: donation.createdAt,
    completedAt: donation.completedAt,
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
                <Receipt className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Transaction Audit</h1>
                <p className="text-lg text-gray-600">
                  View and audit all payment transactions
                </p>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <TransactionsTable transactions={transactions} />
        </div>
      </main>
    </>
  );
}
