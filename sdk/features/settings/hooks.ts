/**
 * Settings Feature — React Hooks
 * sdk/features/settings/hooks.ts
 *
 * web/ components must import from here — never call api.ts directly.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BusinessHoursPayload, BusinessHoursRecord } from './types';
import * as settingsApi from './api';

const BH_QUERY_KEY = ['settings', 'businessHours'] as const;

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

/**
 * Mutation to persist updated business hours.
 * On success: updates the cached query immediately.
 */
export function useUpdateBusinessHours(options?: {
    onSuccess?: (data: BusinessHoursRecord) => void;
    onError?: (error: Error) => void;
}) {
    const queryClient = useQueryClient();

    return useMutation<BusinessHoursRecord, Error, BusinessHoursPayload>({
        mutationFn: settingsApi.updateBusinessHours,
        onSuccess: (data) => {
            queryClient.setQueryData(BH_QUERY_KEY, data);
            queryClient.invalidateQueries({ queryKey: BH_QUERY_KEY });
            options?.onSuccess?.(data);
        },
        onError: (error) => {
            options?.onError?.(error);
        },
    });
}
