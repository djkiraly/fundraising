'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Printer, ArrowLeft, CheckCircle, Calendar, CreditCard, User, Hash } from 'lucide-react';

interface ReceiptData {
  transactionId: string;
  donorName: string | null;
  donorEmail: string | null;
  isAnonymous: boolean;
  playerName: string;
  playerSlug: string;
  playerId: string;
  totalAmount: string;
  paymentProvider: string;
  status: string;
  completedAt: string;
  createdAt: string;
  squareCount: number;
  squares: Array<{
    id: string;
    value: string;
    positionX: number;
    positionY: number;
  }>;
}

interface BrandingConfig {
  siteTitle: string;
  primaryColor: string;
  logoUrl: string | null;
}

export default function ReceiptPage() {
  const params = useParams();
  const transactionId = params.transactionId as string;

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch receipt data
        const receiptRes = await fetch(`/api/receipt/${transactionId}`);
        if (!receiptRes.ok) {
          const data = await receiptRes.json();
          throw new Error(data.error || 'Receipt not found');
        }
        const receiptData = await receiptRes.json();
        setReceipt(receiptData);

        // Fetch branding
        const brandingRes = await fetch('/api/config/public');
        if (brandingRes.ok) {
          const data = await brandingRes.json();
          setBranding(data.branding);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load receipt');
      } finally {
        setLoading(false);
      }
    }

    if (transactionId) {
      fetchData();
    }
  }, [transactionId]);

  const handlePrint = () => {
    window.print();
  };

  const siteTitle = branding?.siteTitle || 'Volleyball Fundraiser';
  const logoUrl = branding?.logoUrl;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-pink mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">!</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Receipt Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This receipt could not be found.'}</p>
          <Link href="/" className="btn-primary inline-block">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const completedDate = new Date(receipt.completedAt);
  const formattedDate = completedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = completedDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .receipt-container {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        {/* Action Buttons - Hidden on Print */}
        <div className="no-print max-w-2xl mx-auto mb-6 flex items-center justify-between">
          <Link
            href={receipt.playerSlug ? `/player/${receipt.playerSlug}` : '/'}
            className="flex items-center gap-2 text-gray-600 hover:text-primary-pink transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Return to Fundraiser</span>
          </Link>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary-pink text-white rounded-lg hover:bg-primary-pink-dark transition-colors"
          >
            <Printer className="w-5 h-5" />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* Receipt Card */}
        <div className="receipt-container max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-pink to-pink-400 px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={siteTitle}
                    width={48}
                    height={48}
                    className="object-contain bg-white rounded-lg p-1"
                  />
                ) : (
                  <Heart className="w-10 h-10 fill-current" />
                )}
                <div>
                  <h1 className="text-xl font-bold">{siteTitle}</h1>
                  <p className="text-pink-100 text-sm">Donation Receipt</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Payment Confirmed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          <div className="bg-green-50 border-b border-green-100 px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-green-800">Thank You for Your Donation!</h2>
                <p className="text-green-600 text-sm">Your support makes a real difference.</p>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="px-8 py-6 text-center border-b border-gray-100">
            <p className="text-gray-500 text-sm mb-1">Donation Amount</p>
            <p className="text-5xl font-bold text-primary-pink">${receipt.totalAmount}</p>
            {receipt.squareCount > 1 && (
              <p className="text-gray-500 text-sm mt-2">
                {receipt.squareCount} squares purchased
              </p>
            )}
          </div>

          {/* Details */}
          <div className="px-8 py-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Donor */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Donor</p>
                  <p className="font-semibold text-gray-900">
                    {receipt.isAnonymous ? 'Anonymous' : receipt.donorName || 'Anonymous'}
                  </p>
                  {!receipt.isAnonymous && receipt.donorEmail && (
                    <p className="text-sm text-gray-500">{receipt.donorEmail}</p>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                  <p className="font-semibold text-gray-900">{formattedDate}</p>
                  <p className="text-sm text-gray-500">{formattedTime}</p>
                </div>
              </div>

              {/* Player */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Supporting</p>
                  <p className="font-semibold text-gray-900">{receipt.playerName}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Method</p>
                  <p className="font-semibold text-gray-900 capitalize">{receipt.paymentProvider}</p>
                </div>
              </div>
            </div>

            {/* Transaction ID */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Hash className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Transaction ID</p>
                  <p className="font-mono text-sm text-gray-700 break-all">{receipt.transactionId}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-6 text-center">
            <p className="text-sm text-gray-600">
              Thank you for supporting our volleyball players! Your contribution helps them achieve their goals.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Please keep this receipt for your records.
            </p>
          </div>
        </div>

        {/* Return Link - Hidden on Print */}
        <div className="no-print max-w-2xl mx-auto mt-6 text-center">
          <Link
            href={receipt.playerSlug ? `/player/${receipt.playerSlug}` : '/'}
            className="text-primary-pink hover:text-primary-pink-dark font-medium"
          >
            Return to {receipt.playerName}&apos;s Fundraiser
          </Link>
        </div>
      </div>
    </>
  );
}
