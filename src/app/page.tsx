import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/db';
import { players } from '@/db/schema';
import { desc, eq, and, isNull } from 'drizzle-orm';
import { Navbar } from '@/components/ui/navbar';
import { formatCurrency } from '@/lib/utils';
import { Heart, Trophy, Medal } from 'lucide-react';
import { getBrandingConfig } from '@/lib/config';
import { PlayerSearch } from '@/components/ui/player-search';
import { isMobileDevice } from '@/lib/device-detection';
import { MobileHome } from '@/components/mobile/mobile-home';

/**
 * Home page - displays all active players
 * Renders mobile-optimized version for mobile browsers
 */
export default async function HomePage() {
  // Fetch all active (non-deleted) players, branding config, and check device in parallel
  const [allPlayers, branding, isMobile] = await Promise.all([
    db
      .select()
      .from(players)
      .where(and(eq(players.isActive, true), isNull(players.deletedAt)))
      .orderBy(desc(players.totalRaised)),
    getBrandingConfig(),
    isMobileDevice(),
  ]);

  // Render mobile version for mobile devices
  if (isMobile) {
    return (
      <>
        <Navbar />
        <MobileHome players={allPlayers} branding={branding} />
      </>
    );
  }

  // Desktop version
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        {/* Hero Section */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Support Our Volleyball Players
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Help our athletes reach their fundraising goals by purchasing squares on their
              heart-shaped grids. Every square makes a difference!
            </p>
            <div className="flex items-center justify-center gap-2 text-primary-pink">
              <Heart className="w-8 h-8 fill-current animate-pulse" />
              <span className="text-2xl font-semibold">Show Your Support</span>
              <Heart className="w-8 h-8 fill-current animate-pulse" />
            </div>
          </div>
        </section>

        {/* Welcome Message */}
        {branding.welcomeMessage && (
          <section className="py-8 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-md p-6 md:p-8 border border-gray-100">
                <div
                  className="prose prose-lg max-w-none text-gray-700 [&>*]:my-2"
                  dangerouslySetInnerHTML={{ __html: branding.welcomeMessage }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Leaderboard */}
        {(() => {
          const topFundraisers = allPlayers
            .filter(p => parseFloat(p.totalRaised) > 1)
            .slice(0, 10);

          if (topFundraisers.length === 0) return null;

          const maxRaised = Math.max(...topFundraisers.map(p => parseFloat(p.totalRaised)));

          return (
            <section className="py-8 px-4">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <Trophy className="w-8 h-8 text-white" />
                      <h2 className="text-2xl font-bold text-white">Top Fundraisers</h2>
                      <Trophy className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Leaderboard List */}
                  <div className="divide-y divide-gray-100">
                    {topFundraisers.map((player, index) => {
                      const raised = parseFloat(player.totalRaised);
                      const barWidth = maxRaised > 0 ? (raised / maxRaised) * 100 : 0;
                      const isTop3 = index < 3;

                      return (
                        <Link
                          key={player.id}
                          href={`/player/${player.slug}`}
                          className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                        >
                          {/* Rank */}
                          <div className="flex-shrink-0 w-10">
                            {index === 0 ? (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center shadow-md">
                                <Medal className="w-5 h-5 text-yellow-900" />
                              </div>
                            ) : index === 1 ? (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center shadow-md">
                                <Medal className="w-5 h-5 text-gray-700" />
                              </div>
                            ) : index === 2 ? (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center shadow-md">
                                <Medal className="w-5 h-5 text-orange-900" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-lg font-bold text-gray-500">{index + 1}</span>
                              </div>
                            )}
                          </div>

                          {/* Player Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              {/* Avatar */}
                              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                                {player.photoUrl ? (
                                  <Image
                                    src={player.photoUrl}
                                    alt={player.name}
                                    fill
                                    sizes="32px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-pink-light to-primary-pink">
                                    <span className="text-sm text-white font-bold">
                                      {player.name[0]}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <span className={`font-semibold truncate ${isTop3 ? 'text-gray-900' : 'text-gray-700'}`}>
                                {player.name}
                              </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  index === 0
                                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                    : index === 1
                                    ? 'bg-gradient-to-r from-gray-300 to-gray-400'
                                    : index === 2
                                    ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                                    : 'bg-gradient-to-r from-primary-pink-light to-primary-pink'
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="flex-shrink-0 text-right">
                            <span className={`font-bold ${
                              isTop3 ? 'text-lg text-gray-900' : 'text-gray-700'
                            }`}>
                              {formatCurrency(player.totalRaised)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Players Grid with Search */}
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Our Players
            </h2>

            <PlayerSearch players={allPlayers} />
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} {branding.siteTitle}. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
