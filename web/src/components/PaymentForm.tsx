'use client';
import React, { useState, useEffect } from 'react';
import { Elements, CardElement, useElements, useStripe as useStripeHook } from '@stripe/react-stripe-js';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { useStripe } from '../contexts/StripeContext';
import { getApiBaseUrl } from '@/lib/api-utils';
interface PaymentFormProps {
  amount: number;
  description?: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: string) => void;
}
const PaymentFormInner: React.FC<PaymentFormProps> = ({
  amount,
  description = 'Payment',
  onSuccess,
  onError,
}) => {
  const stripe = useStripeHook();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  useEffect(() => {
    createPaymentIntent();
  }, [amount]);
  const createPaymentIntent = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/stripe/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to cents
          description,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      const { clientSecret } = await response.json();
      setClientSecret(clientSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    }
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements || !clientSecret) {
      return;
    }
    setProcessing(true);
    setError(null);
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card information is required');
      setProcessing(false);
      return;
    }
    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });
      if (stripeError) {
        throw new Error(stripeError.message);
      }
      if (paymentIntent?.status === 'succeeded') {
        if (onSuccess) onSuccess(paymentIntent);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Complete Your Payment
        </h3>
        <p className="text-gray-600">
          {description} - {formatAmount(amount)}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border border-gray-300 rounded-lg p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
        {error && (
          <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}
        <button
          type="submit"
          disabled={!stripe || processing || !clientSecret}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          {processing ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <CreditCard className="h-5 w-5 mr-2" />
          )}
          {processing ? 'Processing...' : `Pay ${formatAmount(amount)}`}
        </button>
      </form>
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          Your payment is secured by Stripe
        </p>
      </div>
    </div>
  );
};
export const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  const { stripe, loading, error } = useStripe();
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading payment form...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-center text-red-600 mb-4">
          <AlertCircle className="h-8 w-8 mr-2" />
          <span className="text-lg font-medium">Payment Unavailable</span>
        </div>
        <p className="text-gray-600 text-center">{error}</p>
      </div>
    );
  }
  if (!stripe) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Initializing payment system...</span>
      </div>
    );
  }
  return (
    <Elements stripe={stripe}>
      <PaymentFormInner {...props} />
    </Elements>
  );
};