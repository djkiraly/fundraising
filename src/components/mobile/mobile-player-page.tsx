'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { Heart, Share2, ChevronLeft, Gift, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { PlayerMessage } from '@/components/ui/player-message';
import { MobileHeartGrid } from '@/components/mobile/mobile-heart-grid';

interface Square {
  id: string;
  playerId: string;
  positionX: number;
  positionY: number;
  value: string;
  isPurchased: boolean;
  donorName: string | null;
  isAnonymous: boolean;
}

interface Donation {
  id: string;
  amount: string;
  donorName: string | null;
  isAnonymous: boolean;
  createdAt: Date;
  squareId: string | null;
  status: string;
}

interface Player {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  message: string | null;
  goal: string;
  totalRaised: string;
}

interface MobilePlayerPageProps {
  player: Player;
  squares: Square[];
  donations: Donation[];
  purchasedSquares: number;
  availableSquares: number;
}

/**
 * Mobile-optimized player page
 * Streamlined for touch interactions and faster loading
 */
export function MobilePlayerPage({
  player,
  squares,
  donations,
  purchasedSquares,
  availableSquares,
}: MobilePlayerPageProps) {
  const [showDonors, setShowDonors] = useState(false);

  const raised = parseFloat(player.totalRaised);
  const goal = parseFloat(player.goal);
  const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;

  const successfulDonations = donations.filter(d => d.status === 'succeeded' || d.status === 'completed');

  const handleShare = async () => {
    const shareData = {
      title: `Support ${player.name}`,
      text: `Help ${player.name} reach their fundraising goal!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-600">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-primary-pink px-3 py-1.5 rounded-full bg-pink-50"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-sm font-medium">Share</span>
          </button>
        </div>
      </header>

      {/* Player Info Card */}
      <section className="px-4 py-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              {player.photoUrl ? (
                <Image
                  src={player.photoUrl}
                  alt={player.name}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-pink-light to-primary-pink">
                  <span className="text-2xl text-white font-bold">{player.name[0]}</span>
                </div>
              )}
            </div>

            {/* Name & Progress */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{player.name}</h1>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-primary-pink">
                  {formatCurrency(player.totalRaised)}
                </span>
                <span className="text-sm text-gray-500">
                  of {formatCurrency(player.goal)}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-pink-light to-primary-pink rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{progress.toFixed(0)}% funded</span>
              <span>{availableSquares} squares left</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-pink-50 rounded-lg py-2">
              <div className="text-lg font-bold text-primary-pink">{formatCurrency(player.totalRaised)}</div>
              <div className="text-xs text-gray-500">Raised</div>
            </div>
            <div className="bg-green-50 rounded-lg py-2">
              <div className="text-lg font-bold text-green-600">{purchasedSquares}</div>
              <div className="text-xs text-gray-500">Sold</div>
            </div>
            <div className="bg-blue-50 rounded-lg py-2">
              <div className="text-lg font-bold text-blue-600">{availableSquares}</div>
              <div className="text-xs text-gray-500">Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Player Message */}
      {player.message && player.message !== '<p></p>' && (
        <section className="px-4 mb-4">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-primary-pink" />
              <h2 className="font-bold text-gray-900">Message from {player.name}</h2>
            </div>
            <PlayerMessage message={player.message} className="text-sm" />
          </div>
        </section>
      )}

      {/* Heart Grid Section */}
      <section className="px-4 mb-4">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Heart className="w-5 h-5 text-primary-pink fill-current" />
          <h2 className="font-bold text-gray-900">Support Heart</h2>
        </div>

        {availableSquares > 0 ? (
          <MobileHeartGrid squares={squares} playerId={player.id} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
            <Gift className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500">All squares have been purchased!</p>
            <p className="text-sm text-gray-400">Thank you for your support!</p>
          </div>
        )}
      </section>

      {/* Recent Supporters */}
      <section className="px-4">
        <button
          onClick={() => setShowDonors(!showDonors)}
          className="w-full bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-600" />
              <h2 className="font-bold text-gray-900">Recent Supporters</h2>
              <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {successfulDonations.length}
              </span>
            </div>
            <ChevronLeft className={`w-5 h-5 text-gray-400 transition-transform ${showDonors ? '-rotate-90' : 'rotate-180'}`} />
          </div>

          {showDonors && successfulDonations.length > 0 && (
            <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
              {successfulDonations.slice(0, 10).map((donation) => (
                <div key={donation.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-green-600 fill-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {donation.isAnonymous ? 'Anonymous' : donation.donorName || 'Supporter'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(donation.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="font-bold text-green-600 text-sm">
                    {formatCurrency(donation.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showDonors && successfulDonations.length === 0 && (
            <div className="mt-4 text-center py-4 text-gray-500 text-sm">
              Be the first to support {player.name}!
            </div>
          )}
        </button>
      </section>
    </main>
  );
}
