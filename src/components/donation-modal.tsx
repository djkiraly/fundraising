'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Square } from '@/db/schema';
import { formatCurrency } from '@/lib/utils';
import { X, CreditCard, User, UserX } from 'lucide-react';
import { SquarePaymentForm } from './square-payment-form';
import { SimulationPaymentForm } from './simulation-payment-form';

// Payment config type
interface PaymentConfig {
  stripePublishableKey: string | null;
  squareApplicationId: string | null;
  squareLocationId: string | null;
  squareEnvironment: 'sandbox' | 'production';
  paymentProviderActive: 'stripe' | 'square' | 'both';
  paymentProviderDefault: 'stripe' | 'square';
}

// Cache the Stripe promise to avoid reloading
let stripePromise: Promise<Stripe | null> | null = null;

async function getStripePromise(publishableKey?: string | null): Promise<Stripe | null> {
  // If a key is provided, use it directly
  if (publishableKey) {
    return loadStripe(publishableKey);
  }

  if (stripePromise) return stripePromise;

  stripePromise = (async () => {
    try {
      // Try to fetch from API first
      const response = await fetch('/api/config/public');
      if (response.ok) {
        const data = await response.json();
        if (data.stripePublishableKey) {
          return loadStripe(data.stripePublishableKey);
        }
      }
    } catch (error) {
      console.error('Failed to fetch Stripe config from API:', error);
    }

    // Fall back to environment variable
    const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (envKey) {
      return loadStripe(envKey);
    }

    console.error('No Stripe publishable key configured');
    return null;
  })();

  return stripePromise;
}

/**
 * Donation modal component - supports single or multiple squares
 */
