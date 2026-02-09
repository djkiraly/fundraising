'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Player } from '@/db/schema';

interface PlayerWithLogin extends Player {
  lastLogin?: Date | string | null;
}
import { formatCurrency, calculateProgress } from '@/lib/utils';
import { ExternalLink, Trophy, Shuffle, RefreshCw, Plus, Pencil, Trash2, X, DollarSign, Mail, Search, Filter, Key } from 'lucide-react';

interface PlayersListProps {
  players: PlayerWithLogin[];
}

interface PlayerFormData {
  name: string;
  email: string;
  password: string;
  photoUrl: string;
  goal: string;
  isActive: boolean;
  generateSquares: boolean;
  parentEmail: string;
}

const initialFormData: PlayerFormData = {
  name: '',
  email: '',
  password: '',
  photoUrl: '',
  goal: '100',
  isActive: true,
  generateSquares: true,
  parentEmail: '',
};

interface ManualDonationFormData {
  amount: string;
  donorName: string;
  donorEmail: string;
  paymentMethod: 'cash' | 'check' | 'other';
  notes: string;
  isAnonymous: boolean;
}

const initialManualDonationData: ManualDonationFormData = {
  amount: '',
  donorName: '',
  donorEmail: '',
  paymentMethod: 'cash',
  notes: '',
  isAnonymous: false,
};

/**
 * Format last login timestamp in a human-readable way
 */
