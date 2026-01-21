'use client';

import { formatCurrency, calculateProgress } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  current: number | string;
  goal: number | string;
  className?: string;
}

/**
 * Progress bar component for fundraising goals
 */
export function ProgressBar({ current, goal, className }: ProgressBarProps) {
  const currentNum = typeof current === 'string' ? parseFloat(current) : current;
  const goalNum = typeof goal === 'string' ? parseFloat(goal) : goal;
  const percentage = calculateProgress(currentNum, goalNum);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          {formatCurrency(currentNum)} raised
        </span>
        <span className="text-sm font-medium text-gray-700">
          Goal: {formatCurrency(goalNum)}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            percentage >= 100
              ? 'bg-gradient-to-r from-green-400 to-green-600'
              : 'bg-gradient-to-r from-primary-pink-light to-primary-pink'
          )}
          style={{ width: `${percentage}%` }}
        >
          <div className="h-full w-full bg-white/20 animate-pulse"></div>
        </div>
      </div>
      <div className="text-center mt-2">
        <span className="text-lg font-bold text-primary-pink">
          {percentage.toFixed(1)}% Complete
        </span>
      </div>
    </div>
  );
}
