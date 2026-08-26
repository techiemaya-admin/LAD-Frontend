/**
 * Prospects Feature - Frontend SDK Exports.
 *
 * Reads from the LAD-Master-Agent service via /api/prospects/* proxy routes.
 *
 * Usage:
 *   import {
 *     useProspects,
 *     useProspect,
 *     useProspectEvents,
 *     type ProspectState,
 *     type ProspectEvent,
 *   } from '@lad/frontend-features/prospects';
 */

export * from './api';
export * from './types';
export { useProspect } from './hooks/useProspect';
export { useProspects } from './hooks/useProspects';
export { useProspectEvents } from './hooks/useProspectEvents';
export { useDeleteProspect } from './hooks/useDeleteProspect';
export { useEnrichProspect } from './hooks/useEnrichProspect';
export { useProspectAction } from './hooks/useProspectAction';
export { useProspectFollowups } from './hooks/useProspectFollowups';
