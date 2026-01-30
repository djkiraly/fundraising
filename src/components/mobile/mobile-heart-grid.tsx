'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, X } from 'lucide-react';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

interface Square {
  id: string;
  playerId: string;
  positionX: number;
  positionY: number;
  value: string;
  isPurchased: boolean;
  donorName: string | null;
  isAnonymous: boolean;
}

interface MobileHeartGridProps {
  squares: Square[];
  playerId: string;
  playerSlug?: string;
}

/**
 * Mobile-optimized heart-shaped grid
 * Renders squares in heart formation with touch-friendly interactions
 */
export function MobileHeartGrid({ squares, playerId, playerSlug }: MobileHeartGridProps) {
  const [selectedSquares, setSelectedSquares] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Group squares by position
  const squareMap = new Map(
    squares.map((square) => [`${square.positionX}-${square.positionY}`, square])
  );

  // Calculate grid boundaries
  const minX = Math.min(...squares.map((s) => s.positionX));
  const maxX = Math.max(...squares.map((s) => s.positionX));
  const minY = Math.min(...squares.map((s) => s.positionY));
  const maxY = Math.max(...squares.map((s) => s.positionY));

  const gridWidth = maxX - minX + 1;
  const gridHeight = maxY - minY + 1;

  // Handle square tap
  const handleSquareTap = (square: Square) => {
    if (square.isPurchased) return;

    setSelectedSquares(prev => {
      const newSet = new Set(prev);
      if (newSet.has(square.id)) {
        newSet.delete(square.id);
      } else {
        newSet.add(square.id);
      }
      return newSet;
    });
  };

  // Handle checkout - navigate to player page with squares in URL to trigger donation modal
  const handleCheckout = () => {
    if (selectedSquares.size > 0) {
      // Track donation started
      trackEvent({
        eventType: ANALYTICS_EVENTS.DONATION_STARTED,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        playerId,
        value: selectedTotal,
        metadata: { squareCount: selectedSquares.size },
      });

      const squareIds = Array.from(selectedSquares).join(',');
      // Use playerSlug if available, otherwise fall back to playerId
      const playerIdentifier = playerSlug || playerId;
      router.push(`/player/${playerIdentifier}?squares=${squareIds}`, { scroll: false });
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedSquares(new Set());
  };

  // Calculate selected total
  const selectedTotal = squares
    .filter(s => selectedSquares.has(s.id))
    .reduce((sum, s) => sum + parseFloat(s.value), 0);

  // Calculate stats
  const totalSquares = squares.length;
  const purchasedCount = squares.filter(s => s.isPurchased).length;
  const availableCount = totalSquares - purchasedCount;

  return (
    <div className="w-full">
      {/* Mini Stats */}
      <div className="flex justify-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-primary-pink-light rounded"></div>
          <span className="text-gray-600">Available ({availableCount})</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-primary-pink rounded"></div>
          <span className="text-gray-600">Sold ({purchasedCount})</span>
        </div>
      </div>

      {/* Heart Grid Container */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <div
          className="grid gap-[2px] mx-auto"
          style={{
            gridTemplateColumns: `repeat(${gridWidth}, minmax(0, 1fr))`,
            maxWidth: '100%',
          }}
        >
          {Array.from({ length: gridHeight }).map((_, rowIndex) =>
            Array.from({ length: gridWidth }).map((_, colIndex) => {
              const x = colIndex + minX;
              const y = rowIndex + minY;
              const key = `${x}-${y}`;
              const square = squareMap.get(key);

              if (!square) {
                // Empty cell - maintains heart shape
                return <div key={key} className="aspect-square" />;
              }

              const isPurchased = square.isPurchased;
              const isSelected = selectedSquares.has(square.id);

              return (
                <button
                  key={square.id}
                  className={`
                    aspect-square rounded-[3px] text-[8px] font-bold
                    flex items-center justify-center
                    transition-all duration-150 active:scale-90
                    ${isPurchased
                      ? 'bg-primary-pink text-white'
                      : isSelected
                        ? 'bg-green-500 text-white ring-1 ring-green-600'
                        : 'bg-primary-pink-light text-gray-700 active:bg-primary-pink active:text-white'
                    }
                  `}
                  onClick={() => handleSquareTap(square)}
                  disabled={isPurchased}
                >
                  {isPurchased ? (
                    <span className="text-[7px]">
                      {square.isAnonymous ? '♥' : square.donorName?.[0]?.toUpperCase() || '♥'}
                    </span>
                  ) : isSelected ? (
                    <span>✓</span>
                  ) : (
                    <span>${Math.round(parseFloat(square.value))}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Tap instruction */}
      <p className="text-center text-xs text-gray-500 mt-2">
        Tap squares to select, then donate
      </p>

      {/* Checkout Bar - positioned below the grid */}
      {selectedSquares.size > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-gray-600">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {selectedSquares.size} square{selectedSquares.size !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={clearSelection}
                className="text-gray-400 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(selectedTotal)}
              </span>
              <button
                onClick={handleCheckout}
                className="px-4 py-2 bg-primary-pink text-white text-sm font-semibold rounded-lg active:bg-primary-pink-dark"
              >
                Donate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
