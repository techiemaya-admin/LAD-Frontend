import { useState, useCallback, useEffect } from 'react';
import { dashboardApiService } from '../services/api';
import { PhoneNumber } from '../types';

export function useAvailableNumbers() {
    const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchNumbers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await dashboardApiService.getAvailableNumbers();
            if (response.success && response.data) {
                setNumbers(response.data);
            } else {
                setNumbers([]);
            }
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error('Unknown error');
            setError(errorObj);
            setNumbers([]);
            console.warn('Failed to fetch available numbers:', errorObj.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNumbers();
    }, [fetchNumbers]);

    return { numbers, loading, error, refetch: fetchNumbers };
}
