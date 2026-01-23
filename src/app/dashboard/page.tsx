import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { players, squares, donations } from '@/db/schema';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { Navbar } from '@/components/ui/navbar';
import { HeartGrid } from '@/components/ui/heart-grid';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ShareLink } from '@/components/ui/share-link';
import { DonationFeed } from '@/components/ui/donation-feed';
import { formatCurrency, getPlayerUrl } from '@/lib/utils';

/**
 * Player dashboard
 * Shows player's own fundraising progress and donors
 */
export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/login?callbackUrl=/dashboard');
  }

  // Redirect admins to the admin dashboard
  if (session.user.role === 'admin') {
    redirect('/admin');
  }

  // Fetch player profile (exclude soft-deleted players)
  const [player] = await db
    .select()
    .from(players)
    .where(and(eq(players.userId, session.user.id), isNull(players.deletedAt)))
    .limit(1);

  if (!player) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
          <div className="card max-w-md text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No Player Profile Found</h1>
            <p className="text-gray-600">
              Your player profile hasn't been set up yet. Please contact an administrator.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Fetch player's squares and donations
  const [playerSquares, playerDonations] = await Promise.all([
    db.select().from(squares).where(eq(squares.playerId, player.id)),
    db
      .select()
      .from(donations)
      .where(eq(donations.playerId, player.id))
      .orderBy(desc(donations.createdAt)),
  ]);

  const playerUrl = getPlayerUrl(player.slug);
  const totalSquares = playerSquares.length;
  const purchasedSquares = playerSquares.filter((s) => s.isPurchased).length;
  const successfulDonations = playerDonations.filter((d) => d.status === 'succeeded' || d.status === 'completed');

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome back, {player.name}!
            </h1>
            <p className="text-lg text-gray-600">
              Track your fundraising progress and see who's supporting you
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="text-sm text-gray-600 mb-1">Total Raised</div>
              <div className="text-3xl font-bold text-primary-pink">
                {formatCurrency(player.totalRaised)}
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-600 mb-1">Goal Progress</div>
              <div className="text-3xl font-bold text-green-600">
                {((parseFloat(player.totalRaised) / parseFloat(player.goal)) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-600 mb-1">Squares Sold</div>
              <div className="text-3xl font-bold text-blue-600">
                {purchasedSquares} / {totalSquares}
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-600 mb-1">Total Donors</div>
              <div className="text-3xl font-bold text-purple-600">
                {successfulDonations.length}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="card mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Fundraising Progress</h2>
            <ProgressBar current={player.totalRaised} goal={player.goal} />
          </div>

          {/* Share Section */}
          <div className="card mb-8 bg-primary-pink-light/20 border-primary-pink">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Share Your Fundraiser</h2>
            <p className="text-gray-700 mb-4">
              Share this link with friends and family to help reach your goal!
            </p>
            <ShareLink url={playerUrl} playerSlug={player.slug} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Heart Grid */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Heart Grid</h2>
              <HeartGrid squares={playerSquares} readonly />
            </div>

            {/* Recent Donations */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Supporter Activity</h2>
              <div className="card max-h-[600px] overflow-y-auto p-2">
                <DonationFeed donations={successfulDonations} squares={playerSquares} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
