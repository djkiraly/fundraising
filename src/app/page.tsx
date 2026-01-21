import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/db';
import { players } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Navbar } from '@/components/ui/navbar';
import { formatCurrency, calculateProgress } from '@/lib/utils';
import { Heart } from 'lucide-react';
import { getBrandingConfig } from '@/lib/config';

/**
 * Home page - displays all active players
 */
export default async function HomePage() {
  // Fetch all active players and branding config in parallel
  const [allPlayers, branding] = await Promise.all([
    db
      .select()
      .from(players)
      .where(eq(players.isActive, true))
      .orderBy(desc(players.totalRaised)),
    getBrandingConfig(),
  ]);

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

        {/* Players Grid */}
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Our Players
            </h2>

            {allPlayers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">
                  No active fundraising campaigns at the moment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {allPlayers.map((player) => {
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
