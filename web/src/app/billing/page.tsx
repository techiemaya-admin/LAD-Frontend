'use client';

import React from 'react';
import { BillingDashboard } from '../../components/BillingDashboard';

export default function BillingPage() {
  // In a real application, you would get the customer ID from your authentication system
  // For now, we'll use a mock customer ID
  const customerId = 'cus_mock_customer_id';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
          <p className="text-lg text-gray-600">
            Manage your subscription, payment methods, and billing history.
          </p>
        </div>

        <BillingDashboard customerId={customerId} />
      </div>
    </div>
  );
}