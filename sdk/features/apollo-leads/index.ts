/**
 * Apollo Leads Feature - Frontend Exports
 * 
 * Central export point for all Apollo-related frontend functionality.
 * Import from this file to use Apollo features in your application.
 * 
 * USAGE:
 * ```typescript
 * import { 
 *   apolloLeadsService,
 *   useApolloLeads,
 *   ApolloLeadsSearch 
 * } from '@/features/apollo-leads';
 * ```
 */

// ============================================================================
// SERVICES
// ============================================================================
export { apolloLeadsService, ApolloLeadsService } from './services/apolloLeadsService';
export { 
  getDecisionMakerPhones, 
  getDecisionMakerPhones as getDecisionMakerPhone, // Backward compatibility alias
  revealSinglePhone 
} from './services/apolloPhoneService';
export type {
  PhoneRevealRequest,
  PhoneRevealResponse
} from './services/apolloPhoneService';

// ============================================================================
// HOOKS
// ============================================================================
export { useApolloLeads } from './useApolloLeads';
// export { useApolloSearch } from './hooks/useApolloSearch';
// export { useApolloCredits } from './hooks/useApolloCredits';

// ============================================================================
// COMPONENTS
// ============================================================================
export { default as ApolloLeadsSearch } from './ApolloLeadsSearch';
// export { ApolloCompanyCard } from './components/ApolloCompanyCard';
// export { ApolloEmployeeList } from './components/ApolloEmployeeList';

// ============================================================================
// TYPES
// ============================================================================
export type {
  // Company Types
  ApolloCompany,
  ApolloLocation,
  ApolloSocialProfiles,
  
  // Person Types
  ApolloPerson,
  
  // Search Types
  ApolloSearchParams,
  ApolloSearchResponse,
  ApolloEmployeeSearchParams,
  ApolloEmployeeSearchResponse,
  
  // Credit & Billing
  ApolloCredits,
  ApolloUsageRecord,
  
  // API Response Types
  ApolloApiResponse,
  ApolloHealthResponse,
  
  // Feature Access
  ApolloFeatureAccess,
  
  // Hook Return Types
  UseApolloLeadsReturn,
  UseApolloSearchReturn,
  UseApolloCreditsReturn,
  
  // Service Interface
  ApolloLeadsServiceInterface,
  
  // Component Props
  ApolloLeadsSearchProps,
  ApolloCompanyCardProps,
  ApolloEmployeeListProps
} from './types/apollo.types';

// ============================================================================
// CONSTANTS
// ============================================================================
export const APOLLO_CREDIT_COSTS = {
  SEARCH: 1,
  EMAIL_REVEAL: 1,
  PHONE_REVEAL: 8
} as const;

export const APOLLO_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise'
} as const;
