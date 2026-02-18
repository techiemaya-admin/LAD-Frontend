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
  // 🔹 Demo chart data (replace with API data)
  const chartData = [
    { label: "Week 1", calls: 20 },
    { label: "Week 2", calls: 45 },
    { label: "Week 3", calls: 70 },
    { label: "Week 4", calls: Math.round(usedMinutes) },
  ];
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
          <div className="rounded-xl bg-muted/40 p-3 h-32">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Usage trend
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="40%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" hide />
                <YAxis hide />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorCalls)"
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* ================= Usage Progress ================= */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Minutes Used</span>
              <span className="font-medium">
                {Math.round(usedMinutes)} / {Math.round(totalMinutes)}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
          </div>
          
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
