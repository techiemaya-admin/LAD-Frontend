/**
 * Environment Debug Utility
 * Use this to debug environment variable loading
 */

import { envConfig } from '../../../sdk/shared/config';

export function debugEnvironment() {
  console.log('=== Environment Debug Info ===');
  console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
  console.log('process.env.NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
  console.log('process.env.NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('');
  console.log('=== Resolved Configuration ===');
  console.log('envConfig:', envConfig);
  console.log('===============================');
}

// Auto-run debug in development
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  debugEnvironment();
}