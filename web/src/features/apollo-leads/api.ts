/**
 * Apollo Leads Feature - Web Layer Barrel Re-export
 * 
 * This file serves as a barrel re-export of SDK apollo-leads functionality.
 * 
 * ARCHITECTURE NOTE: Per LAD Architecture Guidelines:
 * - Business logic (api.ts, types.ts, hooks.ts) lives in: sdk/features/apollo-leads/
 * - UI components live in: web/src/components/apollo-leads/
 * - This barrel simply re-exports from SDK for convenience
 * 
 * USAGE:
 * Import SDK types and hooks from here:
 * ```typescript
 * import { searchApolloLeads, type ApolloLead } from '@lad/frontend-features/apollo-leads';
 * ```
 * 
 * Import UI components from web/src/components/apollo-leads directly:
 * ```typescript
 * import { ApolloLeadsSearch } from '@/components/apollo-leads';
 * ```
 */

export * from '@lad/frontend-features/apollo-leads';

