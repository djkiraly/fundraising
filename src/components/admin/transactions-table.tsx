'use client';

import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download
} from 'lucide-react';

interface Transaction {
  id: string;
  playerId: string;
  playerName: string;
  amount: string;
  donorName: string | null;
  donorEmail: string | null;
  isAnonymous: boolean;
  paymentProvider: string | null;
  stripePaymentIntentId: string | null;
  squarePaymentId: string | null;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
}

interface TransactionsTableProps {
  transactions: Transaction[];
}

type SortField = 'createdAt' | 'amount' | 'playerName' | 'status';
type SortDirection = 'asc' | 'desc';

/**
 * Transactions table with search, filter, and sort capabilities
 */
export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Get unique providers for filter
  const providers = useMemo(() => {
    const uniqueProviders = new Set(transactions.map(t => t.paymentProvider || 'unknown'));
    return Array.from(uniqueProviders);
  }, [transactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.playerName.toLowerCase().includes(query) ||
        (t.donorName && t.donorName.toLowerCase().includes(query)) ||
        (t.donorEmail && t.donorEmail.toLowerCase().includes(query)) ||
        t.id.toLowerCase().includes(query) ||
        (t.stripePaymentIntentId && t.stripePaymentIntentId.toLowerCase().includes(query)) ||
        (t.squarePaymentId && t.squarePaymentId.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    // Provider filter
    if (providerFilter !== 'all') {
      result = result.filter(t => (t.paymentProvider || 'unknown') === providerFilter);
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
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [transactions, searchQuery, statusFilter, providerFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="w-4 h-4 inline ml-1" /> :
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            {status}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            {status}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getProviderBadge = (provider: string | null) => {
    const p = provider || 'unknown';
    const colors: Record<string, string> = {
      stripe: 'bg-purple-100 text-purple-800',
      square: 'bg-blue-100 text-blue-800',
      manual: 'bg-gray-100 text-gray-800',
      simulation: 'bg-orange-100 text-orange-800',
      unknown: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[p] || colors.unknown}`}>
        <CreditCard className="w-3 h-3" />
        {p}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const exportToCsv = () => {
    const headers = ['Date', 'Player', 'Amount', 'Donor', 'Email', 'Status', 'Provider', 'Transaction ID'];
    const rows = filteredTransactions.map(t => [
      formatDate(t.createdAt),
      t.playerName,
      t.amount,
      t.isAnonymous ? 'Anonymous' : (t.donorName || 'N/A'),
      t.donorEmail || 'N/A',
      t.status,
      t.paymentProvider || 'unknown',
      t.stripePaymentIntentId || t.squarePaymentId || t.id,
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate summary stats
  const totalAmount = filteredTransactions
    .filter(t => t.status === 'succeeded' || t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by player, donor, email, or transaction ID..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-pink focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-pink"
            >
              <option value="all">All Statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Provider Filter */}
          <div>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-pink"
            >
              <option value="all">All Providers</option>
              {providers.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Export */}
          <button
            onClick={exportToCsv}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <span className="text-gray-600">
            Showing <strong>{filteredTransactions.length}</strong> of {transactions.length} transactions
          </span>
          <span className="text-gray-600">
            Total (succeeded): <strong className="text-green-600">{formatCurrency(totalAmount.toFixed(2))}</strong>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  Date/Time <SortIcon field="createdAt" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('playerName')}
                >
                  Player <SortIcon field="playerName" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Donor
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  Amount <SortIcon field="amount" />
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon field="status" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Transaction ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(transaction.createdAt)}
                      </div>
                      {transaction.completedAt && transaction.completedAt !== transaction.createdAt && (
                        <div className="text-xs text-gray-500">
                          Completed: {formatDate(transaction.completedAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.playerName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {transaction.isAnonymous ? (
                        <span className="text-sm text-gray-500 italic">Anonymous</span>
                      ) : (
                        <div>
                          <div className="text-sm text-gray-900">
                            {transaction.donorName || 'N/A'}
                          </div>
                          {transaction.donorEmail && (
                            <div className="text-xs text-gray-500">
                              {transaction.donorEmail}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {getProviderBadge(transaction.paymentProvider)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-mono text-gray-500 max-w-[200px] truncate" title={transaction.stripePaymentIntentId || transaction.squarePaymentId || transaction.id}>
                        {transaction.stripePaymentIntentId || transaction.squarePaymentId || transaction.id}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
