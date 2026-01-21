'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Player } from '@/db/schema';
import { formatCurrency, calculateProgress } from '@/lib/utils';
import { ExternalLink, Trophy, Shuffle, RefreshCw, Plus, Pencil, Trash2, X, DollarSign } from 'lucide-react';

interface PlayersListProps {
  players: Player[];
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

  return (
    <>
    <div className="card overflow-hidden">
      {/* Header with Add Player and Randomize All buttons */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {players.length} player{players.length !== 1 ? 's' : ''}
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {players.map((player, index) => {
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
                          {index === 0 && (
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
                        href={`/player/${player.id}`}
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

      {players.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No players found. Click "Add Player" to create one.</p>
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
