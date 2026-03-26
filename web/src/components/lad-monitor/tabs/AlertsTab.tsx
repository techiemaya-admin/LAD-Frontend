"use client";
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '../components/StatusBadge';
import type { Alert, TimeRange } from '../types';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface AlertsTabProps {
    timeRange: TimeRange;
    alerts: Alert[];
    setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
    setResolving: (alert: Alert | null) => void;
}

export function AlertsTab({ timeRange, alerts, setAlerts, setResolving }: AlertsTabProps) {
    const [statusFilter, setStatusFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');

    const filtered = alerts.filter((a) => {
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
        if (timeRange === '1h' && !a.timestamp.includes('min')) return false;
        if (timeRange === '24h' && (a.timestamp.includes('day') || a.timestamp.includes('week'))) return false;
        if (timeRange === '7d' && a.timestamp.includes('week')) return false;
        return true;
    });

    const counts = {
        critical: alerts.filter((a) => a.severity === 'critical' && a.status === 'active').length,
        warning: alerts.filter((a) => a.severity === 'warning' && a.status === 'active').length,
        info: alerts.filter((a) => a.severity === 'info' && a.status === 'active').length,
    };

    const handleAcknowledge = (id: string) => {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'acknowledged' as const } : a)));
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="bg-white dark:bg-[#1e293b] border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px] h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg dark:text-white">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={severityFilter} onValueChange={setSeverityFilter}>
                            <SelectTrigger className="w-[150px] h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg dark:text-white">
                                <SelectValue placeholder="All Severity" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                <SelectItem value="all">All Severity</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="warning">Warning</SelectItem>
                                <SelectItem value="info">Info</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-2">
                        <Badge className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 font-semibold px-3 py-1 rounded-full text-xs">
                            {counts.critical} Critical
                        </Badge>
                        <Badge className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-semibold px-3 py-1 rounded-full text-xs">
                            {counts.warning} Warning
                        </Badge>
                        <Badge className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-semibold px-3 py-1 rounded-full text-xs">
                            {counts.info} Info
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-3">
                {filtered.map((a) => (
                    <Card
                        key={a.id}
                        className={cn(
                            'bg-white dark:bg-[#1e293b] border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md overflow-hidden border-l-4',
                            a.severity === 'critical' ? 'border-l-red-500'
                                : a.severity === 'warning' ? 'border-l-amber-400'
                                    : 'border-l-blue-400'
                        )}
                    >
                        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-2 min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className={cn(
                                        'h-2 w-2 rounded-full flex-shrink-0',
                                        a.severity === 'critical' ? 'bg-red-500 animate-pulse'
                                            : a.severity === 'warning' ? 'bg-amber-400'
                                                : 'bg-blue-400'
                                    )} />
                                    <span className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-tight">{a.title}</span>
                                    <Badge variant="outline" className={cn(
                                        'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full',
                                        a.status === 'active' ? 'border-red-200 dark:border-red-500/20 text-red-500 bg-red-50 dark:bg-red-500/10'
                                            : a.status === 'acknowledged' ? 'border-amber-200 dark:border-amber-500/20 text-amber-600 bg-amber-50 dark:bg-amber-500/10'
                                                : 'border-green-200 dark:border-green-500/20 text-green-600 bg-green-50 dark:bg-green-500/10'
                                    )}>
                                        {a.status}
                                    </Badge>
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{a.message}</p>

                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    <span className="text-[#172560] dark:text-blue-400">{a.tenant}</span>
                                    <span>•</span>
                                    <span>{a.timestamp}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 shrink-0">
                                {a.status === 'active' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleAcknowledge(a.id)}
                                        className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white rounded-xl h-9 px-4 text-xs font-semibold"
                                    >
                                        Acknowledge
                                    </Button>
                                )}
                                {a.status !== 'resolved' && (
                                    <Button
                                        size="sm"
                                        onClick={() => setResolving(a)}
                                        className="bg-[#172560] dark:bg-blue-600 hover:bg-[#172560]/90 dark:hover:bg-blue-700 text-white font-semibold rounded-xl h-9 px-4 text-xs shadow-lg shadow-black/5"
                                    >
                                        Take Action
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1e293b]/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-widest">All clear — no alerts found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
