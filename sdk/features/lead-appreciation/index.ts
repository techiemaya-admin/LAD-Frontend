/**
 * Lead Appreciation Feature - Frontend SDK Exports.
 *
 * Review queue + stats for appreciation DMs sent to accepted LinkedIn
 * connections when they post achievements. Backend:
 * LAD_backend/features/lead-appreciation (proxied via /api/lead-appreciation/*).
 *
 * Usage:
 *   import {
 *     useAppreciationSignals,
 *     useApproveAppreciationSignal,
 *     useRejectAppreciationSignal,
 *   } from '@lad/frontend-features/lead-appreciation';
 */
export * from './types';
export * from './api';
export * from './hooks';
