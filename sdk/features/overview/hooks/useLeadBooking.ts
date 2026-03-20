import { useState, useEffect } from 'react';
import { getLeadBookingById } from '../api';
import { LeadBooking } from '../types';

export function useLeadBooking(bookingId: string | null) {
    const [booking, setBooking] = useState<LeadBooking | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!bookingId) return;

        const fetchBooking = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await getLeadBookingById(bookingId);
                if (response.success && response.data) {
                    setBooking(response.data);
                } else {
                    throw new Error(response.error || 'Failed to fetch booking');
                }
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error'));
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [bookingId]);

    return { booking, loading, error };
}
