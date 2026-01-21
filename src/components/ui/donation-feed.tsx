'use client';

import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Heart, CreditCard, Banknote, DollarSign, User } from 'lucide-react';

interface Donation {
  id: string;
  amount: string;
  donorName: string | null;
  donorEmail: string | null;
  isAnonymous: boolean;
  paymentProvider: string | null;
  manualPaymentMethod: string | null;
  squareId: string | null;
  status: string;
  createdAt: Date;
  notes: string | null;
}

interface Square {
  id: string;
  positionX: number;
  positionY: number;
  value: string;
}

interface DonationFeedProps {
  donations: Donation[];
  squares: Square[];
  showPaymentMethod?: boolean;
}

function getPaymentIcon(donation: Donation) {
  if (donation.paymentProvider === 'manual') {
    switch (donation.manualPaymentMethod) {
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      case 'check':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  }
  // Online payment (Stripe or Square)
  return <CreditCard className="w-4 h-4" />;
}

function getPaymentLabel(donation: Donation): string {
  if (donation.paymentProvider === 'manual') {
    switch (donation.manualPaymentMethod) {
      case 'cash':
        return 'Cash';
      case 'check':
        return 'Check';
      default:
        return 'Manual';
    }
  }
  if (donation.paymentProvider === 'square') {
    return 'Card';
  }
  return 'Card';
}

function getPaymentBadgeColor(donation: Donation): string {
  if (donation.paymentProvider === 'manual') {
    return 'bg-amber-100 text-amber-700';
  }
  return 'bg-blue-100 text-blue-700';
}

export function DonationFeed({ donations, squares, showPaymentMethod = true }: DonationFeedProps) {
  // Create a map of squares for quick lookup
  const squareMap = new Map(squares.map(s => [s.id, s]));

  if (donations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Heart className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600 mb-2">No donations yet</p>
        <p className="text-sm text-gray-500">Share your link to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {donations.map((donation) => {
        const square = donation.squareId ? squareMap.get(donation.squareId) : null;
        const donorDisplay = donation.isAnonymous ? 'Anonymous Donor' : (donation.donorName || 'Supporter');

        return (
          <div
            key={donation.id}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            {/* Header with donor and amount */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-pink-light rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-pink" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{donorDisplay}</div>
                  <div className="text-xs text-gray-500">{formatDateTime(donation.createdAt)}</div>
                </div>
              </div>
              <div className="text-xl font-bold text-primary-pink">
                {formatCurrency(donation.amount)}
              </div>
            </div>

            {/* Details row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Payment type badge - only shown on dashboard */}
              {showPaymentMethod && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentBadgeColor(donation)}`}>
                  {getPaymentIcon(donation)}
                  {getPaymentLabel(donation)}
                </span>
              )}

              {/* Square purchase indicator */}
              {square && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700">
                  <Heart className="w-3 h-3 fill-current" />
                  Square purchased
                </span>
              )}

              {/* Manual donation note preview - only shown on dashboard */}
              {showPaymentMethod && donation.paymentProvider === 'manual' && donation.notes && (
                <span className="text-xs text-gray-500 italic truncate max-w-[200px]" title={donation.notes}>
                  "{donation.notes}"
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
