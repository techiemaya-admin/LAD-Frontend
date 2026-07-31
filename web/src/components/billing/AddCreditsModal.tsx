'use client';
import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useCreditPackages, useStripeCheckout } from '@lad/frontend-features/billing';
import { logger } from '@/lib/logger';
import { safeStorage } from '@lad/shared/storage';

/**
 * The single Add Credits popup for the whole app.
 *
 * Packages come from GET /api/wallet/packages (backend creditPackages.js),
 * never from a hardcoded list here — the backend is what actually grants the
 * credits after payment, so anything hardcoded on this side can promise a
 * number the wallet won't honour. That drift is exactly how the old $999
 * option came to advertise 12,000 credits while granting 24,024.
 *
 * One click on a package goes straight to Stripe Checkout; the user still
 * reviews and confirms the charge on Stripe's own page.
 */

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  /** Set by the backend on the package we want to steer people toward. */
  popular?: boolean;
  description?: string;
}

interface AddCreditsModalProps {
  open: boolean;
  onClose: () => void;
}

/** "$0.033 / credit" — the comparison that makes the bigger packs legible. */
function perCredit(pkg: CreditPackage): string {
  if (!pkg.credits) return '—';
  return `$${(pkg.price / pkg.credits).toFixed(3)} / credit`;
}

export const AddCreditsModal: React.FC<AddCreditsModalProps> = ({ open, onClose }) => {
  const { data: packages, isLoading } = useCreditPackages();
  const { mutate: createCheckout } = useStripeCheckout();
  // Which package is mid-redirect. Kept per-package so only the clicked card
  // shows a spinner, and so a second click can't open two checkout sessions.
  const [buyingId, setBuyingId] = useState<string | null>(null);

  if (!open) return null;

  const list: CreditPackage[] = Array.isArray(packages) ? packages : [];
  // Cheapest per credit last — the list reads as an upgrade path.
  const sorted = [...list].sort((a, b) => a.price - b.price);

  const handleBuy = (pkg: CreditPackage) => {
    if (buyingId) return;

    const token = safeStorage.getItem('token');
    if (!token) {
      alert('Please log in to proceed with payment');
      return;
    }

    setBuyingId(pkg.id);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      createCheckout(
        {
          amount: pkg.price,
          successUrl: `${origin}/settings?tab=credits&payment=success`,
          cancelUrl: `${origin}/settings?tab=credits&payment=cancelled`,
          // Only the package id — the backend derives the credit count from
          // its own table and overrides anything we send here.
          metadata: { packageId: pkg.id },
        },
        {
          onError: (error: unknown) => {
            setBuyingId(null);
            logger.error('Error processing payment', {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            alert(`Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
          },
        },
      );
    } catch (error) {
      setBuyingId(null);
      logger.error('Error processing payment', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      alert(`Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add Credits"
    >
      <div
        className="bg-white dark:bg-[#030a21] rounded-lg p-6 max-w-md w-full mx-4 border border-transparent dark:border-blue-950/50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add Credits</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Pick a pack to go straight to checkout.
        </p>

        {isLoading ? (
          <div className="py-10 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Loading packages...
          </div>
        ) : sorted.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Credit packages are unavailable right now. Please try again shortly.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sorted.map((pkg) => {
              const isBuying = buyingId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  onClick={() => handleBuy(pkg)}
                  disabled={!!buyingId}
                  className={`relative p-4 border-2 rounded-lg transition-colors text-center disabled:cursor-not-allowed ${
                    pkg.popular
                      ? 'border-blue-600 dark:border-blue-500'
                      : 'border-gray-200 dark:border-blue-950/40 hover:border-blue-400 dark:hover:border-blue-900/60'
                  } ${buyingId && !isBuying ? 'opacity-50' : ''}`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  )}
                  {isBuying ? (
                    <div className="h-[76px] flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {pkg.credits.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">credits</p>
                      <p className="text-sm text-gray-700 dark:text-white mt-1 font-medium">${pkg.price}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pkg.name}</p>
                      <p className="mt-1 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                        {perCredit(pkg)}
                      </p>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
