/**
 * Apollo Leads Components - Barrel Export
 * 
 * Main export point for all apollo-leads-related UI components.
 * 
 * ARCHITECTURE NOTE: Per LAD Architecture Guidelines:
 * - Business logic (api.ts, hooks.ts, types.ts) lives in: sdk/features/apollo-leads/
 * - UI components live here: web/src/components/apollo-leads/
 * 
 * USAGE:
 * ```typescript
 * import { ApolloLeadsSearch } from '@/components/apollo-leads';
 * import { searchApolloLeads, type ApolloLead } from '@lad/frontend-features/apollo-leads'; // SDK imports
 * ```
 */

export { default as ApolloLeadsSearch } from './ApolloLeadsSearch';
