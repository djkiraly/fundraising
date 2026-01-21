'use client';

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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Donation, Player } from '@/db/schema';
import { formatCurrency } from '@/lib/utils';

interface DonationsChartProps {
  donations: Donation[];
  players: Player[];
}

const COLORS = ['#FF69B4', '#FFB6D9', '#FF1493', '#C71585', '#DB7093', '#FF94C0'];

/**
 * Donations analytics charts
 */
export function DonationsChart({ donations, players }: DonationsChartProps) {
  // Prepare data for player performance chart
  const playerData = players.map((player) => ({
    name: player.name.split(' ')[0], // First name only for chart
    raised: parseFloat(player.totalRaised),
    goal: parseFloat(player.goal),
  }));

  // Prepare data for daily donations
  const donationsByDate = donations.reduce((acc, donation) => {
    const date = new Date(donation.createdAt).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += parseFloat(donation.amount);
    return acc;
  }, {} as Record<string, number>);

  const dailyData = Object.entries(donationsByDate)
    .map(([date, amount]) => ({
      date,
      amount,
    }))
    .slice(-7); // Last 7 days

  // Prepare data for player distribution pie chart
  const pieData = players.map((player) => ({
    name: player.name,
    value: parseFloat(player.totalRaised),
  }));

  return (
    <div className="space-y-8">
      {/* Player Performance Bar Chart */}
      <div className="card">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Player Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={playerData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="raised" fill="#FF69B4" name="Raised" />
            <Bar dataKey="goal" fill="#FFB6D9" name="Goal" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Donations Line Chart */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Daily Donations (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#FF69B4"
                strokeWidth={2}
                name="Amount"
                dot={{ fill: '#FF69B4', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Player Distribution Pie Chart */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Fundraising Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
