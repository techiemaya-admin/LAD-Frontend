"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAlerts } from '@/services/monitorApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { TimeRange, Alert } from '@/components/lad-monitor/types';

import { StatusBadge } from '@/components/lad-monitor/components/StatusBadge';
import { DashboardTab } from '@/components/lad-monitor/tabs/DashboardTab';
import { AlertsTab } from '@/components/lad-monitor/tabs/AlertsTab';
import { ActivitiesTab } from '@/components/lad-monitor/tabs/ActivitiesTab';
import { CloudLogsTab } from '@/components/lad-monitor/tabs/CloudLogsTab';
import { TenantsUsersTab } from '@/components/lad-monitor/tabs/TenantsUsersTab';
import { cn } from '@/lib/utils';

import { LayoutDashboard, Users, Bell, ScrollText, Cloud, Sun, Moon } from 'lucide-react';

const timeRanges: TimeRange[] = ['1h', '24h', '7d', '30d'];

export default function LadMonitorPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState(searchParams?.get('tab') || 'dashboard');
    const [timeRange, setTimeRange] = useState<TimeRange>('24h');
    const [isTenantSelected, setIsTenantSelected] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const tabFromUrl = searchParams?.get('tab');
        if (tabFromUrl && tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl);
        }
    }, [searchParams]);

    const onTabChange = (val: string) => {
        setActiveTab(val);
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('tab', val);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const { data: alertsData = [] } = useAlerts(true);
    const [localAlertOverrides, setLocalAlertOverrides] = useState<Record<string, Partial<Alert>>>({});

    const alerts = (alertsData || []).map((a: Alert) => ({
        ...a,
        ...(localAlertOverrides[a.id] || {})
    }));

    const [resolving, setResolving] = useState<Alert | null>(null);
    const [notes, setNotes] = useState('');

    const activeAlerts = alerts.filter((a: Alert) => a.status === 'active');
    const activeAlertsCount = activeAlerts.length;

    const handleResolve = () => {
        if (!resolving) return;
        setLocalAlertOverrides(prev => ({
            ...prev,
            [resolving.id]: { status: 'resolved' as const }
        }));
        setResolving(null);
        setNotes('');
    };

    const handleUpdateAlerts = (updater: any) => {
        if (typeof updater === 'function') {
            const updatedAlerts = updater(alerts);
            const newOverrides = { ...localAlertOverrides };
            updatedAlerts.forEach((a: Alert) => {
                if (localAlertOverrides[a.id]?.status !== a.status) {
                    newOverrides[a.id] = { ...newOverrides[a.id], status: a.status };
                }
            });
            setLocalAlertOverrides(newOverrides);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/80 dark:bg-[#0f172a] transition-colors duration-300">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 mb-8 pb-6 border-b border-slate-200/80">
                    <div className="flex items-center gap-4 shrink-0">
                        <h1 className="text-3xl font-bold tracking-tight text-[#172560] dark:text-white transition-colors">
                            System Monitor
                        </h1>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsDark(!isDark)}
                            className="text-muted-foreground hover:text-[#172560] hover:bg-muted/50 dark:hover:text-white"
                        >
                            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="relative text-muted-foreground hover:text-[#172560] hover:bg-muted/50 dark:hover:text-white"
                                >
                                    <Bell className={cn("h-5 w-5", activeAlertsCount > 0 && "text-[#172560] fill-[#172560]/10 dark:text-blue-400 dark:fill-blue-400/20")} />
                                    {activeAlertsCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background">
                                            {activeAlertsCount}
                                        </span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" align="end">
                                <div className="p-4 border-b">
                                    <h4 className="font-semibold text-sm">Alerts</h4>
                                    <p className="text-xs text-muted-foreground">You have {activeAlertsCount} unread alerts.</p>
                                </div>
                                <ScrollArea className="h-[300px]">
                                    {activeAlerts.length > 0 ? (
                                        <div className="divide-y">
                                            {activeAlerts.map((alert: Alert) => (
                                                <button
                                                    key={alert.id}
                                                    className="w-full text-left p-4 hover:bg-muted/50 transition-colors flex flex-col gap-1"
                                                    onClick={() => setResolving(alert)}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="text-xs font-semibold">{alert.category}</span>
                                                        <span className="text-[10px] text-muted-foreground">{alert.timestamp}</span>
                                                    </div>
                                                    <p className="text-sm font-medium line-clamp-1">{alert.title}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                                                    <div className="mt-1">
                                                        <StatusBadge status={alert.severity} />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-sm text-muted-foreground">
                                            No active alerts
                                        </div>
                                    )}
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6 w-full">
                    <div className="flex items-center justify-between gap-4">
                        <TabsList className="inline-flex h-auto p-1.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl gap-1">
                            <TabsTrigger
                                value="dashboard"
                                className="px-5 py-3 gap-2 rounded-lg font-medium transition-all duration-300 data-[state=active]:text-white data-[state=active]:bg-[#172560] data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:text-foreground dark:data-[state=active]:bg-blue-600 dark:data-[state=inactive]:text-slate-400 dark:hover:text-white"
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                <span>Dashboard</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="tenants"
                                className="px-5 py-3 gap-2 rounded-lg font-medium transition-all duration-300 data-[state=active]:text-white data-[state=active]:bg-[#172560] data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:text-foreground dark:data-[state=active]:bg-blue-600 dark:data-[state=inactive]:text-slate-400 dark:hover:text-white"
                            >
                                <Users className="h-4 w-4" />
                                <span>Tenants & Users</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="alerts"
                                className="px-5 py-3 gap-2 rounded-lg font-medium transition-all duration-300 data-[state=active]:text-white data-[state=active]:bg-[#172560] data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:text-foreground dark:data-[state=active]:bg-blue-600 dark:data-[state=inactive]:text-slate-400 dark:hover:text-white"
                            >
                                <Bell className="h-4 w-4" />
                                <span>Alerts</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="activities"
                                className="px-5 py-3 gap-2 rounded-lg font-medium transition-all duration-300 data-[state=active]:text-white data-[state=active]:bg-[#172560] data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:text-foreground dark:data-[state=active]:bg-blue-600 dark:data-[state=inactive]:text-slate-400 dark:hover:text-white"
                            >
                                <ScrollText className="h-4 w-4" />
                                <span>Activities</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="cloud-logs"
                                className="px-5 py-3 gap-2 rounded-lg font-medium transition-all duration-300 data-[state=active]:text-white data-[state=active]:bg-[#172560] data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:text-foreground dark:data-[state=active]:bg-blue-600 dark:data-[state=inactive]:text-slate-400 dark:hover:text-white"
                            >
                                <Cloud className="h-4 w-4" />
                                <span>Cloud Logs</span>
                            </TabsTrigger>
                        </TabsList>

                        {activeTab === 'tenants' && !isTenantSelected && (
                            <Tabs value={timeRange} onValueChange={(val) => setTimeRange(val as TimeRange)} className="h-auto shrink-0 animate-in fade-in slide-in-from-right-2 duration-300">
                                <TabsList className="h-10 p-1.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 shadow-sm rounded-xl gap-1">
                                    {timeRanges.map((r) => (
                                        <TabsTrigger
                                            key={r}
                                            value={r}
                                            className="h-7 min-w-[3rem] px-3 text-xs font-semibold data-[state=active]:bg-[#172560] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md"
                                        >
                                            {r}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        )}
                    </div>

                    <TabsContent value="dashboard" className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <DashboardTab
                            timeRange={timeRange}
                            isDark={isDark}
                            onViewAudit={() => setActiveTab('activities')}
                        />
                    </TabsContent>
                    <TabsContent value="tenants" className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <TenantsUsersTab timeRange={timeRange} onTenantSelect={setIsTenantSelected} isDark={isDark} />
                    </TabsContent>
                    <TabsContent value="alerts" className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <AlertsTab timeRange={timeRange} alerts={alerts} setAlerts={handleUpdateAlerts as any} setResolving={setResolving} />
                    </TabsContent>
                    <TabsContent value="activities" className="pt-2">
                        <ActivitiesTab />
                    </TabsContent>
                    <TabsContent value="cloud-logs" className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <CloudLogsTab />
                    </TabsContent>
                </Tabs>

                {/* Resolve Dialog */}
                <Dialog open={!!resolving} onOpenChange={() => setResolving(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                {resolving?.title}
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-2 pt-1">
                                <span>{resolving?.timestamp}</span>
                                <span>•</span>
                                <span className="font-medium">{resolving?.tenant}</span>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-2">
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={resolving?.severity} />
                                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{resolving?.category}</span>
                                </div>
                                <p className="text-foreground">{resolving?.message}</p>
                            </div>

                            <div className="space-y-2">
                                <span className="text-sm font-medium">Resolution Notes</span>
                                <Textarea
                                    placeholder="Describe how this issue was resolved..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={4}
                                    className="resize-none"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setResolving(null)}>Cancel</Button>
                            <Button onClick={handleResolve}>Resolve</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
