import { useState, useCallback, useEffect } from 'react';
import { dashboardApiService } from '../services/api';
import { WalletStats } from '../types';

export function useWalletStats() {
    const [stats, setStats] = useState<WalletStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await dashboardApiService.getWalletStats();
            if (response.success && response.data) {
                setStats(response.data);
            } else {
                setStats(null);
            }
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error('Unknown error');
            setError(errorObj);
            setStats(null);
            console.warn('Failed to fetch wallet stats:', errorObj.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, error, refetch: fetchStats };
}
