import { notFound } from 'next/navigation';
import Image from 'next/image';
import { db } from '@/db';
import { players, squares, donations } from '@/db/schema';
import { eq, or, desc, and, isNull } from 'drizzle-orm';
import { Navbar } from '@/components/ui/navbar';
import { HeartGrid } from '@/components/ui/heart-grid';
import { ProgressBar } from '@/components/ui/progress-bar';
import { DonationModal } from '@/components/donation-modal';
import { DonationFeed } from '@/components/ui/donation-feed';
import { Heart } from 'lucide-react';
import { ShareButton } from '@/components/ui/share-button';
import { formatCurrency } from '@/lib/utils';
import { PlayerPageTracker } from '@/components/player-page-tracker';

// UUID regex pattern for backwards compatibility
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Player public page
 * Displays player's fundraising progress and heart grid
 * Supports both slug-based URLs (e.g., /player/emma-johnson) and
 * legacy UUID URLs (e.g., /player/123e4567-e89b-...)
 */
export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch player data - try slug first, then UUID for backwards compatibility
  // Exclude soft-deleted players
  const isUuid = UUID_REGEX.test(id);
  const [player] = await db
    .select()
    .from(players)
    .where(
      and(
        isUuid ? or(eq(players.slug, id), eq(players.id, id)) : eq(players.slug, id),
        isNull(players.deletedAt)
      )
    )
    .limit(1);

  if (!player) {
    notFound();
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

  // Calculate stats
  const totalSquares = playerSquares.length;
  const purchasedSquares = playerSquares.filter((s) => s.isPurchased).length;
  const availableSquares = totalSquares - purchasedSquares;
  const successfulDonations = playerDonations.filter((d) => d.status === 'succeeded' || d.status === 'completed');

  return (
    <>
      <PlayerPageTracker playerId={player.id} path={`/player/${player.slug}`} />
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Player Header */}
          <div className="card mb-8">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              {/* Player Photo */}
              <div className="relative w-48 h-48 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {player.photoUrl ? (
                  <Image
                    src={player.photoUrl}
                    alt={player.name}
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-pink-light to-primary-pink">
                    <span className="text-6xl text-white font-bold">
                      {player.name[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* Player Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {player.name}
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                  Help me reach my fundraising goal!
                </p>

                {/* Progress Bar */}
                <ProgressBar
                  current={player.totalRaised}
                  goal={player.goal}
                  className="mb-6"
                />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-pink">
                      {formatCurrency(player.totalRaised)}
                    </div>
                    <div className="text-sm text-gray-600">Raised</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {purchasedSquares}
                    </div>
                    <div className="text-sm text-gray-600">Squares Purchased</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {availableSquares}
                    </div>
                    <div className="text-sm text-gray-600">Squares Available</div>
                  </div>
                </div>

                {/* Share Button */}
                <ShareButton playerName={player.name} />
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="card mb-8 bg-primary-pink-light/20 border-primary-pink">
            <div className="flex items-start gap-4">
              <Heart className="w-6 h-6 text-primary-pink flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  How to Support
                </h2>
                <p className="text-gray-700 mb-2">
                  Click on any available square in the heart below to make your donation.
                  Each square has a random value between $5 and $25.
                </p>
                <p className="text-gray-700">
                  You can choose to donate anonymously or have your name displayed on the square!
                </p>
              </div>
            </div>
          </div>

          {/* Heart Grid and Supporter Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Heart Grid */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Support Heart</h2>
              <HeartGrid squares={playerSquares} playerId={player.id} />
            </div>

            {/* Supporter Activity */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Supporters</h2>
              <div className="card max-h-[600px] overflow-y-auto p-2">
                <DonationFeed donations={successfulDonations} squares={playerSquares} showPaymentMethod={false} />
              </div>
            </div>
          </div>

          {/* Donation Modal */}
          <DonationModal playerId={player.id} />
        </div>
      </main>
    </>
  );
}
