import Link from 'next/link';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import { Heart, Trophy, ChevronRight } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  goal: string;
  totalRaised: string;
  isActive: boolean;
}

interface MobileHomeProps {
  players: Player[];
  branding: {
    siteTitle: string;
    welcomeMessage: string | null;
  };
}

/**
 * Mobile-optimized home page layout
 * Streamlined for faster loading and better touch interactions
 */
export function MobileHome({ players, branding }: MobileHomeProps) {
  const topFundraisers = players
    .filter(p => parseFloat(p.totalRaised) > 1)
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white pb-6">
      {/* Compact Hero */}
      <section className="py-6 px-4 text-center">
        <div className="flex items-center justify-center gap-2 text-primary-pink mb-2">
          <Heart className="w-6 h-6 fill-current" />
          <Heart className="w-8 h-8 fill-current animate-pulse" />
          <Heart className="w-6 h-6 fill-current" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Support Our Players
        </h1>
        <p className="text-sm text-gray-600">
          Tap a player to donate!
        </p>
      </section>

      {/* Welcome Message - Compact */}
      {branding.welcomeMessage && (
        <section className="px-4 mb-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div
              className="prose prose-sm max-w-none text-gray-700 [&>*]:my-1 line-clamp-3"
              dangerouslySetInnerHTML={{ __html: branding.welcomeMessage }}
            />
          </div>
        </section>
      )}

      {/* Top Fundraisers - Compact */}
      {topFundraisers.length > 0 && (
        <section className="px-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-white" />
                <span className="text-sm font-bold text-white">Top Fundraisers</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {topFundraisers.map((player, index) => (
                <Link
                  key={player.id}
                  href={`/player/${player.slug}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-gray-50"
                >
                  <span className={`w-6 text-center font-bold ${
                    index === 0 ? 'text-yellow-500' :
                    index === 1 ? 'text-gray-400' :
                    index === 2 ? 'text-orange-400' : 'text-gray-400'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {player.photoUrl ? (
                      <Image
                        src={player.photoUrl}
                        alt={player.name}
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-pink-light to-primary-pink">
                        <span className="text-xs text-white font-bold">{player.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <span className="flex-1 font-medium text-gray-900 truncate text-sm">
                    {player.name}
                  </span>
                  <span className="font-bold text-primary-pink text-sm">
                    {formatCurrency(player.totalRaised)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Players List - Mobile Optimized */}
      <section className="px-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">All Players</h2>
        <div className="space-y-2">
          {players.map((player) => {
            const raised = parseFloat(player.totalRaised);
            const goal = parseFloat(player.goal);
            const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;

            return (
              <Link
                key={player.id}
                href={`/player/${player.slug}`}
                className="flex items-center gap-3 bg-white rounded-lg shadow-sm p-3 active:bg-gray-50 border border-gray-100"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  {player.photoUrl ? (
                    <Image
                      src={player.photoUrl}
                      alt={player.name}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-pink-light to-primary-pink">
                      <span className="text-lg text-white font-bold">{player.name[0]}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{player.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-pink-light to-primary-pink rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatCurrency(player.totalRaised)} of {formatCurrency(player.goal)}
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 py-4 px-4 text-center text-gray-500 text-xs">
        <p>&copy; {new Date().getFullYear()} {branding.siteTitle}</p>
      </footer>
    </main>
  );
}
