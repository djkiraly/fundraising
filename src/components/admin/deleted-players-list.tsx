'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Trash2, RotateCcw, AlertTriangle, ChevronDown, ChevronUp, Users } from 'lucide-react';

interface DeletedPlayer {
  id: string;
  name: string;
  userEmail: string | null;
  photoUrl: string | null;
  goal: string;
  totalRaised: string;
  deletedAt: string;
  createdAt: string;
  squaresTotal: number;
  squaresPurchased: number;
  donationsCount: number;
  donationsTotal: number;
}

export function DeletedPlayersList() {
  const [players, setPlayers] = useState<DeletedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<string | null>(null);

  const fetchDeletedPlayers = async () => {
    try {
      const response = await fetch('/api/admin/players/deleted');
      if (!response.ok) throw new Error('Failed to fetch deleted players');
      const data = await response.json();
      setPlayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deleted players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedPlayers();
  }, []);

  const handleRestore = async (playerId: string) => {
    setActionLoading(playerId);
    try {
      const response = await fetch(`/api/admin/players/${playerId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to restore player');
      }

      // Remove from list and refresh
      setPlayers(prev => prev.filter(p => p.id !== playerId));
      // Trigger a page refresh to update the main players list
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to restore player');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurge = async (playerId: string) => {
    setActionLoading(playerId);
    try {
      const response = await fetch(`/api/admin/players/${playerId}/purge`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to purge player');
      }

      // Remove from list
      setPlayers(prev => prev.filter(p => p.id !== playerId));
      setConfirmPurge(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to purge player');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Deleted Players</h3>
          </div>
        </div>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Deleted Players</h3>
          {players.length > 0 && (
            <span className="bg-gray-200 text-gray-700 text-sm px-2 py-0.5 rounded-full">
              {players.length}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4">
          {players.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No deleted players</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                These players have been soft-deleted. You can restore them or permanently purge their records.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Player</th>
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Deleted</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Raised</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Donations</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => (
                      <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3">
                          <div>
                            <div className="font-medium text-gray-900">{player.name}</div>
                            {player.userEmail && (
                              <div className="text-sm text-gray-500">{player.userEmail}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-sm text-gray-600">
                            {formatDate(player.deletedAt)}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-medium text-gray-900">
                            {formatCurrency(player.totalRaised)}
                          </div>
                          <div className="text-xs text-gray-500">
                            of {formatCurrency(player.goal)} goal
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="text-sm text-gray-900">{player.donationsCount}</div>
                          <div className="text-xs text-gray-500">
                            {player.squaresPurchased}/{player.squaresTotal} squares
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-end gap-2">
                            {confirmPurge === player.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-red-600">Confirm?</span>
                                <button
                                  onClick={() => handlePurge(player.id)}
                                  disabled={actionLoading === player.id}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  {actionLoading === player.id ? '...' : 'Yes'}
                                </button>
                                <button
                                  onClick={() => setConfirmPurge(null)}
                                  disabled={actionLoading === player.id}
                                  className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRestore(player.id)}
                                  disabled={actionLoading === player.id}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                                  title="Restore player"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Restore
                                </button>
                                <button
                                  onClick={() => setConfirmPurge(player.id)}
                                  disabled={actionLoading === player.id}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                                  title="Permanently delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Purge
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Warning message */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Warning:</strong> Purging a player permanently deletes all their data including
                  donation records and squares. This action cannot be undone.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
