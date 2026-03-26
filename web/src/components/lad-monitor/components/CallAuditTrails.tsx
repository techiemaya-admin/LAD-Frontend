"use client";
import React, { useMemo, useState } from 'react';
import { Search, Filter, Phone, Activity, Shield, DollarSign, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CallAuditTrailsProps {
    calls: any[];
}

interface AuditEvent {
    id: string;
    timestamp: string;
    eventType: string;
    agent: string;
    lead: string;
    detail: string;
    severity: 'Info' | 'Success' | 'Warning' | 'Error';
}

function formatDuration(seconds: number): string {
    if (!seconds || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
}

export function CallAuditTrails({ calls }: CallAuditTrailsProps) {
    const [search, setSearch] = useState('');
    const [eventTypeFilter, setEventTypeFilter] = useState('All Events');
    const [severityFilter, setSeverityFilter] = useState('All Severity');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const events = useMemo(() => {
        const generatedEvents: AuditEvent[] = [];
        let eventIdCounter = 1;

        calls.forEach(c => {
            const agent = c.agentName || c.agent_name || c.voice_agent_name || '-';
            const lead = c.leadName || c.lead_name || '-';
            const callType = c.type || c.call_type || c.direction || 'outbound';
            const ts = c.startedAt || c.started_at || c.createdAt || c.created_at || new Date().toISOString();

            // Event 1: Call Initiated
            generatedEvents.push({
                id: `evt-${eventIdCounter++}`,
                timestamp: ts,
                eventType: 'Call Initiated',
                agent,
                lead,
                detail: `${callType.toLowerCase()} call started by agent "${agent}"`,
                severity: 'Info'
            });

            // Event 2: Status Changed
            if (c.status) {
                const sLower = c.status.toLowerCase();
                let sev: AuditEvent['severity'] = 'Info';
                if (['ended', 'completed', 'success'].includes(sLower)) sev = 'Success';
                else if (['failed', 'error', 'busy', 'no-answer'].includes(sLower)) sev = 'Error';

                generatedEvents.push({
                    id: `evt-${eventIdCounter++}`,
                    timestamp: ts,
                    eventType: 'Status Changed',
                    agent,
                    lead,
                    detail: `Call status updated to "${c.status}" after ${formatDuration(c.duration || c.duration_seconds || 0)}`,
                    severity: sev
                });
            }

            // Event 3: Lead Categorised
            const temp = c.leadTemp || c.temperature || c.leadCategory || c.analysis_lead_category || c.lead_temp;
            if (temp) {
                generatedEvents.push({
                    id: `evt-${eventIdCounter++}`,
                    timestamp: ts,
                    eventType: 'Lead Categorised',
                    agent,
                    lead,
                    detail: `Lead "${lead}" categorised as ${temp} based on call analysis`,
                    severity: 'Warning'
                });
            }

            // Event 4: Cost Recorded
            if (c.cost !== undefined && c.cost !== null) {
                generatedEvents.push({
                    id: `evt-${eventIdCounter++}`,
                    timestamp: ts,
                    eventType: 'Cost Recorded',
                    agent,
                    lead,
                    detail: `Cost of $${parseFloat(c.cost).toFixed(2)} recorded for call with "${lead}"`,
                    severity: 'Info'
                });
            }

            // Event 5: Call Ended
            if (c.status && ['ended', 'completed', 'success'].includes(c.status.toLowerCase())) {
                generatedEvents.push({
                    id: `evt-${eventIdCounter++}`,
                    timestamp: ts,
                    eventType: 'Call Ended',
                    agent,
                    lead,
                    detail: `Call with "${lead}" concluded successfully`,
                    severity: 'Success'
                });
            }
        });

        // Sort by timestamp descending
        return generatedEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [calls]);

    const counts = {
        'Call Initiated': events.filter(e => e.eventType === 'Call Initiated').length,
        'Status Changed': events.filter(e => e.eventType === 'Status Changed').length,
        'Lead Categorised': events.filter(e => e.eventType === 'Lead Categorised').length,
        'Cost Recorded': events.filter(e => e.eventType === 'Cost Recorded').length,
        'Call Ended': events.filter(e => e.eventType === 'Call Ended').length,
    };

    const filteredEvents = events.filter(e => {
        const sm = !search ||
            e.agent.toLowerCase().includes(search.toLowerCase()) ||
            e.lead.toLowerCase().includes(search.toLowerCase()) ||
            e.detail.toLowerCase().includes(search.toLowerCase());
        const em = eventTypeFilter === 'All Events' || e.eventType === eventTypeFilter;
        const svm = severityFilter === 'All Severity' || e.severity === severityFilter;
        return sm && em && svm;
    });

    const totalFiltered = filteredEvents.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const pageStart = (currentPage - 1) * pageSize;
    const pagedEvents = filteredEvents.slice(pageStart, pageStart + pageSize);

    const fmtDate = (dString: string) => {
        const d = new Date(dString);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getEventTypeBadge = (type: string) => {
        switch (type) {
            case 'Call Initiated': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100"><Phone className="w-3 h-3" /> Call Initiated</span>;
            case 'Status Changed': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-600 border border-purple-100"><Activity className="w-3 h-3" /> Status Changed</span>;
            case 'Lead Categorised': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-600 border border-orange-100"><Shield className="w-3 h-3" /> Lead Categorised</span>;
            case 'Cost Recorded': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100"><DollarSign className="w-3 h-3" /> Cost Recorded</span>;
            case 'Call Ended': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200"><CheckCircle className="w-3 h-3" /> Call Ended</span>;
            default: return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200">{type}</span>;
        }
    };

    const getSeverityBadge = (sev: string) => {
        switch (sev) {
            case 'Info': return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Info</span>;
            case 'Success': return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Success</span>;
            case 'Warning': return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-600"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Warning</span>;
            case 'Error': return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Error</span>;
            default: return <span>{sev}</span>;
        }
    };

    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mt-6">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Audit Trails</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{events.length} events derived from {calls.length} call records</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                className="pl-9 pr-4 h-9 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-full md:w-56 focus:outline-none focus:ring-1 focus:ring-[#172560] dark:text-white placeholder:text-slate-400"
                                placeholder="Search audit events..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                        <Select value={eventTypeFilter} onValueChange={v => { setEventTypeFilter(v); setCurrentPage(1); }}>
                            <SelectTrigger className="h-9 w-36 rounded-xl border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 dark:text-white"><SelectValue placeholder="All Events" /></SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                <SelectItem value="All Events">All Events</SelectItem>
                                <SelectItem value="Call Initiated">Call Initiated</SelectItem>
                                <SelectItem value="Status Changed">Status Changed</SelectItem>
                                <SelectItem value="Lead Categorised">Lead Categorised</SelectItem>
                                <SelectItem value="Cost Recorded">Cost Recorded</SelectItem>
                                <SelectItem value="Call Ended">Call Ended</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={severityFilter} onValueChange={v => { setSeverityFilter(v); setCurrentPage(1); }}>
                            <SelectTrigger className="h-9 w-36 rounded-xl border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 dark:text-white"><SelectValue placeholder="All Severity" /></SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                <SelectItem value="All Severity">All Severity</SelectItem>
                                <SelectItem value="Info">Info</SelectItem>
                                <SelectItem value="Success">Success</SelectItem>
                                <SelectItem value="Warning">Warning</SelectItem>
                                <SelectItem value="Error">Error</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-5">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Call Initiated</span>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-white leading-none">{counts['Call Initiated']}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Status Changed</span>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-white leading-none">{counts['Status Changed']}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Lead Categorised</span>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-white leading-none">{counts['Lead Categorised']}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Cost Recorded</span>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-white leading-none">{counts['Cost Recorded']}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Call Ended</span>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-white leading-none">{counts['Call Ended']}</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <TableHead className="py-4 pl-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12">#</TableHead>
                            <TableHead className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timestamp</TableHead>
                            <TableHead className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Type</TableHead>
                            <TableHead className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agent</TableHead>
                            <TableHead className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lead</TableHead>
                            <TableHead className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detail</TableHead>
                            <TableHead className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Severity</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pagedEvents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-sm text-slate-500 dark:text-slate-400">No events found</TableCell>
                            </TableRow>
                        ) : pagedEvents.map((e, index) => (
                            <TableRow key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800">
                                <TableCell className="pl-5 py-3.5 text-xs text-slate-400">{pageStart + index + 1}</TableCell>
                                <TableCell className="py-3.5">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                        <Activity className="h-3 w-3" />
                                        {fmtDate(e.timestamp)}
                                    </div>
                                </TableCell>
                                <TableCell className="py-3.5">{getEventTypeBadge(e.eventType)}</TableCell>
                                <TableCell className="py-3.5 text-sm font-bold text-slate-800 dark:text-white">{e.agent}</TableCell>
                                <TableCell className="py-3.5 text-sm text-slate-600 dark:text-slate-400">{e.lead}</TableCell>
                                <TableCell className="py-3.5 text-xs text-slate-600 dark:text-slate-300 max-w-md truncate">{e.detail}</TableCell>
                                <TableCell className="py-3.5">{getSeverityBadge(e.severity)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {totalFiltered > 0 && (
                <div className="flex items-center justify-between px-5 py-4 bg-slate-50/50 dark:bg-[#1e293b] border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                        Showing <span className="font-bold text-slate-700 dark:text-white">{pageStart + 1}</span> to <span className="font-bold text-slate-700 dark:text-white">{Math.min(pageStart + pageSize, totalFiltered)}</span> of <span className="font-bold text-slate-700 dark:text-white">{totalFiltered}</span> calls
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">Page size:</span>
                            <Select value={pageSize.toString()} onValueChange={v => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                <SelectTrigger className="h-8 w-[70px] text-xs font-bold rounded-lg border-slate-200 dark:border-slate-700 bg-white"><SelectValue placeholder={pageSize.toString()} /></SelectTrigger>
                                <SelectContent className="dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    {[10, 20, 50, 100].map(s => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <span className="text-[13px] text-slate-500 font-medium dark:text-slate-400">Page <span className="font-bold text-slate-700 dark:text-white">{currentPage}</span> of <span className="font-bold text-slate-700 dark:text-white">{totalPages}</span></span>
                        <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm bg-white dark:bg-slate-800">
                            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 border-r border-slate-200 dark:border-slate-700">«</button>
                            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 border-r border-slate-200 dark:border-slate-700">‹</button>
                            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 border-r border-slate-200 dark:border-slate-700">›</button>
                            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30">»</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