export function DonationModal({ playerId }: { playerId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Support both single square (legacy) and multiple squares
  const singleSquareId = searchParams.get('square');
  const multipleSquareIds = searchParams.get('squares');
  const squareIds = multipleSquareIds
    ? multipleSquareIds.split(',').filter(id => id.trim())
    : singleSquareId
      ? [singleSquareId]
      : [];

  const [clientSecret, setClientSecret] = useState('');
  const [selectedSquares, setSelectedSquares] = useState<Square[]>([]);
  const [loading, setLoading] = useState(false);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Payment provider state
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'square' | 'simulation' | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);

  // Calculate total amount
  const totalAmount = selectedSquares.reduce((sum, s) => sum + parseFloat(s.value), 0);

  // Fetch payment configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config/public');
        if (response.ok) {
          const data = await response.json();
          setPaymentConfig({
            stripePublishableKey: data.stripePublishableKey,
            squareApplicationId: data.squareApplicationId,
            squareLocationId: data.squareLocationId,
            squareEnvironment: data.squareEnvironment || 'sandbox',
            paymentProviderActive: data.paymentProviderActive || 'stripe',
            paymentProviderDefault: data.paymentProviderDefault || 'stripe',
          });
        }
      } catch (error) {
        console.error('Failed to fetch payment config:', error);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const fetchData = async (ids: string[]) => {
      if (ids.length === 0) return;

      setLoading(true);
      try {
        // Fetch all square details
        const squarePromises = ids.map(id =>
          fetch(`/api/squares/${id}`).then(res => {
            if (!res.ok) throw new Error(`Square ${id} not found`);
            return res.json();
          })
        );
        const squaresData = await Promise.all(squarePromises);
        setSelectedSquares(squaresData);

        // Create payment intent / get provider info for multiple squares
        const intentRes = await fetch('/api/payment/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ squareIds: ids }),
        });

        const intentData = await intentRes.json();
        if (!intentRes.ok) {
          throw new Error(intentData.error || 'Failed to create payment intent');
        }

        // Set the provider based on response
        setPaymentProvider(intentData.provider || 'stripe');

        if (intentData.provider === 'stripe' && intentData.clientSecret) {
          setClientSecret(intentData.clientSecret);
          // Load Stripe
          const stripeInstance = await getStripePromise(paymentConfig?.stripePublishableKey);
          if (stripeInstance) {
            setStripe(stripeInstance);
          } else {
            setPaymentError('Stripe is not configured. Please contact the administrator.');
          }
        }
      } catch (error) {
        console.error('Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load payment information';
        if (errorMessage.includes('not configured')) {
          setPaymentError('Payment system is not configured. Please contact the administrator.');
        } else {
          alert(errorMessage);
          router.push(`/player/${playerId}`, { scroll: false });
        }
      } finally {
        setLoading(false);
      }
    };

    if (squareIds.length > 0) {
      fetchData(squareIds);
    }
  }, [squareIds.join(','), playerId, router, paymentConfig?.stripePublishableKey]);

  const closeModal = () => {
    router.push(`/player/${playerId}`, { scroll: false });
  };

  const handleSuccess = () => {
    closeModal();
    window.location.reload();
  };

  if (squareIds.length === 0) return null;

  // Determine if we can show the payment form
  const canShowStripeForm = paymentProvider === 'stripe' && stripe && clientSecret;
  const canShowSquareForm = paymentProvider === 'square' && paymentConfig?.squareApplicationId && paymentConfig?.squareLocationId;
  const canShowSimulationForm = paymentProvider === 'simulation';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Complete Your Donation</h2>
          <button
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {paymentError ? (
            <div className="text-center py-8">
              <p className="text-red-600">{paymentError}</p>
              <button onClick={closeModal} className="mt-4 btn-secondary">
                Close
              </button>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-pink mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading payment...</p>
            </div>
          ) : selectedSquares.length > 0 && (canShowStripeForm || canShowSquareForm || canShowSimulationForm) ? (
            <>
              {/* Donation Summary */}
              <div className="mb-6 p-4 bg-primary-pink-light/20 rounded-lg border border-primary-pink">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-primary-pink" />
                  <span className="font-semibold text-gray-900">Donation Summary</span>
                </div>
                {selectedSquares.length > 1 && (
                  <div className="mb-2 text-sm text-gray-600">
                    {selectedSquares.length} squares selected:
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedSquares.map(s => (
                        <span key={s.id} className="inline-block px-2 py-0.5 bg-white rounded text-xs">
                          ${Math.round(parseFloat(s.value))}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-3xl font-bold text-primary-pink">
                  ${Math.round(totalAmount)}
                </div>
              </div>

              {/* Payment Form - Stripe */}
              {canShowStripeForm && (
                <Elements stripe={stripe} options={{ clientSecret }}>
                  <PaymentForm
                    amount={totalAmount.toFixed(2)}
                    squareIds={squareIds}
                    playerId={playerId}
                    onSuccess={handleSuccess}
                  />
                </Elements>
              )}

              {/* Payment Form - Square */}
              {canShowSquareForm && (
                <SquarePaymentForm
                  amount={totalAmount.toFixed(2)}
                  squareId={squareIds[0]}
                  squareIds={squareIds}
                  playerId={playerId}
                  applicationId={paymentConfig.squareApplicationId!}
                  locationId={paymentConfig.squareLocationId!}
                  environment={paymentConfig.squareEnvironment}
                  onSuccess={handleSuccess}
                />
              )}

              {/* Payment Form - Simulation */}
              {canShowSimulationForm && (
                <SimulationPaymentForm
                  amount={totalAmount.toFixed(2)}
                  squareId={squareIds[0]}
                  squareIds={squareIds}
                  playerId={playerId}
                  onSuccess={handleSuccess}
                />
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-red-600">Failed to load payment information</p>
              <button onClick={closeModal} className="mt-4 btn-secondary">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Payment form component (uses Stripe hooks)
 */
function PaymentForm({
  amount,
  squareIds,
  playerId,
  onSuccess,
}: {
  amount: string;
  squareIds: string[];
  playerId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Update all squares with donor information before payment
      for (const squareId of squareIds) {
        if (!isAnonymous && donorName) {
          await fetch(`/api/squares/${squareId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              donorName,
              isAnonymous: false,
            }),
          });
        } else {
          await fetch(`/api/squares/${squareId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isAnonymous: true,
            }),
          });
        }
      }

      // Confirm payment
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/player/${playerId}?success=true`,
          receipt_email: donorEmail || undefined,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

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
                Email (for receipt)
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

      {/* Payment Element */}
      <div>
        <label className="label">Payment Information</label>
        <div className="border border-gray-300 rounded-lg p-3">
          <PaymentElement />
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
        disabled={!stripe || processing}
        className={`w-full btn-primary ${!stripe || processing ? 'btn-disabled' : ''}`}
      >
        {processing ? 'Processing...' : `Donate $${Math.round(parseFloat(amount))}`}
      </button>
    </form>
  );
}
