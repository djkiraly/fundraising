'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X } from 'lucide-react';
import { formatCurrency, calculateProgress } from '@/lib/utils';

interface Player {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  goal: string;
  totalRaised: string;
}

interface PlayerSearchProps {
  players: Player[];
}

/**
 * Player search and grid component
 * Provides instant client-side filtering of players
 */
export function PlayerSearch({ players }: PlayerSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) {
      return players;
    }

    const query = searchQuery.toLowerCase().trim();
    return players.filter(player =>
      player.name.toLowerCase().includes(query)
    );
  }, [players, searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div>
      {/* Search Bar */}
      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a player..."
            className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-full bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-pink focus:border-transparent text-gray-900 placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Results Count */}
        {searchQuery && (
          <p className="text-center text-sm text-gray-500 mt-2">
            {filteredPlayers.length === 0 ? (
              'No players found'
            ) : filteredPlayers.length === 1 ? (
              '1 player found'
            ) : (
              `${filteredPlayers.length} players found`
            )}
          </p>
        )}
      </div>

      {/* Players Grid */}
      {filteredPlayers.length === 0 ? (
        <div className="text-center py-12">
          {searchQuery ? (
            <div>
              <p className="text-gray-600 text-lg mb-4">
                No players match &quot;{searchQuery}&quot;
              </p>
              <button
                onClick={clearSearch}
                className="text-primary-pink hover:text-primary-pink-dark font-medium"
              >
                Clear search
              </button>
            </div>
          ) : (
            <p className="text-gray-600 text-lg">
              No active fundraising campaigns at the moment.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPlayers.map((player) => {
            const progress = calculateProgress(player.totalRaised, player.goal);

            return (
              <Link
                key={player.id}
                href={`/player/${player.slug}`}
                className="card hover:shadow-xl transition-all duration-300 group"
              >
                {/* Player Photo */}
                <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden bg-gray-100">
                  {player.photoUrl ? (
                    <Image
                      src={player.photoUrl}
                      alt={player.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
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
                <h3 className="text-xl font-bold text-gray-900 mb-2">{player.name}</h3>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      {formatCurrency(player.totalRaised)}
                    </span>
                    <span className="text-gray-600">
                      {formatCurrency(player.goal)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-pink-light to-primary-pink transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-center mt-2">
                    <span className="text-sm font-semibold text-primary-pink">
                      {progress.toFixed(0)}% Complete
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <button className="w-full btn-primary group-hover:bg-primary-pink-dark">
                  View Fundraiser
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