function formatLastLogin(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Players list for admin with CRUD operations
 */
export function PlayersList({ players }: PlayersListProps) {
  const router = useRouter();
  const [randomizing, setRandomizing] = useState<Record<string, boolean>>({});
  const [randomizingAll, setRandomizingAll] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState<PlayerFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Manual donation modal state
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationPlayer, setDonationPlayer] = useState<Player | null>(null);
  const [donationFormData, setDonationFormData] = useState<ManualDonationFormData>(initialManualDonationData);
  const [savingDonation, setSavingDonation] = useState(false);

  // Password setup email state
  const [sendingPasswordSetup, setSendingPasswordSetup] = useState<Record<string, boolean>>({});

  // Set password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordPlayer, setPasswordPlayer] = useState<Player | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [progressFilter, setProgressFilter] = useState<'all' | 'goalMet' | 'inProgress' | 'notStarted'>('all');

  // Filter players based on search and filters
  const filteredPlayers = players.filter(player => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!player.name.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter === 'active' && !player.isActive) return false;
    if (statusFilter === 'inactive' && player.isActive) return false;

    // Progress filter
    const progress = calculateProgress(player.totalRaised, player.goal);
    if (progressFilter === 'goalMet' && progress < 100) return false;
    if (progressFilter === 'inProgress' && (progress >= 100 || progress === 0)) return false;
    if (progressFilter === 'notStarted' && progress > 0) return false;

    return true;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setProgressFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || progressFilter !== 'all';

  // Get the top fundraiser ID (first player in the original sorted list)
  const topFundraiserId = players.length > 0 ? players[0].id : null;

  const handleRandomize = async (playerId: string, playerName: string) => {
    if (!confirm(`Randomize square values for ${playerName}? This will update all unpurchased squares.`)) {
      return;
    }

    setRandomizing(prev => ({ ...prev, [playerId]: true }));
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/players/${playerId}/randomize-squares`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to randomize squares');
      }

      setMessage({
        type: 'success',
        text: `${playerName}: ${data.squaresUpdated} squares randomized (Total: $${data.actualTotal})`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to randomize squares',
      });
    } finally {
      setRandomizing(prev => ({ ...prev, [playerId]: false }));
    }
  };

  const handleRandomizeAll = async () => {
    if (!confirm('Randomize square values for ALL players? This will update all unpurchased squares.')) {
      return;
    }

    setRandomizingAll(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/players/randomize-all', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to randomize squares');
      }

      setMessage({
        type: 'success',
        text: `Randomized ${data.totalSquaresUpdated} squares across ${data.results.length} players`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to randomize squares',
      });
    } finally {
      setRandomizingAll(false);
    }
  };

  const openAddModal = () => {
    setEditingPlayer(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = async (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      email: '',
      password: '',
      photoUrl: player.photoUrl || '',
      goal: player.goal,
      isActive: player.isActive,
      generateSquares: false,
      parentEmail: player.parentEmail || '',
    });
    setShowModal(true);

    // Fetch full player details to get user email
    try {
      const response = await fetch(`/api/admin/players/${player.id}`);
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          email: data.user?.email || '',
          parentEmail: data.parentEmail || '',
        }));
      }
    } catch (error) {
      console.error('Failed to fetch player details:', error);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPlayer(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const url = editingPlayer
        ? `/api/admin/players/${editingPlayer.id}`
        : '/api/admin/players';
      const method = editingPlayer ? 'PATCH' : 'POST';

      const payload: Record<string, unknown> = {
        name: formData.name,
        photoUrl: formData.photoUrl || null,
        goal: parseFloat(formData.goal),
        isActive: formData.isActive,
      };

      if (editingPlayer) {
        // When editing, allow updating email and parentEmail
        if (formData.email) payload.email = formData.email;
        payload.parentEmail = formData.parentEmail || null;
      } else {
        // When creating, include email, password, and generateSquares
        if (formData.email) payload.email = formData.email;
        if (formData.password) payload.password = formData.password;
        payload.generateSquares = formData.generateSquares;
        payload.parentEmail = formData.parentEmail || null;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${editingPlayer ? 'update' : 'create'} player`);
      }

      setMessage({
        type: 'success',
        text: `Player ${editingPlayer ? 'updated' : 'created'} successfully`,
      });
      closeModal();
      router.refresh();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (player: Player) => {
    if (!confirm(`Are you sure you want to delete ${player.name}? This will also delete all their squares and donation records.`)) {
      return;
    }

    setDeleting(player.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/players/${player.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete player');
      }

      setMessage({
        type: 'success',
        text: `${player.name} has been deleted`,
      });
      router.refresh();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete player',
      });
    } finally {
      setDeleting(null);
    }
  };

  // Manual donation handlers
  const openDonationModal = (player: Player) => {
    setDonationPlayer(player);
    setDonationFormData(initialManualDonationData);
    setShowDonationModal(true);
  };

  const closeDonationModal = () => {
    setShowDonationModal(false);
    setDonationPlayer(null);
    setDonationFormData(initialManualDonationData);
  };

  const handleManualDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donationPlayer) return;

    setSavingDonation(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/players/${donationPlayer.id}/manual-donation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(donationFormData.amount),
          donorName: donationFormData.donorName || null,
          donorEmail: donationFormData.donorEmail || null,
          paymentMethod: donationFormData.paymentMethod,
          notes: donationFormData.notes || null,
          isAnonymous: donationFormData.isAnonymous,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add manual donation');
      }

      setMessage({
        type: 'success',
        text: data.message || `Successfully added $${donationFormData.amount} to ${donationPlayer.name}`,
      });
      closeDonationModal();
      router.refresh();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to add manual donation',
      });
    } finally {
      setSavingDonation(false);
    }
  };

  // Send password setup email handler
  const handleSendPasswordSetup = async (player: Player) => {
    if (!confirm(`Send password setup email to ${player.name}?`)) {
      return;
    }

    setSendingPasswordSetup(prev => ({ ...prev, [player.id]: true }));
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/players/${player.id}/send-password-setup`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setMessage({
        type: 'success',
        text: data.message || `Password setup email sent to ${player.name}`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send password setup email',
      });
    } finally {
      setSendingPasswordSetup(prev => ({ ...prev, [player.id]: false }));
    }
  };

  // Set password handlers
  const openPasswordModal = (player: Player) => {
    setPasswordPlayer(player);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordPlayer(null);
    setNewPassword('');
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordPlayer) return;

    setSavingPassword(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/players/${passwordPlayer.id}/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set password');
      }

      setMessage({
        type: 'success',
        text: data.message || `Password updated for ${passwordPlayer.name}`,
      });
      closePasswordModal();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to set password',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
    <div className="card overflow-hidden">
      {/* Header with Add Player and Randomize All buttons */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            {filteredPlayers.length} of {players.length} player{players.length !== 1 ? 's' : ''}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-2 text-primary-pink hover:text-primary-pink-dark underline"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-primary-pink text-white rounded-lg hover:bg-primary-pink-dark flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Player
            </button>
            <button
              onClick={handleRandomizeAll}
              disabled={randomizingAll}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {randomizingAll ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Shuffle className="w-4 h-4" />
              )}
              Randomize All
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-pink focus:border-transparent text-sm"
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

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-pink focus:border-transparent text-sm bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Progress Filter */}
          <select
            value={progressFilter}
            onChange={(e) => setProgressFilter(e.target.value as 'all' | 'goalMet' | 'inProgress' | 'notStarted')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-pink focus:border-transparent text-sm bg-white"
          >
            <option value="all">All Progress</option>
            <option value="goalMet">Goal Met (100%+)</option>
            <option value="inProgress">In Progress (1-99%)</option>
            <option value="notStarted">Not Started (0%)</option>
          </select>
        </div>
      </div>

      {/* Message display */}
      {message && (
        <div
          className={`p-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border-b border-green-200'
              : 'bg-red-50 text-red-800 border-b border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Raised
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Goal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPlayers.map((player) => {
              const progress = calculateProgress(player.totalRaised, player.goal);
              const isComplete = progress >= 100;

              return (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {player.photoUrl ? (
                          <Image
                            src={player.photoUrl}
                            alt={player.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-pink-light to-primary-pink text-white font-bold">
                            {player.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900">
                            {player.name}
                          </div>
                          {player.id === topFundraiserId && (
                            <span title="Top Fundraiser">
                              <Trophy className="w-4 h-4 text-yellow-500" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(player.totalRaised)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {formatCurrency(player.goal)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full max-w-[100px]">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-full rounded-full ${
                              isComplete
                                ? 'bg-gradient-to-r from-green-400 to-green-600'
                                : 'bg-gradient-to-r from-primary-pink-light to-primary-pink'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        player.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {player.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {player.lastLogin ? (
                        <span title={new Date(player.lastLogin).toLocaleString()}>
                          {formatLastLogin(player.lastLogin)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Never</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openDonationModal(player)}
                        className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                        title="Add manual donation"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSendPasswordSetup(player)}
                        disabled={sendingPasswordSetup[player.id]}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded disabled:opacity-50"
                        title="Send password setup email"
                      >
                        {sendingPasswordSetup[player.id] ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openPasswordModal(player)}
                        className="p-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded"
                        title="Set password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(player)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit player"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRandomize(player.id, player.name)}
                        disabled={randomizing[player.id]}
                        className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded disabled:opacity-50"
                        title="Randomize square values"
                      >
                        {randomizing[player.id] ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Shuffle className="w-4 h-4" />
                        )}
                      </button>
                      <Link
                        href={`/player/${player.slug}`}
                        target="_blank"
                        className="p-1.5 text-primary-pink hover:text-primary-pink-dark hover:bg-pink-50 rounded"
                        title="View player page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(player)}
                        disabled={deleting === player.id}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                        title="Delete player"
                      >
                        {deleting === player.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredPlayers.length === 0 && (
        <div className="text-center py-12">
          {players.length === 0 ? (
            <p className="text-gray-600">No players found. Click &quot;Add Player&quot; to create one.</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">No players match your search criteria.</p>
              <button
                onClick={clearFilters}
                className="text-primary-pink hover:text-primary-pink-dark underline text-sm"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Add/Edit Player Modal */}
    {showModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {editingPlayer ? 'Edit Player' : 'Add New Player'}
            </h2>
            <button
              onClick={closeModal}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-1">
                Player Name *
              </label>
              <input
                id="playerName"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-pink focus:border-transparent"
                required
              />
            </div>

            {/* Email Section */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500 mb-3">
                {editingPlayer ? 'Email addresses for notifications' : 'Optional: Create a login account for this player'}
              </p>
            </div>

            <div>
              <label htmlFor="playerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                {editingPlayer ? 'Player Email (login)' : 'Email (for login)'}
              </label>
              <input
                id="playerEmail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-pink focus:border-transparent"
                placeholder={editingPlayer ? 'No login account linked' : 'player@example.com'}
              />
              {editingPlayer && !formData.email && (
                <p className="text-xs text-gray-500 mt-1">This player does not have a login account</p>
              )}
            </div>

            {!editingPlayer && (
              <div>
                <label htmlFor="playerPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="playerPassword"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-pink focus:border-transparent"
                  minLength={6}
                />
              </div>
            )}

            <div>
              <label htmlFor="playerParentEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Parent/Guardian Email
              </label>
              <input
                id="playerParentEmail"
                type="email"
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-pink focus:border-transparent"
                placeholder="parent@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">Secondary email for donation notifications</p>
            </div>

            <div>
              <label htmlFor="playerPhotoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Photo URL
              </label>
              <input
                id="playerPhotoUrl"
                type="url"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-pink focus:border-transparent"
                placeholder="https://example.com/photo.jpg"
              />
            </div>

            <div>
              <label htmlFor="playerGoal" className="block text-sm font-medium text-gray-700 mb-1">
                Fundraising Goal ($)
              </label>
              <input
                id="playerGoal"
                type="number"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-pink focus:border-transparent"
                min="1"
                step="1"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="playerIsActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-primary-pink border-gray-300 rounded focus:ring-primary-pink"
              />
              <label htmlFor="playerIsActive" className="text-sm text-gray-700">
                Player is active
              </label>
            </div>

            {!editingPlayer && (
              <div className="flex items-center gap-2">
                <input
                  id="playerGenerateSquares"
                  type="checkbox"
                  checked={formData.generateSquares}
                  onChange={(e) => setFormData({ ...formData, generateSquares: e.target.checked })}
                  className="w-4 h-4 text-primary-pink border-gray-300 rounded focus:ring-primary-pink"
                />
                <label htmlFor="playerGenerateSquares" className="text-sm text-gray-700">
                  Generate heart grid squares
                </label>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !formData.name}
                className="px-4 py-2 bg-primary-pink text-white rounded-lg hover:bg-primary-pink-dark disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                {editingPlayer ? 'Update Player' : 'Create Player'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Set Password Modal */}
    {showPasswordModal && passwordPlayer && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-sm w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Set Password</h2>
              <p className="text-sm text-gray-500 mt-1">
                For {passwordPlayer.name}
              </p>
            </div>
            <button
              onClick={closePasswordModal}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSetPassword} className="p-6 space-y-4">
            <div>
              <label htmlFor="setPlayerPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="setPlayerPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Minimum 6 characters"
                minLength={6}
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={closePasswordModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPassword || newPassword.length < 6}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savingPassword && <RefreshCw className="w-4 h-4 animate-spin" />}
                <Key className="w-4 h-4" />
                Set Password
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Manual Donation Modal */}
    {showDonationModal && donationPlayer && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Manual Donation</h2>
              <p className="text-sm text-gray-500 mt-1">
                For {donationPlayer.name}
              </p>
            </div>
            <button
              onClick={closeDonationModal}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Form */}
          <form onSubmit={handleManualDonation} className="p-6 space-y-4">
            <div>
              <label htmlFor="donationAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  id="donationAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={donationFormData.amount}
                  onChange={(e) => setDonationFormData({ ...donationFormData, amount: e.target.value })}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method *
              </label>
              <select
                id="paymentMethod"
                value={donationFormData.paymentMethod}
                onChange={(e) => setDonationFormData({ ...donationFormData, paymentMethod: e.target.value as 'cash' | 'check' | 'other' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="donorName" className="block text-sm font-medium text-gray-700 mb-1">
                Donor Name
              </label>
              <input
                id="donorName"
                type="text"
                value={donationFormData.donorName}
                onChange={(e) => setDonationFormData({ ...donationFormData, donorName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="donorEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Donor Email
              </label>
              <input
                id="donorEmail"
                type="email"
                value={donationFormData.donorEmail}
                onChange={(e) => setDonationFormData({ ...donationFormData, donorEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="donationNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="donationNotes"
                value={donationFormData.notes}
                onChange={(e) => setDonationFormData({ ...donationFormData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={2}
                placeholder="Check number, reference, etc."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isAnonymous"
                type="checkbox"
                checked={donationFormData.isAnonymous}
                onChange={(e) => setDonationFormData({ ...donationFormData, isAnonymous: e.target.checked })}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="isAnonymous" className="text-sm text-gray-700">
                Anonymous donation (hide donor name publicly)
              </label>
            </div>

            {/* Info box */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p className="font-medium">This action will:</p>
              <ul className="list-disc list-inside mt-1 text-green-700">
                <li>Add the amount to {donationPlayer.name}&apos;s total raised</li>
                <li>Create a donation record with &quot;manual&quot; payment type</li>
                <li>Log this action in the audit trail</li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={closeDonationModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingDonation || !donationFormData.amount}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savingDonation && <RefreshCw className="w-4 h-4 animate-spin" />}
                <DollarSign className="w-4 h-4" />
                Add Donation
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
