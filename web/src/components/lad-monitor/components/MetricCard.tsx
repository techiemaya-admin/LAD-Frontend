"use client";
import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: { value: number; direction: 'up' | 'down' };
    iconContainerClassName?: string;
}

export function MetricCard({ label, value, icon, trend, iconContainerClassName }: MetricCardProps) {
    return (
        <Card className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100/60 dark:border-slate-800 shadow-sm p-4 flex flex-col justify-between min-h-[110px] transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div className="flex justify-end">
                <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                    iconContainerClassName,
                    "dark:bg-opacity-10 dark:border-opacity-20"
                )}>
                    {icon}
                </div>
            </div>

            <div>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wider">
                    {label}
                </p>
                <div className="flex items-end justify-between">
                    <p className="text-xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">
                        {value}
                    </p>
                    {trend && (
                        <div className={cn(
                            'flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                            trend.direction === 'up'
                                ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                                : 'text-red-500 bg-red-50 dark:bg-red-500/10'
                        )}>
                            {trend.direction === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {trend.value}%
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
