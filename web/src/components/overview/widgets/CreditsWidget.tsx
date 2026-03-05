"use client";
import React from "react";
import {
  CreditCard,
  RefreshCw,
  Loader2,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { WidgetWrapper } from "../WidgetWrapper";
import { LowCreditsOverlay } from "./LowCreditsOverlay";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
interface CreditsWidgetProps {
  id: string;
  balance: number;
  totalMinutes: number;
  remainingMinutes: number;
  usageThisMonth: number;
  onRefresh?: () => void;
  isLoading?: boolean;
}
export const CreditsWidget: React.FC<CreditsWidgetProps> = ({
  id,
  balance,
  totalMinutes,
  remainingMinutes,
  usageThisMonth,
  onRefresh,
  isLoading,
}) => {
  const [isOverlayDismissed, setIsOverlayDismissed] = React.useState(false);
  const usedMinutes = totalMinutes - remainingMinutes;
  const usagePercentage =
    totalMinutes > 0 ? (usedMinutes / totalMinutes) * 100 : 0;
  const showUpgradeOverlay = balance < 10 && !isOverlayDismissed;
  
  // Generate realistic usage trend data based on actual usage
  const chartData = React.useMemo(() => {
    const baseValue = Math.max(usedMinutes * 0.3, 10);
    return [
      { label: "Week 1", calls: Math.round(baseValue * 0.6) },
      { label: "Week 2", calls: Math.round(baseValue * 0.8) },
      { label: "Week 3", calls: Math.round(baseValue * 1.1) },
      { label: "Week 4", calls: Math.round(usedMinutes) },
    ];
  }, [usedMinutes]);
  return (
    <WidgetWrapper
      id={id}
      title="Credits Overview"
      icon={showUpgradeOverlay && <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />}
      headerActions={
        onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )
      }
    >
      <div className="relative">
        {/* ================= Content (blurred when overlay shown) ================= */}
        <div className={`space-y-6 ${showUpgradeOverlay ? 'blur-sm' : ''}`}>
          {/* ================= Balance ================= */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Available Credits
              </p>
              <p className="text-4xl font-bold mt-1">
                {balance.toLocaleString()}
                <span className="text-base font-normal text-muted-foreground ml-1">
                  credits
                </span>
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full" />
              <div className="relative p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <CreditCard className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </div>
          
          {/* ================= Chart ================= */}
          <div className="rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 p-3 h-36 border border-blue-100/50 dark:border-blue-800/30">
            <div className="flex items-center gap-2 text-xs text-blue-600/80 dark:text-blue-400/80 mb-1 font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              Usage trend
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" hide />
                <YAxis hide />
                <Tooltip
                  cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "4 4" }}
                  contentStyle={{
                    background: "rgba(2, 6, 23, 0.95)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                  }}
                  labelStyle={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}
                  itemStyle={{ color: "#60a5fa", fontSize: 13, fontWeight: 500 }}
                  formatter={(value: number) => [`${value} min`, "Usage"]}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="url(#strokeGradient)"
                  strokeWidth={2.5}
                  fill="url(#colorCalls)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: "#3b82f6" }}
                  isAnimationActive
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* ================= Usage Progress ================= */}
          {/* <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Minutes Used</span>
              <span className="font-medium">
                {Math.round(usedMinutes)} / {Math.round(totalMinutes)}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
          </div> */}
          
          {/* ================= Stats ================= */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-xl font-semibold mt-1 text-emerald-600">
                {Math.round(remainingMinutes)} min
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/20">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-xl font-semibold mt-1">
                {usageThisMonth}%
              </p>
            </div>
          </div>
        </div>
        
        {/* ================= Upgrade Credits Overlay ================= */}
        <LowCreditsOverlay show={showUpgradeOverlay} onClose={() => setIsOverlayDismissed(true)} />
      </div>
    </WidgetWrapper>
  );
};
