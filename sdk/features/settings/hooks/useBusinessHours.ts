import { useQuery } from '@tanstack/react-query';
import type { BusinessHoursRecord } from '../types';
import * as settingsApi from '../api';

export const BH_QUERY_KEY = ['settings', 'businessHours'] as const;

/**
 * Fetches current business hours for the authenticated tenant.
 * Refetches on window focus so the UI always shows the persisted value.
 */
export function useBusinessHours() {
    return useQuery<BusinessHoursRecord, Error>({
        queryKey: BH_QUERY_KEY,
        queryFn: settingsApi.getBusinessHours,
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
}
\n