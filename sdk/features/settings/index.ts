/**
 * Settings Feature — Public SDK Exports
 * sdk/features/settings/index.ts
 *
 * Import in web/ components:
 *   import { useBusinessHours, useUpdateBusinessHours } from '@lad/frontend-features/settings';
 */

// Types
export type { BusinessHoursPayload, BusinessHoursRecord, BusinessHoursResponse } from './types';

// Hooks (primary interface for React components)
export { useBusinessHours, useUpdateBusinessHours } from './hooks';

// Raw API functions (non-React or SSR contexts)
export { getBusinessHours, updateBusinessHours } from './api';
