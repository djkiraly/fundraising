'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import { Donation, Player } from '@/db/schema';
import { formatCurrency } from '@/lib/utils';
import { ChevronDown, ChevronUp, Trophy, TrendingUp, Users } from 'lucide-react';

interface DonationsChartProps {
  donations: Donation[];
  players: Player[];
}

const COLORS = [
  '#FF69B4', '#FF1493', '#C71585', '#DB7093', '#E91E63',
  '#F06292', '#EC407A', '#AD1457', '#880E4F', '#D81B60',
];

/**
 * Donations analytics charts - optimized for 10-60+ players
 */
export function DonationsChart({ donations, players }: DonationsChartProps) {
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [sortBy, setSortBy] = useState<'raised' | 'goal' | 'progress'>('raised');

  // Sort and prepare player data
  const sortedPlayerData = useMemo(() => {
    const data = players.map((player) => {
      const raised = parseFloat(player.totalRaised);
      const goal = parseFloat(player.goal);
      return {
        id: player.id,
        name: player.name,
        firstName: player.name.split(' ')[0],
        raised,
        goal,
        progress: goal > 0 ? (raised / goal) * 100 : 0,
      };
    });

    return data.sort((a, b) => {
      if (sortBy === 'raised') return b.raised - a.raised;
      if (sortBy === 'goal') return b.goal - a.goal;
      return b.progress - a.progress;
    });
  }, [players, sortBy]);

  // Display data (top 15 or all)
  const displayCount = showAllPlayers ? sortedPlayerData.length : Math.min(15, sortedPlayerData.length);
  const displayedPlayers = sortedPlayerData.slice(0, displayCount);
  const hasMorePlayers = sortedPlayerData.length > 15;

  // Calculate chart height dynamically (40px per player, min 300px)
  const barChartHeight = Math.max(300, displayedPlayers.length * 40);

  // Prepare data for daily donations (last 14 days)
  const dailyData = useMemo(() => {
    const donationsByDate = donations.reduce((acc, donation) => {
      const date = new Date(donation.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += parseFloat(donation.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(donationsByDate)
      .map(([date, amount]) => ({ date, amount }))
      .slice(-14);
  }, [donations]);

  // Top performers for leaderboard
  const topPerformers = sortedPlayerData.slice(0, 5);
  const totalRaised = sortedPlayerData.reduce((sum, p) => sum + p.raised, 0);

  // Summary statistics
  const stats = useMemo(() => {
    if (sortedPlayerData.length === 0) return null;

    const raised = sortedPlayerData.map(p => p.raised);
    const avgRaised = raised.reduce((a, b) => a + b, 0) / raised.length;
    const maxRaised = Math.max(...raised);
    const minRaised = Math.min(...raised);
    const goalsMet = sortedPlayerData.filter(p => p.progress >= 100).length;

    return { avgRaised, maxRaised, minRaised, goalsMet };
  }, [sortedPlayerData]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-pink-50 to-white p-4 rounded-lg border border-pink-100">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Top Performer
            </div>
            <div className="font-bold text-gray-900">{formatCurrency(stats.maxRaised)}</div>
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-white p-4 rounded-lg border border-pink-100">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Avg per Player
            </div>
            <div className="font-bold text-gray-900">{formatCurrency(stats.avgRaised)}</div>
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-white p-4 rounded-lg border border-pink-100">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              Goals Met
            </div>
            <div className="font-bold text-gray-900">{stats.goalsMet} of {sortedPlayerData.length}</div>
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-white p-4 rounded-lg border border-pink-100">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Range
            </div>
            <div className="font-bold text-gray-900 text-sm">
              {formatCurrency(stats.minRaised)} - {formatCurrency(stats.maxRaised)}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Player Performance - Horizontal Bar Chart */}
        <div className="xl:col-span-2 card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              Player Performance
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({displayedPlayers.length} of {sortedPlayerData.length})
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'raised' | 'goal' | 'progress')}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-pink"
              >
                <option value="raised">Amount Raised</option>
                <option value="progress">% of Goal</option>
                <option value="goal">Goal Amount</option>
              </select>
            </div>
          </div>

          <div style={{ height: barChartHeight, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayedPlayers}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                <YAxis
                  type="category"
                  dataKey="firstName"
                  width={75}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'raised' ? 'Raised' : 'Goal']}
                  labelFormatter={(label) => {
                    const player = displayedPlayers.find(p => p.firstName === label);
                    return player ? player.name : label;
                  }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="raised" fill="#FF69B4" name="Raised" radius={[0, 4, 4, 0]} />
                <Bar dataKey="goal" fill="#FFB6D9" name="Goal" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {hasMorePlayers && (
            <button
              onClick={() => setShowAllPlayers(!showAllPlayers)}
              className="mt-4 w-full py-2 text-sm text-primary-pink hover:bg-pink-50 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              {showAllPlayers ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Top 15 Only
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show All {sortedPlayerData.length} Players
                </>
              )}
            </button>
          )}
        </div>

        {/* Top 5 Leaderboard */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Top Performers
          </h3>
          <div className="space-y-3">
            {topPerformers.map((player, index) => {
              const percentage = totalRaised > 0 ? (player.raised / totalRaised) * 100 : 0;
              return (
                <div key={player.id} className="relative">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-pink-50 text-pink-700'}
                    `}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900 flex-1 truncate" title={player.name}>
                      {player.name}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(player.raised)}
                    </span>
                  </div>
                  <div className="ml-9">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{percentage.toFixed(1)}% of total</span>
                      <span>{player.progress.toFixed(0)}% of goal</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {sortedPlayerData.length > 5 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{sortedPlayerData.length - 5}</span> more players
                contributed <span className="font-medium">
                  {formatCurrency(sortedPlayerData.slice(5).reduce((sum, p) => sum + p.raised, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Daily Donations Line Chart */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Daily Donations
          <span className="text-sm font-normal text-gray-500 ml-2">(Last 14 Days)</span>
        </h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                interval={dailyData.length > 10 ? 1 : 0}
                angle={dailyData.length > 10 ? -45 : 0}
                textAnchor={dailyData.length > 10 ? 'end' : 'middle'}
                height={dailyData.length > 10 ? 60 : 30}
              />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Donations']}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#FF69B4"
                strokeWidth={2}
                dot={{ fill: '#FF69B4', r: 4 }}
                activeDot={{ r: 6, fill: '#FF1493' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-gray-500">
            No donation data available
          </div>
        )}
      </div>
    </div>
  );
}
