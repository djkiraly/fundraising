'use client';

import { useState, useMemo } from 'react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Download,
  Users,
} from 'lucide-react';

export interface DonorReportRow {
  id: string;
  donorName: string | null;
  donorEmail: string | null;
  isAnonymous: boolean;
  amount: string;
  playerName: string;
  playerId: string;
  createdAt: Date;
}

interface DonorsReportProps {
  donors: DonorReportRow[];
  players: { id: string; name: string }[];
}

type SortField = 'createdAt' | 'amount' | 'playerName' | 'donorName';
type SortDirection = 'asc' | 'desc';

/**
 * Donors report table with search, filter, sort, and CSV export
 */
export function DonorsReport({ donors, players }: DonorsReportProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playerFilter, setPlayerFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...donors];

    // Search filter — donor name, donor email, player name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(row => {
        const donor = row.isAnonymous ? 'anonymous' : (row.donorName ?? '').toLowerCase();
        const email = (row.donorEmail ?? '').toLowerCase();
        const player = row.playerName.toLowerCase();
        return donor.includes(q) || email.includes(q) || player.includes(q);
      });
    }

    // Player filter
    if (playerFilter !== 'all') {
      result = result.filter(row => row.playerId === playerFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'amount':
          comparison = parseFloat(a.amount) - parseFloat(b.amount);
          break;
        case 'playerName':
          comparison = a.playerName.localeCompare(b.playerName);
          break;
        case 'donorName': {
          const nameA = a.isAnonymous ? 'Anonymous' : (a.donorName ?? '');
          const nameB = b.isAnonymous ? 'Anonymous' : (b.donorName ?? '');
          comparison = nameA.localeCompare(nameB);
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [donors, searchQuery, playerFilter, sortField, sortDirection]);

  const totalAmount = useMemo(
    () => filteredAndSorted.reduce((sum, row) => sum + parseFloat(row.amount), 0),
    [filteredAndSorted]
  );

  const exportCsv = () => {
    const headers = ['Date', 'Donor Name', 'Donor Email', 'Amount', 'Player'];
    const rows = filteredAndSorted.map(row => [
      formatDateTime(row.createdAt),
      row.isAnonymous ? 'Anonymous' : (row.donorName ?? ''),
      row.isAnonymous ? '' : (row.donorEmail ?? ''),
      parseFloat(row.amount).toFixed(2),
      row.playerName,
    ]);

    const csvContent = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donors-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3.5 h-3.5 text-gray-300" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-primary-pink" />
      : <ChevronDown className="w-3.5 h-3.5 text-primary-pink" />;
  };

  const SortableHeader = ({
    field,
    label,
    className = '',
  }: {
    field: SortField;
    label: string;
    className?: string;
  }) => (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon field={field} />
      </span>
    </th>
  );

  return (
    <div className="card">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search donor name, email, or player…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-pink focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Player filter */}
        <select
          value={playerFilter}
          onChange={e => setPlayerFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-pink bg-white"
        >
          <option value="all">All Players</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Export button */}
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          Showing <span className="font-semibold text-gray-900">{filteredAndSorted.length}</span> of{' '}
          <span className="font-semibold text-gray-900">{donors.length}</span> donations
        </span>
        <span>
          Total:{' '}
          <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <SortableHeader field="createdAt" label="Date" />
              <SortableHeader field="donorName" label="Donor" />
              <SortableHeader field="playerName" label="Player" />
              <SortableHeader field="amount" label="Amount" className="text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                  No donations match your filters.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {/* Date */}
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {formatDateTime(row.createdAt)}
                  </td>

                  {/* Donor */}
                  <td className="px-4 py-3">
                    {row.isAnonymous ? (
                      <span className="text-gray-400 italic">Anonymous</span>
                    ) : (
                      <div>
                        <div className="font-medium text-gray-900">
                          {row.donorName || <span className="text-gray-400 italic">Unnamed</span>}
                        </div>
                        {row.donorEmail && (
                          <div className="text-xs text-gray-500">{row.donorEmail}</div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Player */}
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.playerName}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(row.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Footer total */}
          {filteredAndSorted.length > 0 && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Total ({filteredAndSorted.length} donations)
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                  {formatCurrency(totalAmount)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
