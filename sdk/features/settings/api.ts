/**
 * Settings Feature — API Client
 * sdk/features/settings/api.ts
 *
 * NOTE on URL construction:
 * apiClient uses new URL(path, baseURL) internally.
 * baseURL = "http://localhost:3004/api"  (no trailing slash)
 *
 * Because `new URL('/path', 'http://host/api')` treats a leading '/'
 * as absolute from the origin — it IGNORES the /api segment.
 * So paths MUST include /api to produce the correct full URL:
 *   new URL('/api/settings/business-hours', 'http://localhost:3004/api')
 *   → http://localhost:3004/api/settings/business-hours  ✅
 */

import { apiClient } from '../../shared/apiClient';
import type { BusinessHoursPayload, BusinessHoursRecord, BusinessHoursResponse } from './types';

export type { BusinessHoursPayload, BusinessHoursRecord, BusinessHoursResponse };

/**
 * GET /api/settings/business-hours
 */
export async function getBusinessHours(): Promise<BusinessHoursRecord> {
    const response = await apiClient.get<BusinessHoursResponse>('/api/settings/business-hours');
    return response.data.data;
}

/**
 * PATCH /api/settings/business-hours
 */
export async function updateBusinessHours(
    payload: BusinessHoursPayload,
): Promise<BusinessHoursRecord> {
    const response = await apiClient.patch<BusinessHoursResponse>(
        '/api/settings/business-hours',
        payload,
    );
    return response.data.data;
}
