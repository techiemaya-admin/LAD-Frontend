'use client';

import React from 'react';
import { BillingDashboard } from '../BillingDashboard';

export const BillingSettings: React.FC = () => {
  // In a real application, you would get the customer ID from your authentication system
  // For now, we'll use a mock customer ID
  const customerId = 'cus_mock_customer_id';

  return (
    <div>
      <BillingDashboard customerId={customerId} />
    </div>
  );
};
