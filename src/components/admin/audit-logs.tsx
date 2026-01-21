'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import {
  LogIn,
  LogOut,
  AlertCircle,
  DollarSign,
  UserPlus,
  UserMinus,
  Edit,
  Key,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CreditCard,
  Banknote,
} from 'lucide-react';

interface AuditLog {
  id: string;
  eventType: string;
  userId: string | null;
  playerId: string | null;
  donationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  playerName: string | null;
  donationAmount: string | null;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  login_failed: 'Login Failed',
  donation_created: 'Donation Created',
  donation_completed: 'Donation Completed',
  donation_failed: 'Donation Failed',
  manual_donation: 'Manual Donation',
  player_created: 'Player Created',
  player_updated: 'Player Updated',
  player_deleted: 'Player Deleted',
  password_reset_requested: 'Password Reset Requested',
  password_reset_completed: 'Password Reset Completed',
};

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn className="w-4 h-4" />,
  logout: <LogOut className="w-4 h-4" />,
  login_failed: <AlertCircle className="w-4 h-4" />,
  donation_created: <CreditCard className="w-4 h-4" />,
  donation_completed: <DollarSign className="w-4 h-4" />,
  donation_failed: <AlertCircle className="w-4 h-4" />,
  manual_donation: <Banknote className="w-4 h-4" />,
  player_created: <UserPlus className="w-4 h-4" />,
  player_updated: <Edit className="w-4 h-4" />,
  player_deleted: <UserMinus className="w-4 h-4" />,
  password_reset_requested: <Key className="w-4 h-4" />,
  password_reset_completed: <Key className="w-4 h-4" />,
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-800',
  logout: 'bg-gray-100 text-gray-800',
  login_failed: 'bg-red-100 text-red-800',
  donation_created: 'bg-blue-100 text-blue-800',
  donation_completed: 'bg-green-100 text-green-800',
  donation_failed: 'bg-red-100 text-red-800',
  manual_donation: 'bg-amber-100 text-amber-800',
  player_created: 'bg-purple-100 text-purple-800',
  player_updated: 'bg-blue-100 text-blue-800',
  player_deleted: 'bg-red-100 text-red-800',
  password_reset_requested: 'bg-yellow-100 text-yellow-800',
  password_reset_completed: 'bg-green-100 text-green-800',
};

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async (offset = 0) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('offset', offset.toString());

      if (eventTypeFilter) {
        params.set('eventType', eventTypeFilter);
      }

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data: AuditLogsResponse = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [eventTypeFilter]);

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  const handlePrevPage = () => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit);
    fetchLogs(newOffset);
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      fetchLogs(pagination.offset + pagination.limit);
    }
  };

  const handleRefresh = () => {
    fetchLogs(pagination.offset);
  };

  const getEventDescription = (log: AuditLog): string => {
    const details = log.details || {};

    switch (log.eventType) {
      case 'login':
        return `${log.userName || details.email || 'User'} logged in`;
      case 'logout':
        return `${log.userName || 'User'} logged out`;
      case 'login_failed':
        return `Failed login attempt for ${details.email || 'unknown email'}${details.reason ? ` (${details.reason})` : ''}`;
      case 'donation_completed':
        return `${formatCurrency(log.donationAmount || details.amount as string)} donation completed for ${log.playerName || 'player'}`;
      case 'donation_failed':
        return `Donation failed for ${log.playerName || 'player'}${details.reason ? `: ${details.reason}` : ''}`;
      case 'manual_donation':
        return `${log.userName || 'Admin'} added ${formatCurrency(details.amount as string)} manual donation for ${log.playerName || 'player'}`;
      case 'player_created':
        return `${log.userName || 'Admin'} created player ${details.playerName || log.playerName}`;
      case 'player_updated':
        return `${log.userName || 'Admin'} updated player ${log.playerName}`;
      case 'player_deleted':
        return `${log.userName || 'Admin'} deleted player ${details.playerName || log.playerName}`;
      case 'password_reset_requested':
        return `Password reset requested for ${details.email || 'user'}`;
      case 'password_reset_completed':
        return `Password reset completed for ${log.userName || 'user'}`;
      default:
        return log.eventType;
    }
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Audit Logs</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-primary-pink text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Toggle filters"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="input-field w-48"
              >
                <option value="">All Events</option>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Event</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">IP Address</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        EVENT_TYPE_COLORS[log.eventType] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {EVENT_TYPE_ICONS[log.eventType]}
                      {EVENT_TYPE_LABELS[log.eventType] || log.eventType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {getEventDescription(log)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 font-mono">
                    {log.ipAddress || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 whitespace-nowrap">
                    {formatDateTime(new Date(log.createdAt))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
            {pagination.total} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={pagination.offset === 0 || loading}
              className="p-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextPage}
              disabled={!pagination.hasMore || loading}
              className="p-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
