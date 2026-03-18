import { useState, useCallback, useEffect } from 'react';
import { getAvailableAgents } from '../api';
import { VoiceAgent } from '../types';

export function useAvailableAgents() {
    const [agents, setAgents] = useState<VoiceAgent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchAgents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAvailableAgents();
            if (response.success && response.data) {
                setAgents(response.data);
            } else {
                setAgents([]);
            }
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error('Unknown error');
            setError(errorObj);
            setAgents([]);
            console.warn('Failed to fetch available agents:', errorObj.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    return { agents, loading, error, refetch: fetchAgents };
}
