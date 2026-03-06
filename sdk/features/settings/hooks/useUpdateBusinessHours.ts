import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BusinessHoursPayload, BusinessHoursRecord } from '../types';
import * as settingsApi from '../api';
import { BH_QUERY_KEY } from './useBusinessHours';

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



