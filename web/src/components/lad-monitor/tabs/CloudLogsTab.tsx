"use client";
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitorApi } from '@/services/monitorApi';
import {
    AlertCircle, AlertTriangle, Info, CheckCircle2, RefreshCw,
    ChevronLeft, ChevronRight, Search, Filter, Settings,
    Cloud, Server, Clock, Terminal, ExternalLink, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────

interface CloudLogEntry {
    id: string;
    timestamp: string | null;
    severity: 'DEFAULT' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'DEBUG';
    message: string;
    service: string;
    revision: string;
    location: string;
    httpMethod: string | null;
    httpUrl: string | null;
    httpStatus: number | null;
    latencyMs: number | null;
    rawData: Record<string, unknown> | null;
}

interface CloudLogsResponse {
    entries: CloudLogEntry[];
    nextPageToken: string | null;
    error?: string;
}

const SEVERITIES = [
    { value: '', label: 'All Severities' },
    { value: 'DEBUG', label: 'Debug' },
    { value: 'INFO', label: 'Info' },
    { value: 'WARNING', label: 'Warning' },
    { value: 'ERROR', label: 'Error' },
    { value: 'CRITICAL', label: 'Critical' },
];

// ── Severity helpers ─────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
    const map: Record<string, { bg: string; text: string; icon: JSX.Element; label: string }> = {
        CRITICAL: {
            bg: 'bg-red-100 dark:bg-red-500/20',
            text: 'text-red-700 dark:text-red-400',
            icon: <AlertCircle className="w-3 h-3" />,
            label: 'Critical',
        },
        ERROR: {
            bg: 'bg-red-50 dark:bg-red-500/10',
            text: 'text-red-600 dark:text-red-400',
            icon: <AlertCircle className="w-3 h-3" />,
            label: 'Error',
        },
        WARNING: {
            bg: 'bg-yellow-50 dark:bg-yellow-500/10',
            text: 'text-yellow-700 dark:text-yellow-400',
            icon: <AlertTriangle className="w-3 h-3" />,
            label: 'Warning',
        },
        INFO: {
            bg: 'bg-blue-50 dark:bg-blue-500/10',
            text: 'text-blue-700 dark:text-blue-400',
            icon: <Info className="w-3 h-3" />,
            label: 'Info',
        },
        DEBUG: {
            bg: 'bg-slate-100 dark:bg-slate-700',
            text: 'text-slate-600 dark:text-slate-400',
            icon: <Terminal className="w-3 h-3" />,
            label: 'Debug',
        },
        DEFAULT: {
            bg: 'bg-slate-50 dark:bg-slate-800',
            text: 'text-slate-500 dark:text-slate-500',
            icon: <CheckCircle2 className="w-3 h-3" />,
            label: 'Default',
        },
    };

    const style = map[severity] || map.DEFAULT;
    return (
        <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide',
            style.bg, style.text
        )}>
            {style.icon}
            {style.label}
        </span>
    );
}

function HttpStatusBadge({ status }: { status: number }) {
    const color = status >= 500 ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10'
        : status >= 400 ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10'
            : status >= 300 ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10'
                : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10';
    return (
        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums', color)}>
            {status}
        </span>
    );
}

// ── Setup Banner ─────────────────────────────────────────────────────────

