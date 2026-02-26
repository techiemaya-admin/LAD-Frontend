import { useState, useCallback, useEffect } from 'react';
import { dashboardApiService } from '../services/api';
import { User } from '../types';

export function useTenantUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await dashboardApiService.getTenantUsers();
            if (response.success && response.data) {
                setUsers(response.data);
            } else {
                // Silently handle API not available - return empty users
                setUsers([]);
            }
        } catch (err) {
            // Silently handle errors - don't block UI
            const errorObj = err instanceof Error ? err : new Error('Unknown error');
            setError(errorObj);
            setUsers([]);
            console.warn('Failed to fetch users:', errorObj.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return { users, loading, error, refetch: fetchUsers };
}
