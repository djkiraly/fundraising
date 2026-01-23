'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Square } from '@/db/schema';
import { cn } from '@/lib/utils';
import { ShoppingCart, X } from 'lucide-react';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

interface HeartGridProps {
  squares: Square[];
  onSquareClick?: (square: Square) => void;
  readonly?: boolean;
  playerId?: string;
}

export function HeartGrid({ squares, onSquareClick, readonly = false, playerId }: HeartGridProps) {
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);
  const [selectedSquares, setSelectedSquares] = useState<Set<string>>(new Set());
  const router = useRouter();

  const handleSquareClick = (square: Square) => {
    // Track square click
    trackEvent({
      eventType: ANALYTICS_EVENTS.SQUARE_CLICK,
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      playerId: playerId || undefined,
      squareId: square.id,
      value: parseFloat(square.value),
    });

    if (onSquareClick) {
      onSquareClick(square);
    } else if (playerId && !readonly && !square.isPurchased) {
      // Toggle selection
      setSelectedSquares(prev => {
        const newSet = new Set(prev);
        if (newSet.has(square.id)) {
          newSet.delete(square.id);
        } else {
          newSet.add(square.id);
        }
        return newSet;
      });
    }
  };

  const handleCheckout = () => {
    if (selectedSquares.size > 0 && playerId) {
      // Track donation started
      trackEvent({
        eventType: ANALYTICS_EVENTS.DONATION_STARTED,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        playerId,
        value: selectedTotal,
        metadata: { squareCount: selectedSquares.size },
      });

      const squareIds = Array.from(selectedSquares).join(',');
      router.push(`/player/${playerId}?squares=${squareIds}`, { scroll: false });
    }
  };

  const clearSelection = () => {
    setSelectedSquares(new Set());
  };

  // Calculate selected total
  const selectedTotal = squares
    .filter(s => selectedSquares.has(s.id))
    .reduce((sum, s) => sum + parseFloat(s.value), 0);

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

  // Calculate stats
  const totalSquares = squares.length;
  const purchasedSquares = squares.filter((s) => s.isPurchased).length;
  const availableSquares = totalSquares - purchasedSquares;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4 text-center">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-primary-pink">{totalSquares}</div>
          <div className="text-sm text-gray-600">Total Squares</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{purchasedSquares}</div>
          <div className="text-sm text-gray-600">Purchased</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{availableSquares}</div>
          <div className="text-sm text-gray-600">Available</div>
        </div>
      </div>

      {/* Heart Grid */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
        <div
          className="grid gap-1 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${gridWidth}, minmax(0, 1fr))`,
            maxWidth: `${gridWidth * 40}px`,
          }}
        >
          {Array.from({ length: gridHeight }).map((_, rowIndex) =>
            Array.from({ length: gridWidth }).map((_, colIndex) => {
              const x = colIndex + minX;
              const y = rowIndex + minY;
              const key = `${x}-${y}`;
              const square = squareMap.get(key);

              if (!square) {
                return <div key={key} className="aspect-square" />;
              }

              const isHovered = hoveredSquare === square.id;
              const isPurchased = square.isPurchased;
              const isSelected = selectedSquares.has(square.id);
              const canClick = !readonly && !isPurchased;

              return (
                <button
                  key={square.id}
                  className={cn(
                    'aspect-square rounded-md transition-all duration-200 text-xs font-semibold relative group',
                    isPurchased
                      ? 'bg-primary-pink text-white shadow-md'
                      : isSelected
                        ? 'bg-green-500 text-white shadow-lg scale-105 ring-2 ring-green-600'
                        : 'bg-primary-pink-light text-gray-800 hover:bg-primary-pink hover:text-white hover:shadow-lg hover:scale-105',
                    canClick ? 'cursor-pointer' : 'cursor-default',
                    isHovered && !isSelected && 'ring-2 ring-primary-pink-dark'
                  )}
                  onClick={() => canClick && handleSquareClick(square)}
                  onMouseEnter={() => setHoveredSquare(square.id)}
                  onMouseLeave={() => setHoveredSquare(null)}
                  disabled={!canClick}
                  title={
                    isPurchased
                      ? square.isAnonymous
                        ? 'Anonymous Donor'
                        : square.donorName || 'Purchased'
                      : isSelected
                        ? `Selected - $${Math.round(parseFloat(square.value))} (click to remove)`
                        : `Click to select - $${Math.round(parseFloat(square.value))}`
                  }
                >
                  {/* Square value */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isPurchased ? (
                      <span className="text-[10px]">
                        {square.isAnonymous ? '❤️' : square.donorName?.[0]?.toUpperCase()}
                      </span>
                    ) : isSelected ? (
                      <span className="text-[10px]">✓</span>
                    ) : (
                      <span>${Math.round(parseFloat(square.value))}</span>
                    )}
                  </div>

                  {/* Tooltip on hover */}
                  {!readonly && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {isPurchased
                        ? square.isAnonymous
                          ? 'Anonymous'
                          : square.donorName
                        : `$${Math.round(parseFloat(square.value))}`}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary-pink-light rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary-pink rounded"></div>
          <span>Purchased</span>
        </div>
      </div>

      {/* Checkout Bar */}
      {selectedSquares.size > 0 && !readonly && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <ShoppingCart className="w-5 h-5" />
                <span className="font-medium">{selectedSquares.size} square{selectedSquares.size !== 1 ? 's' : ''} selected</span>
              </div>
              <button
                onClick={clearSelection}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xl font-bold text-gray-900">
                ${Math.round(selectedTotal)}
              </div>
              <button
                onClick={handleCheckout}
                className="btn-primary px-6 py-2"
              >
                Donate Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer when checkout bar is visible */}
      {selectedSquares.size > 0 && !readonly && (
        <div className="h-20"></div>
      )}
    </div>
  );
}
