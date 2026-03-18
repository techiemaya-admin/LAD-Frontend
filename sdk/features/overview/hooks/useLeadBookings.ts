import { useState, useCallback, useEffect } from 'react';
import { getLeadBookings } from '../api';
import { LeadBooking, GetLeadBookingsParams } from '../types';

export function useLeadBookings(params?: GetLeadBookingsParams) {
    const [bookings, setBookings] = useState<LeadBooking[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getLeadBookings(params);
            if (response.success && response.data) {
                setBookings(response.data);
            } else {
                setBookings([]);
            }
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error('Unknown error');
            setError(errorObj);
            setBookings([]);
            console.warn('Failed to fetch bookings:', errorObj.message);
        } finally {
            setLoading(false);
        }
    }, [params]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    return { bookings, loading, error, refetch: fetchBookings };
}
