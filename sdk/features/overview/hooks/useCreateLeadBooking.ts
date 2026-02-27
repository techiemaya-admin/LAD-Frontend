import { useState, useCallback } from 'react';
import { dashboardApiService } from '../services/api';
import { CreateLeadBookingParams } from '../types';

export function useCreateLeadBooking() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const create = useCallback(async (data: CreateLeadBookingParams) => {
        setLoading(true);
        setError(null);
        try {
            const response = await dashboardApiService.createLeadBooking(data);
            if (!response.success) {
                throw new Error(response.error || 'Failed to create booking');
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

    return { create, loading, error };
}
