'use client';
import React, { useState, useEffect } from 'react';
import { Check, CreditCard } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { useStripe } from '../contexts/StripeContext';
import { getApiBaseUrl } from '@/lib/api-utils';
interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number | string;
  priceInCents?: number;
  currency: string;
  interval: string;
  features: string[];
  usageBased?: boolean;
  isCustom?: boolean;
}
interface SubscriptionPlansProps {
  onPlanSelect?: (planId: string) => void;
  currentPlanId?: string;
}
export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  onPlanSelect,
  currentPlanId
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState<string | null>(null);
  const { stripeConfig } = useStripe();
  useEffect(() => {
    fetchPlans();
  }, []);
  const fetchPlans = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/stripe/subscription-plans`);
      if (!response.ok) {
        throw new Error('Failed to fetch subscription plans');
      }
      const plansData = await response.json();
      setPlans(plansData);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };
  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    setProcessingCheckout(planId);
    try {
      // Create checkout session
      const response = await fetch(`${getApiBaseUrl()}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/cancel`,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Checkout session error:', errorText);
        throw new Error(`Failed to create checkout session: ${errorText}`);
      }
      const { url } = await response.json();
      // Redirect to Stripe Checkout
      window.location.href = url;
      if (onPlanSelect) {
        onPlanSelect(planId);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout process. Please try again.');
    } finally {
      setProcessingCheckout(null);
    }
  };
  const formatPrice = (price: number | string, currency: string) => {
    if (price === 'custom' || typeof price === 'string') {
      return 'Custom';
    }
    if (price === 0) {
      return 'Pay As You Go';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price);
  };
  const getPlanBadge = (planId: string) => {
    switch (planId) {
      case 'payAsYouGo':
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-4">
            Most Popular
          </div>
        );
      case 'enterprise':
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mb-4">
            Custom Solutions
          </div>
        );
      default:
        return null;
    }
  };
  if (loading) {
    return (
      <LoadingSpinner size="md" message="Loading subscription plans..." />
    );
  }
  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Simple, scalable pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start with usage-based pricing or scale with enterprise solutions. No hidden fees, transparent billing.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-200 hover:shadow-xl flex flex-col ${
                currentPlanId === plan.id
                  ? 'ring-2 ring-blue-500'
                  : plan.id === 'payAsYouGo'
                  ? 'ring-2 ring-blue-200'
                  : ''
              }`}
            >
              {/* Plan Badge */}
              <div className="p-6 pb-4">
                {getPlanBadge(plan.id)}
              </div>
              {/* Plan Header */}
              <div className="px-6 pb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-6">
                  {plan.description}
                </p>
                <div className="flex items-baseline">
                  {typeof plan.price === 'number' && plan.price === 0 ? (
                    <div>
                      <span className="text-4xl font-bold text-gray-900">
                        Usage Based
                      </span>
                      <p className="text-sm text-gray-500 mt-2">
                        Only pay for what you use
                      </p>
                    </div>
                  ) : typeof plan.price === 'string' ? (
                    <div>
                      <span className="text-4xl font-bold text-gray-900">
                        Contact Sales
                      </span>
                      <p className="text-sm text-gray-500 mt-2">
                        Custom pricing for your needs
                      </p>
                    </div>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(plan.price, plan.currency)}
                      </span>
                      <span className="text-gray-600 ml-2">
                        /{plan.interval}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {/* Features */}
              <div className="px-6 pb-8">
                <ul className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* CTA Button */}
              <div className="px-6 pb-6 mt-auto">
                <button
                  onClick={() => plan.id === 'enterprise' ? window.location.href = '/contact' : handlePlanSelect(plan.id)}
                  disabled={processingCheckout === plan.id || currentPlanId === plan.id}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center ${
                    currentPlanId === plan.id
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : plan.id === 'payAsYouGo'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {processingCheckout === plan.id ? (
                    <LoadingSpinner inline size="sm" message="" />
                  ) : (
                    <CreditCard className="h-5 w-5 mr-2" />
                  )}
                  {currentPlanId === plan.id
                    ? 'Current Plan'
                    : processingCheckout === plan.id
                    ? 'Processing...'
                    : plan.id === 'enterprise'
                    ? 'Contact Sales'
                    : 'Get Started'
                  }
                </button>
              </div>
              {/* Current Plan Indicator */}
              {currentPlanId === plan.id && (
                <div className="absolute top-4 right-4">
                  <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    Current
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">
            Start with $5 free credits.
          </p>
          <p className="text-sm text-gray-500">
            Questions? <a href="/contact" className="text-blue-600 hover:text-blue-700">Contact our sales team</a> or join our <a href="/community" className="text-blue-600 hover:text-blue-700">Discord community</a>
          </p>
        </div>
      </div>
    </div>
  );
};