// components/settings/CreditsHighlightCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { useRouter } from "next/navigation";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface CreditsHighlightCardProps {
  balance?: number;
  totalMinutes?: number;
  remainingMinutes?: number;
  usageThisMonth?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function CreditsHighlightCard({ 
  balance = 0,
  totalMinutes = 0,
  remainingMinutes = 0,
  usageThisMonth = 0,
  onRefresh,
  isLoading = false
}: CreditsHighlightCardProps) {
  
  const router = useRouter();
  const usedThisMonth = Math.min(usageThisMonth, 100);
  const depletionForecast = Math.round((100 - usedThisMonth) / 3);

  const sparklineData = {
    labels: Array.from({ length: 7 }, (_, i) => i + 1),
    datasets: [
      {
        data: [15, 22, 31, 42, 50, 56, 60],
        borderWidth: 2,
        tension: 0.4,
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.15)",
        fill: true,
      },
    ],
  };

  return (
    <Card className="
      bg-transparent 
      border 
      border-gray-200/60 
      shadow-sm 
      rounded-2xl 
      backdrop-blur-sm
      transition-all 
      hover:shadow-md 
      hover:border-gray-300
    ">

      {/* HEADER */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>

            <div>
              <CardTitle className="text-lg font-semibold">Credits Overview</CardTitle>
              <CardDescription className="text-sm">
                Your balance, usage & forecast
              </CardDescription>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      {/* CONTENT */}
      <CardContent className="space-y-6">

        {/* CREDIT BALANCE */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm text-gray-500">Available balance</p>
            <p className="text-3xl font-bold text-blue-700">${balance.toFixed(2)}</p>
          </div>
        </div>

        {/* SPARKLINE */}
        <div className="h-16">
          <Line
            data={sparklineData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { enabled: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 } },
            }}
          />
        </div>

        {/* USAGE PROGRESS */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Monthly usage</span>
            <span className="font-medium">{usedThisMonth}%</span>
          </div>
          <Progress value={usedThisMonth} className="h-2" />
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4">
          
          <div className="p-3 rounded-xl border border-gray-200 bg-white/30 backdrop-blur-sm">
            <p className="text-xs text-gray-500">Remaining minutes</p>
            <p className="text-lg mt-1 font-medium">
              {Math.floor(remainingMinutes)} min
            </p>
          </div>
          
          <div className="p-3 rounded-xl border border-gray-200 bg-white/30 backdrop-blur-sm">
            <p className="text-xs text-gray-500">Forecast</p>
            <p className="text-lg mt-1 font-medium">{depletionForecast} days</p>
          </div>

        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            className="flex-1 rounded-full text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => router.push("/settings?tab=credits")}
          >
            View details
          </Button>

          <Button 
            size="sm"
            className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push("/settings?tab=credits#add-credits")}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add credits
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
