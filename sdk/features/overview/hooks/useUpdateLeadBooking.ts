import { useState, useCallback } from 'react';
import { dashboardApiService } from '../services/api';
import { UpdateLeadBookingParams } from '../types';

export function useUpdateLeadBooking() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const update = useCallback(async (bookingId: string, data: UpdateLeadBookingParams) => {
        setLoading(true);
        setError(null);
        try {
            const response = await dashboardApiService.updateLeadBooking(bookingId, data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to update booking');
            }
            return response.data;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    return { update, loading, error };
}