function SetupBanner() {
    return (
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-8 space-y-6">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <Cloud className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">Connect Google Cloud Logging</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Fetch real-time Cloud Run logs directly into this dashboard.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                    {
                        step: '1',
                        title: 'Create Service Account',
                        desc: 'Cloud Console → IAM & Admin → Service Accounts → Create with Logs Viewer role',
                    },
                    {
                        step: '2',
                        title: 'Download Key + Add to .env',
                        desc: 'Generate JSON key → place as log-reader-key.json in project root → add GCP_PROJECT_ID to .env',
                    },
                    {
                        step: '3',
                        title: 'Restart Backend',
                        desc: 'Run: npm run server — logs will appear here automatically',
                    },
                ].map(s => (
                    <div key={s.step} className="bg-white dark:bg-slate-900/50 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800 space-y-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">{s.step}</div>
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{s.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{s.desc}</p>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 font-mono text-xs text-emerald-400 space-y-1">
                <p className="text-slate-500"># .env additions needed:</p>
                <p>GCP_PROJECT_ID=your-project-id</p>
                <p>GCP_KEY_FILE=./log-reader-key.json   <span className="text-slate-500"># optional if using ADC</span></p>
            </div>
        </div>
    );
}

// ── Log Entry Row ────────────────────────────────────────────────────────

function LogRow({ entry }: { entry: CloudLogEntry }) {
    const [expanded, setExpanded] = useState(false);

    const fmtTime = (ts: string | null) => {
        if (!ts) return '—';
        const d = new Date(ts);
        return d.toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
        });
    };

    const copyMessage = () => {
        navigator.clipboard.writeText(entry.message || '');
        toast.success('Copied to clipboard');
    };

    const isError = ['ERROR', 'CRITICAL'].includes(entry.severity);

    return (
        <div className={cn(
            'border-b border-slate-100 dark:border-slate-800 transition-colors',
            isError ? 'bg-red-50/30 dark:bg-red-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
        )}>
            <div
                className="flex items-start gap-3 px-4 py-3 cursor-pointer select-none"
                onClick={() => setExpanded(e => !e)}
            >
                {/* Timestamp */}
                <span className="text-[11px] text-slate-400 dark:text-slate-600 tabular-nums whitespace-nowrap mt-0.5 w-36 flex-shrink-0">
                    {fmtTime(entry.timestamp)}
                </span>

                {/* Severity */}
                <div className="flex-shrink-0 mt-0.5">
                    <SeverityBadge severity={entry.severity} />
                </div>

                {/* Service */}
                {entry.service && (
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded whitespace-nowrap mt-0.5 hidden sm:inline-flex">
                        <Server className="w-2.5 h-2.5 mr-1 inline" />
                        {entry.service}
                    </span>
                )}

                {/* HTTP info */}
                {entry.httpMethod && (
                    <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap hidden md:inline-block',
                        entry.httpMethod === 'GET' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : entry.httpMethod === 'POST' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                    )}>
                        {entry.httpMethod}
                    </span>
                )}
                {entry.httpStatus && <HttpStatusBadge status={entry.httpStatus} />}

                {/* Message */}
                <p className={cn(
                    'flex-1 text-[12px] font-mono leading-relaxed line-clamp-2',
                    isError ? 'text-red-700 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
                )}>
                    {entry.message || <span className="text-slate-400 italic">No message</span>}
                </p>

                {/* Latency */}
                {entry.latencyMs != null && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-600 whitespace-nowrap flex-shrink-0 hidden lg:block">
                        <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                        {entry.latencyMs.toFixed(0)}ms
                    </span>
                )}

                {/* Copy button */}
                <button
                    onClick={e => { e.stopPropagation(); copyMessage(); }}
                    className="text-slate-300 hover:text-slate-600 dark:hover:text-white transition-colors flex-shrink-0 mt-0.5"
                    title="Copy message"
                >
                    <Copy className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div className="px-4 pb-4 space-y-2">
                    {entry.httpUrl && (
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all bg-slate-100 dark:bg-slate-900 rounded-lg px-3 py-2">
                            <span className="text-slate-400">URL </span>
                            {entry.httpUrl}
                            <a href={entry.httpUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="ml-2 text-blue-500 hover:text-blue-700 inline-flex">
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </p>
                    )}
                    {entry.revision && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-500">
                            Revision: <span className="font-mono text-slate-700 dark:text-slate-300">{entry.revision}</span>
                            {entry.location && <> · Location: <span className="font-mono text-slate-700 dark:text-slate-300">{entry.location}</span></>}
                        </p>
                    )}
                    {entry.rawData && (
                        <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-900 dark:bg-slate-950 text-emerald-400 rounded-xl px-4 py-3 overflow-x-auto max-h-64">
                            {JSON.stringify(entry.rawData, null, 2)}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main CloudLogsTab ────────────────────────────────────────────────────

export function CloudLogsTab() {
    const [severity, setSeverity] = useState('');
    const [service, setService] = useState('');
    const [search, setSearch] = useState('');
    const [pageTokenStack, setPageTokenStack] = useState<(string | null)[]>([null]);
    const currentPageIdx = pageTokenStack.length - 1;

    // Config check
    const { data: configData } = useQuery({
        queryKey: ['cloudLogConfig'],
        queryFn: () => monitorApi.getCloudLogConfig(),
        staleTime: 60000,
    });

    const configured = (configData as any)?.configured;

    // Services list
    const { data: servicesData } = useQuery({
        queryKey: ['cloudLogServices'],
        queryFn: () => monitorApi.getCloudLogServices(),
        enabled: !!configured,
        staleTime: 60000,
    });
    const services: string[] = (servicesData as any)?.services || [];

    // Log entries
    const { data: logsData, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['cloudLogs', severity, service, pageTokenStack[currentPageIdx]],
        queryFn: () => monitorApi.getCloudLogs({
            limit: 50,
            severity: severity || undefined,
            service: service || undefined,
            pageToken: pageTokenStack[currentPageIdx] || undefined,
        }),
        enabled: !!configured,
        staleTime: 0,
    });

    const logs = logsData as CloudLogsResponse | undefined;
    const entries: CloudLogEntry[] = logs?.entries || [];
    const hasNextPage = !!logs?.nextPageToken;
    const hasPrevPage = currentPageIdx > 0;

    const filtered = search
        ? entries.filter(e =>
            e.message?.toLowerCase().includes(search.toLowerCase()) ||
            e.service?.toLowerCase().includes(search.toLowerCase()) ||
            e.httpUrl?.toLowerCase().includes(search.toLowerCase())
        )
        : entries;

    const nextPage = useCallback(() => {
        if (logs?.nextPageToken) {
            setPageTokenStack(s => [...s, logs.nextPageToken!]);
        }
    }, [logs]);

    const prevPage = useCallback(() => {
        setPageTokenStack(s => s.slice(0, -1));
    }, []);

    const resetFilters = () => {
        setSeverity('');
        setService('');
        setSearch('');
        setPageTokenStack([null]);
    };

    // Severity counts from current page
    const counts = entries.reduce((acc, e) => {
        acc[e.severity] = (acc[e.severity] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Cloud className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">Cloud Run Logs</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {configured
                                    ? `Live logs from Google Cloud · Project: ${(configData as any)?.projectId}`
                                    : 'GCP credentials not configured'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {configured && (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Connected
                            </div>
                        )}
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Severity pill stats */}
                {configured && entries.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {[['CRITICAL', 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'],
                        ['ERROR', 'bg-red-50  dark:bg-red-500/10  text-red-600 dark:text-red-400'],
                        ['WARNING', 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'],
                        ['INFO', 'bg-blue-50  dark:bg-blue-500/10  text-blue-700 dark:text-blue-400'],
                        ['DEBUG', 'bg-slate-100 dark:bg-slate-700   text-slate-600 dark:text-slate-400'],
                        ].map(([sev, cls]) => counts[sev] ? (
                            <button
                                key={sev}
                                onClick={() => setSeverity(severity === sev ? '' : sev)}
                                className={cn(
                                    'px-3 py-1 rounded-full text-[11px] font-bold transition-all border-2',
                                    cls,
                                    severity === sev ? 'border-current' : 'border-transparent'
                                )}
                            >
                                {sev} · {counts[sev]}
                            </button>
                        ) : null)}
                    </div>
                )}

                {/* Filters */}
                {configured && (
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search messages, URLs..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>

                        <select
                            value={severity}
                            onChange={e => { setSeverity(e.target.value); setPageTokenStack([null]); }}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>

                        {services.length > 0 && (
                            <select
                                value={service}
                                onChange={e => { setService(e.target.value); setPageTokenStack([null]); }}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="">All Services</option>
                                {services.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        )}

                        {(severity || service || search) && (
                            <button
                                onClick={resetFilters}
                                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Setup or Log Table */}
            {!configured ? (
                <SetupBanner />
            ) : (
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    {/* Table header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-36">Timestamp</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-20">Severity</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex-1">Message</span>
                    </div>

                    {/* Rows */}
                    {isLoading ? (
                        <div className="py-20 text-center">
                            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">Fetching logs from Cloud Run...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center space-y-2">
                            <Cloud className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No log entries found</p>
                            <p className="text-xs text-slate-400 dark:text-slate-600">Try adjusting severity or service filters</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-transparent">
                            {filtered.map(entry => <LogRow key={entry.id} entry={entry} />)}
                        </div>
                    )}

                    {/* Pagination */}
                    {(hasPrevPage || hasNextPage) && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
                            <button
                                onClick={prevPage}
                                disabled={!hasPrevPage}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Previous
                            </button>
                            <span className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                                Page {currentPageIdx + 1} · {filtered.length} entries
                            </span>
                            <button
                                onClick={nextPage}
                                disabled={!hasNextPage}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {logs?.error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-red-700 dark:text-red-400">Fetch Error</p>
                        <p className="text-xs text-red-600 dark:text-red-500 mt-0.5 font-mono">{logs.error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
