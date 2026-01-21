'use client';

import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Users, DollarSign, Heart } from 'lucide-react';

interface AdminStatsProps {
  totalRaised: number;
  totalGoal: number;
  totalPlayers: number;
  totalDonations: number;
}

/**
 * Admin statistics cards
 */
export function AdminStats({
  totalRaised,
  totalGoal,
  totalPlayers,
  totalDonations,
}: AdminStatsProps) {
  const progressPercentage = totalGoal > 0 ? (totalRaised / totalGoal) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Raised */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Total Raised</div>
          <DollarSign className="w-5 h-5 text-green-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900">
          {formatCurrency(totalRaised)}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          of {formatCurrency(totalGoal)} goal
        </div>
      </div>

      {/* Overall Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Overall Progress</div>
          <TrendingUp className="w-5 h-5 text-primary-pink" />
        </div>
        <div className="text-3xl font-bold text-primary-pink">
          {progressPercentage.toFixed(1)}%
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-pink-light to-primary-pink"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Total Players */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Total Players</div>
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        <div className="text-3xl font-bold text-gray-900">{totalPlayers}</div>
        <div className="text-sm text-gray-600 mt-1">Active fundraisers</div>
      </div>

      {/* Total Donations */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">Total Donations</div>
          <Heart className="w-5 h-5 text-red-600 fill-current" />
        </div>
        <div className="text-3xl font-bold text-gray-900">{totalDonations}</div>
        <div className="text-sm text-gray-600 mt-1">
          Avg: {totalDonations > 0 ? formatCurrency(totalRaised / totalDonations) : '$0'}
        </div>
      </div>
    </div>
  );
}
