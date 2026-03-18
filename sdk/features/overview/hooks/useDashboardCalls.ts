import { useState, useCallback, useEffect } from 'react';
import { getDashboardCalls } from '../api';
import { CallLog, CallSummary, GetDashboardCallsParams } from '../types';

export function useDashboardCalls(params?: GetDashboardCallsParams) {
    const [calls, setCalls] = useState<CallLog[]>([]);
    const [summary, setSummary] = useState<CallSummary[]>([]);
    const [stats, setStats] = useState<{
        countToday?: number;
        countYesterday?: number;
        countThisMonth?: number;
        countLastMonth?: number;
        answerRate?: number;
        answerRateLastWeek?: number;
    }>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchCalls = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getDashboardCalls(params);
            if (response.success && response.data) {
                setCalls(response.data.logs || []);
                setSummary(response.data.summary || []);
                setStats({
                    countToday: response.data.countToday,
                    countYesterday: response.data.countYesterday,
                    countThisMonth: response.data.countThisMonth,
                    countLastMonth: response.data.countLastMonth,
                    answerRate: response.data.answerRate,
                    answerRateLastWeek: response.data.answerRateLastWeek,
                });
            } else {
                setCalls([]);
                setSummary([]);
                setStats({});
            }
        } catch (err) {
            const errorObj = err instanceof Error ? err : new Error('Unknown error');
            setError(errorObj);
            setCalls([]);
            console.warn('Failed to fetch dashboard calls:', errorObj.message);
        } finally {
            setLoading(false);
        }
    }, [params]);

    useEffect(() => {
        fetchCalls();
    }, [fetchCalls]);

    return { calls, summary, stats, loading, error, refetch: fetchCalls };
}
