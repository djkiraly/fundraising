'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { User, UserX } from 'lucide-react';

// Square Web Payments SDK types
interface SquarePayments {
  card(): Promise<SquareCard>;
}

interface SquareCard {
  attach(elementId: string): Promise<void>;
  tokenize(): Promise<SquareTokenResult>;
  destroy(): Promise<void>;
}

interface SquareTokenResult {
  status: 'OK' | 'ERROR';
  token?: string;
  errors?: Array<{ message: string }>;
}

declare global {
  interface Window {
    Square?: {
      payments(applicationId: string, locationId: string): Promise<SquarePayments>;
    };
  }
}

interface SquarePaymentFormProps {
  amount: string;
  squareId: string; // Heart grid square ID (for backwards compatibility)
  squareIds?: string[]; // Multiple heart grid square IDs
  playerId: string;
  applicationId: string;
  locationId: string;
  environment: 'sandbox' | 'production';
  onSuccess: () => void;
  onError?: (error: string) => void;
}

/**
 * Square payment form component
 * Loads Square Web Payments SDK and handles card tokenization
 * Supports single or multiple squares
 */
export function SquarePaymentForm({
  amount,
  squareId,
  squareIds,
  playerId,
  applicationId,
  locationId,
  environment,
  onSuccess,
  onError,
}: SquarePaymentFormProps) {
  // Use squareIds if provided, otherwise fall back to single squareId
  const allSquareIds = squareIds || [squareId];
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [cardReady, setCardReady] = useState(false);

  const cardRef = useRef<SquareCard | null>(null);
  const paymentsRef = useRef<SquarePayments | null>(null);

  // Load Square Web Payments SDK
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if SDK is already loaded
    if (window.Square) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = environment === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => {
      setError('Failed to load payment SDK');
      onError?.('Failed to load payment SDK');
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup: don't remove script as it might be used by other components
    };
  }, [environment, onError]);

  // Initialize Square card element
  const initializeCard = useCallback(async () => {
    if (!sdkLoaded || !window.Square || !applicationId || !locationId) {
      return;
    }

    try {
      // Destroy existing card if any
      if (cardRef.current) {
        await cardRef.current.destroy();
        cardRef.current = null;
      }

      const payments = await window.Square.payments(applicationId, locationId);
      paymentsRef.current = payments;

      const card = await payments.card();
      await card.attach('#square-card-container');
      cardRef.current = card;
      setCardReady(true);
    } catch (err) {
      console.error('Error initializing Square card:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment form';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [sdkLoaded, applicationId, locationId, onError]);

  useEffect(() => {
    initializeCard();

    return () => {
      // Cleanup card on unmount
      if (cardRef.current) {
        cardRef.current.destroy().catch(console.error);
      }
    };
  }, [initializeCard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardRef.current) {
      setError('Payment form not ready');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Tokenize the card
      const tokenResult = await cardRef.current.tokenize();

      if (tokenResult.status !== 'OK' || !tokenResult.token) {
        const errorMessage = tokenResult.errors?.[0]?.message || 'Card verification failed';
        setError(errorMessage);
        setProcessing(false);
        return;
      }

      // Send payment to server
      const response = await fetch('/api/payment/square/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squareIds: allSquareIds,
          sourceId: tokenResult.token,
          donorName: isAnonymous ? null : donorName,
          donorEmail: donorEmail || null,
          isAnonymous,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Payment was not completed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (!applicationId || !locationId) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Square payment is not configured. Please contact the administrator.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Donor Info Toggle */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsAnonymous(false)}
            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
              !isAnonymous
                ? 'border-primary-pink bg-primary-pink-light/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <User className="w-5 h-5 mx-auto mb-1" />
            <div className="text-sm font-semibold">Show My Name</div>
          </button>
          <button
            type="button"
            onClick={() => setIsAnonymous(true)}
            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
              isAnonymous
                ? 'border-primary-pink bg-primary-pink-light/20'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <UserX className="w-5 h-5 mx-auto mb-1" />
            <div className="text-sm font-semibold">Anonymous</div>
          </button>
        </div>

        {!isAnonymous && (
          <>
            <div>
              <label htmlFor="squareDonorName" className="label">
                Your Name
              </label>
              <input
                id="squareDonorName"
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="input-field"
                placeholder="John Doe"
                required={!isAnonymous}
              />
            </div>

            <div>
              <label htmlFor="squareDonorEmail" className="label">
                Email (for receipt)
              </label>
              <input
                id="squareDonorEmail"
                type="email"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                className="input-field"
                placeholder="john@example.com"
              />
            </div>
          </>
        )}
      </div>

      {/* Square Card Element */}
      <div>
        <label className="label">Payment Information</label>
        <div className="border border-gray-300 rounded-lg p-3 min-h-[100px]">
          {!sdkLoaded ? (
            <div className="flex items-center justify-center h-16">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-pink"></div>
              <span className="ml-2 text-gray-500">Loading payment form...</span>
            </div>
          ) : (
            <div id="square-card-container" className="min-h-[50px]"></div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!cardReady || processing}
        className={`w-full btn-primary ${!cardReady || processing ? 'btn-disabled' : ''}`}
      >
        {processing ? 'Processing...' : `Donate $${Math.round(parseFloat(amount))}`}
      </button>

      {/* Square branding */}
      <p className="text-xs text-gray-400 text-center">
        Powered by Square
      </p>
    </form>
  );
}
