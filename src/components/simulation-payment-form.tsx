'use client';

import { useState } from 'react';
import { User, UserX, AlertTriangle } from 'lucide-react';
import { useRecaptcha } from '@/hooks/useRecaptcha';

interface SimulationPaymentFormProps {
  amount: string;
  squareId: string;
  squareIds?: string[];
  playerId: string;
  playerSlug?: string;
  onSuccess: (transactionId?: string) => void;
}

/**
 * Simulation payment form component
 * Used when no real payment provider is configured
 * Supports single or multiple squares
 */
export function SimulationPaymentForm({
  amount,
  squareId,
  squareIds,
  playerId,
  onSuccess,
}: SimulationPaymentFormProps) {
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Use squareIds if provided, otherwise fall back to single squareId
  const allSquareIds = squareIds || [squareId];

  // reCAPTCHA integration
  const { ready: recaptchaReady, executeRecaptcha } = useRecaptcha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    try {
      // Execute reCAPTCHA if available
      const recaptchaToken = await executeRecaptcha('payment');

      const response = await fetch('/api/payment/simulation/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squareIds: allSquareIds,
          playerId,
          donorName: isAnonymous ? null : donorName,
          donorEmail,
          isAnonymous,
          amount,
          recaptchaToken: recaptchaToken || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      onSuccess(data.paymentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Simulation Mode Notice */}
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">
          <strong>Demo Mode:</strong> No payment provider is configured. This donation will be simulated for demonstration purposes.
        </div>
      </div>

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
              <label htmlFor="donorName" className="label">
                Your Name
              </label>
              <input
                id="donorName"
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="input-field"
                placeholder="John Doe"
                required={!isAnonymous}
              />
            </div>

            <div>
              <label htmlFor="donorEmail" className="label">
                Email (optional)
              </label>
              <input
                id="donorEmail"
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

      {/* Simulated Card Info Notice */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600 text-center">
          In demo mode, no card information is required.
          <br />
          Click the button below to complete the simulated donation.
        </p>
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
        disabled={!recaptchaReady || processing || (!isAnonymous && !donorName)}
        className={`w-full btn-primary ${!recaptchaReady || processing || (!isAnonymous && !donorName) ? 'btn-disabled' : ''}`}
      >
        {processing ? 'Processing...' : !recaptchaReady ? 'Loading...' : `Complete Demo Donation $${Math.round(parseFloat(amount))}`}
      </button>
    </form>
  );
}
