"use client";
import { useState, useMemo, useEffect } from 'react';
import { useRecentActivities } from '@/services/monitorApi';
import {
    Clock,
    MessageSquare,
    Phone,
    UserPlus,
    Zap,
    Search,
    Filter,
    ArrowUpRight,
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RecentActivity } from '@/components/lad-monitor/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function ActivitiesTab() {
    const { data: activities = [], isLoading } = useRecentActivities() as { data: RecentActivity[], isLoading: boolean };
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'campaign' | 'voice' | 'lead'>('all');

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [search, sourceFilter, pageSize]);

    const filteredActivities = useMemo(() => {
        return activities.filter(act => {
            const matchesSearch =
                act.title?.toLowerCase().includes(search.toLowerCase()) ||
                act.description?.toLowerCase().includes(search.toLowerCase()) ||
                act.meta?.toLowerCase().includes(search.toLowerCase());

            const matchesSource = sourceFilter === 'all' || act.source === sourceFilter;

            return matchesSearch && matchesSource;
        });
    }, [activities, search, sourceFilter]);

    const totalPages = Math.ceil(filteredActivities.length / pageSize);
    const paginatedActivities = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredActivities.slice(start, start + pageSize);
    }, [filteredActivities, page, pageSize]);

    const getIcon = (source: string) => {
        switch (source) {
            case 'campaign': return <MessageSquare className="w-5 h-5 text-blue-500" />;
            case 'voice': return <Phone className="w-5 h-5 text-emerald-500" />;
            case 'lead': return <UserPlus className="w-5 h-5 text-violet-500" />;
            default: return <Zap className="w-5 h-5 text-amber-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'success':
            case 'completed':
            case 'delivered':
                return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
            case 'error':
            case 'failed':
                return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
            case 'pending':
            case 'running':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
            default:
                return 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Full Audit Log</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1 uppercase tracking-[0.1em]">Comprehensive history of all system events</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search audit events..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all w-64 dark:text-white"
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className={cn(
                                "p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2",
                                sourceFilter !== 'all' && "border-indigo-500 ring-2 ring-indigo-500/10"
                            )}>
                                <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                {sourceFilter !== 'all' && (
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest px-1 bg-indigo-50 dark:bg-indigo-500/10 rounded">
                                        {sourceFilter}
                                    </span>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-1 shadow-2xl rounded-2xl" align="end">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 dark:text-slate-500 p-3 pb-2">Filter Source</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 mx-1" />
                            <DropdownMenuItem onClick={() => setSourceFilter('all')} className="flex items-center justify-between py-2.5 px-3 focus:bg-slate-50 dark:focus:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">All Sources</span>
                                {sourceFilter === 'all' && <Check className="w-4 h-4 text-indigo-500" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSourceFilter('campaign')} className="flex items-center justify-between py-2.5 px-3 focus:bg-slate-50 dark:focus:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Campaigns</span>
                                </div>
                                {sourceFilter === 'campaign' && <Check className="w-4 h-4 text-indigo-500" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSourceFilter('voice')} className="flex items-center justify-between py-2.5 px-3 focus:bg-slate-50 dark:focus:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Voice Agents</span>
                                </div>
                                {sourceFilter === 'voice' && <Check className="w-4 h-4 text-indigo-500" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSourceFilter('lead')} className="flex items-center justify-between py-2.5 px-3 focus:bg-slate-50 dark:focus:bg-slate-800/50 rounded-xl cursor-pointer group transition-colors">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                                        <UserPlus className="w-3.5 h-3.5 text-violet-500" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Incoming Leads</span>
                                </div>
                                {sourceFilter === 'lead' && <Check className="w-4 h-4 text-indigo-500" />}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Timestamp</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Source</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Event</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Status</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Details</th>
                                <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {isLoading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-8 py-6 h-16 bg-slate-50/20 dark:bg-slate-800/10"></td>
                                    </tr>
                                ))
                            ) : paginatedActivities.length > 0 ? (
                                paginatedActivities.map((act) => (
                                    <tr key={act.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/60 transition-colors group">
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
                                                        {new Date(act.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 ml-5">
                                                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn(
                                                    "w-7 h-7 rounded-lg flex items-center justify-center border",
                                                    act.source === 'campaign' ? "bg-blue-50 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20" :
                                                        act.source === 'voice' ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20" :
                                                            "bg-violet-50 border-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20"
                                                )}>
                                                    {getIcon(act.source)}
                                                </div>
                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                                    {act.source}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {act.title}
                                                </span>
                                                {act.meta && (
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight mt-0.5">
                                                        {act.meta}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-[11px] font-bold">
                                            <span className={cn('px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border', getStatusColor(act.status))}>
                                                {act.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-0.5 max-w-[250px]">
                                                <p className="text-[12px] text-slate-600 dark:text-slate-300 font-bold line-clamp-1">
                                                    {act.description}
                                                </p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                                                    {act.source === 'campaign' ? 'LinkedIn Channel' : act.source === 'voice' ? 'AI Voice Agent' : 'System Intake'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                                                <ArrowUpRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                            {search || sourceFilter !== 'all' ? 'No matching logs found' : 'No audit logs found'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-8 py-5 border-t border-slate-50 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 dark:bg-slate-900/50">
                    <div className="text-[13px] text-slate-500 dark:text-slate-400">
                        Showing <span className="font-bold text-slate-900 dark:text-white">{(page - 1) * pageSize + 1}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min(page * pageSize, filteredActivities.length)}</span> of <span className="font-bold text-slate-900 dark:text-white">{filteredActivities.length}</span> logs
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] text-slate-500 dark:text-slate-400">Page size:</span>
                            <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
                                <SelectTrigger className="w-[70px] h-9 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    {[10, 20, 50, 100].map(size => (
                                        <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="text-[13px] text-slate-500 dark:text-slate-400">
                            Page <span className="font-bold text-slate-900 dark:text-white">{filteredActivities.length > 0 ? page : 0}</span> of <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
                        </div>

                        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <button
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-r border-slate-200 dark:border-slate-800"
                                title="First page"
                            >
                                <ChevronsLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-r border-slate-200 dark:border-slate-800"
                                title="Previous page"
                            >
                                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || totalPages === 0}
                                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-r border-slate-200 dark:border-slate-800"
                                title="Next page"
                            >
                                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                            <button
                                onClick={() => setPage(totalPages)}
                                disabled={page === totalPages || totalPages === 0}
                                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Last page"
                            >
                                <ChevronsRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
