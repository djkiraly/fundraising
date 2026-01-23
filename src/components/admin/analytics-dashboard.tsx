'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  MousePointerClick,
  TrendingUp,
  DollarSign,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface AnalyticsData {
  period: string;
  overview: {
    totalPageViews: number;
    uniqueVisitors: number;
    squareClicks: number;
    conversionRate: number;
  };
  donations: {
    successful: { count: number; total: number };
    failed: number;
    pending: number;
    events: Array<{ eventType: string; count: number; totalValue: number }>;
  };
  charts: {
    pageViewsByDay: Array<{ date: string; views: number; uniqueVisitors: number }>;
    donationsByDay: Array<{ date: string; count: number; total: number }>;
  };
  topPages: Array<{ path: string; views: number; uniqueVisitors: number }>;
  playerPageViews: Array<{ playerId: string; playerName: string; views: number; uniqueVisitors: number }>;
  demographics: {
    devices: Array<{ deviceType: string; count: number }>;
    browsers: Array<{ browser: string; count: number }>;
    operatingSystems: Array<{ os: string; count: number }>;
    countries: Array<{ country: string; count: number }>;
    referrers: Array<{ referrer: string; count: number }>;
  };
}

const PERIODS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function DeviceIcon({ type }: { type: string }) {
  switch (type?.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="w-4 h-4" />;
    case 'tablet':
      return <Tablet className="w-4 h-4" />;
    default:
      return <Monitor className="w-4 h-4" />;
  }
}

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/analytics?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-pink" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const maxPageViews = Math.max(...data.charts.pageViewsByDay.map(d => d.views), 1);
  const maxDonations = Math.max(...data.charts.donationsByDay.map(d => d.total), 1);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-primary-pink text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchAnalytics}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Page Views</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(data.overview.totalPageViews)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unique Visitors</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(data.overview.uniqueVisitors)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Square Clicks</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(data.overview.squareClicks)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <MousePointerClick className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.overview.conversionRate}%
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Donation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-700">Successful Donations</p>
              <p className="text-xl font-bold text-green-800">
                {data.donations.successful.count} ({formatCurrency(data.donations.successful.total)})
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-700">Failed Donations</p>
              <p className="text-xl font-bold text-red-800">{data.donations.failed}</p>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-700">Pending Donations</p>
              <p className="text-xl font-bold text-yellow-800">{data.donations.pending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Views Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Page Views Over Time</h3>
          {data.charts.pageViewsByDay.length > 0 ? (
            <div className="space-y-2">
              {data.charts.pageViewsByDay.slice(-14).map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded"
                      style={{ width: `${(day.views / maxPageViews) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-12 text-right">
                    {day.views}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Donations Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Donations Over Time</h3>
          {data.charts.donationsByDay.length > 0 ? (
            <div className="space-y-2">
              {data.charts.donationsByDay.slice(-14).map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded"
                      style={{ width: `${(day.total / maxDonations) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-16 text-right">
                    {formatCurrency(day.total)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No donations yet</p>
          )}
        </div>
      </div>

      {/* Top Pages and Player Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
          {data.topPages.length > 0 ? (
            <div className="space-y-3">
              {data.topPages.map((page, index) => (
                <div key={page.path} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-6">{index + 1}</span>
                    <span className="text-sm text-gray-900 truncate max-w-[200px]" title={page.path}>
                      {page.path}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{formatNumber(page.views)}</span>
                    <span className="text-xs text-gray-500 ml-2">({page.uniqueVisitors} unique)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Player Page Views */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Player Pages</h3>
          {data.playerPageViews.length > 0 ? (
            <div className="space-y-3">
              {data.playerPageViews.map((player, index) => (
                <div key={player.playerId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-6">{index + 1}</span>
                    <span className="text-sm text-gray-900">{player.playerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{formatNumber(player.views)}</span>
                    <span className="text-xs text-gray-500 ml-2">({player.uniqueVisitors} unique)</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No player page views yet</p>
          )}
        </div>
      </div>

      {/* Demographics */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Visitor Demographics</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {/* Devices */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Devices
            </h4>
            {data.demographics.devices.length > 0 ? (
              <div className="space-y-2">
                {data.demographics.devices.map((device) => (
                  <div key={device.deviceType} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                      <DeviceIcon type={device.deviceType} />
                      {device.deviceType || 'Unknown'}
                    </span>
                    <span className="font-medium text-gray-900">{formatNumber(device.count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No data</p>
            )}
          </div>

          {/* Browsers */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Browsers
            </h4>
            {data.demographics.browsers.length > 0 ? (
              <div className="space-y-2">
                {data.demographics.browsers.map((browser) => (
                  <div key={browser.browser} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{browser.browser || 'Unknown'}</span>
                    <span className="font-medium text-gray-900">{formatNumber(browser.count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No data</p>
            )}
          </div>

          {/* Operating Systems */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Operating Systems</h4>
            {data.demographics.operatingSystems.length > 0 ? (
              <div className="space-y-2">
                {data.demographics.operatingSystems.map((os) => (
                  <div key={os.os} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{os.os || 'Unknown'}</span>
                    <span className="font-medium text-gray-900">{formatNumber(os.count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No data</p>
            )}
          </div>

          {/* Countries */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Countries</h4>
            {data.demographics.countries.length > 0 ? (
              <div className="space-y-2">
                {data.demographics.countries.map((country) => (
                  <div key={country.country} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{country.country || 'Unknown'}</span>
                    <span className="font-medium text-gray-900">{formatNumber(country.count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No data</p>
            )}
          </div>

          {/* Referrers */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Traffic Sources</h4>
            {data.demographics.referrers.length > 0 ? (
              <div className="space-y-2">
                {data.demographics.referrers.map((referrer) => (
                  <div key={referrer.referrer} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{referrer.referrer}</span>
                    <span className="font-medium text-gray-900">{formatNumber(referrer.count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
