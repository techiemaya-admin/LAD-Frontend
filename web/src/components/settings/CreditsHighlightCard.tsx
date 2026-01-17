// components/settings/CreditsHighlightCard.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, RefreshCw, TrendingUp, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import { useRouter } from "next/navigation";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

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
  const [mounted, setMounted] = useState(false);
  const usedThisMonth = Math.min(usageThisMonth, 100);
  const depletionForecast = Math.round((100 - usedThisMonth) / 3);
  const usagePercentage = Math.min(usedThisMonth, 100);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sparklineData = {
    labels: Array.from({ length: 7 }, (_, i) => i + 1),
    datasets: [
      {
        data: [15, 22, 31, 42, 50, 56, 60],
        borderWidth: 2.5,
        tension: 0.4,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.12)",
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const getBalanceStatus = (bal: number) => {
    if (bal >= 100) return { color: "text-green-600", bg: "bg-green-50", label: "Healthy" };
    if (bal >= 50) return { color: "text-blue-600", bg: "bg-blue-50", label: "Good" };
    if (bal >= 20) return { color: "text-yellow-600", bg: "bg-yellow-50", label: "Low" };
    return { color: "text-red-600", bg: "bg-red-50", label: "Critical" };
  };

  const status = getBalanceStatus(balance);

  return (
    <div className="w-full animate-fade-in">
      <Card className={`
        relative overflow-hidden
        bg-white
        border border-gray-200/60
        shadow-lg shadow-gray-200/20
        rounded-2xl
        transition-all duration-300
        hover:shadow-xl hover:shadow-gray-200/30
        ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}>
        
        <div className="relative z-10">
          {/* HEADER */}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              
              <div className="flex items-center gap-4">
                <div className={`
                  p-3 rounded-2xl 
                  bg-gradient-to-br from-blue-500 to-indigo-600
                  shadow-lg shadow-blue-500/30
                  transform transition-transform duration-300 hover:scale-110
                `}>
                  <Sparkles className="h-6 w-6 text-white" />
                </div>

                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">Credits Overview</CardTitle>
                  <CardDescription className="text-sm text-gray-600 mt-0.5">
                    Your balance, usage & forecast
                  </CardDescription>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onRefresh}
                disabled={isLoading}
                className={`
                  h-10 w-10 text-gray-500 hover:text-blue-600 
                  hover:bg-blue-100/50 rounded-full
                  transition-all duration-300
                  ${isLoading ? "animate-spin" : ""}
                `}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          {/* CONTENT */}
          <CardContent className="space-y-6">

            {/* CREDIT BALANCE - Enhanced */}
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Available Balance</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-4xl font-bold ${status.color} transition-all duration-300`}>
                      ${balance.toFixed(2)}
                    </p>
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-semibold
                      ${status.bg} ${status.color}
                      transition-all duration-300
                    `}>
                      {status.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SPARKLINE */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">7-Day Trend</p>
              <div className="h-20 bg-white/40 backdrop-blur-sm rounded-xl p-2 border border-white/50 shadow-sm">
                <Line
                  data={sparklineData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { display: false }, 
                      tooltip: { 
                        enabled: true,
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        padding: 12,
                        borderRadius: 8,
                        titleFont: { size: 13, weight: "600" },
                        bodyFont: { size: 12 },
                      } 
                    },
                    scales: { 
                      x: { display: false }, 
                      y: { display: false, min: 0, max: 100 } 
                    },
                  }}
                />
              </div>
            </div>

            {/* USAGE PROGRESS - Enhanced */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Monthly Usage</span>
                <span className={`
                  text-sm font-bold transition-all duration-300
                  ${usagePercentage > 80 ? "text-red-600" : usagePercentage > 50 ? "text-yellow-600" : "text-green-600"}
                `}>
                  {usedThisMonth.toFixed(0)}%
                </span>
              </div>
              <div className="relative h-3 bg-gray-200/50 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`
                    h-full rounded-full transition-all duration-700 ease-out
                    bg-gradient-to-r
                    ${usagePercentage > 80 ? "from-red-500 to-red-600" : 
                      usagePercentage > 50 ? "from-yellow-500 to-yellow-600" : 
                      "from-green-500 to-emerald-600"}
                  `}
                  style={{ 
                    width: `${usagePercentage}%`,
                    boxShadow: `0 0 20px ${usagePercentage > 80 ? "rgba(239, 68, 68, 0.6)" : 
                      usagePercentage > 50 ? "rgba(234, 179, 8, 0.6)" : 
                      "rgba(34, 197, 94, 0.6)"}`
                  }}
                />
              </div>
            </div>

            {/* STATS - Enhanced with animations */}
            <div className="grid grid-cols-2 gap-4">
              
              <div className={`
                group p-4 rounded-xl border border-blue-200/50 
                bg-gradient-to-br from-blue-50/80 to-blue-100/40
                backdrop-blur-sm
                transform transition-all duration-300
                hover:shadow-md hover:border-blue-300/80 hover:scale-105
              `}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Remaining Minutes</p>
                    <p className="text-xl font-bold text-blue-700">
                      {Math.floor(remainingMinutes).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">min available</p>
                  </div>
                  <Clock className="h-4 w-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              
              <div className={`
                group p-4 rounded-xl border border-purple-200/50 
                bg-gradient-to-br from-purple-50/80 to-purple-100/40
                backdrop-blur-sm
                transform transition-all duration-300
                hover:shadow-md hover:border-purple-300/80 hover:scale-105
              `}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Depletion Forecast</p>
                    <p className="text-xl font-bold text-purple-700">
                      {depletionForecast}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">days remaining</p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

            </div>

            {/* ACTION BUTTONS - Enhanced */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline"
                className={`
                  flex-1 rounded-lg
                  border-2 border-blue-200 text-blue-600
                  hover:bg-blue-50 hover:border-blue-400
                  transition-all duration-300
                  font-medium
                  active:scale-95
                `}
                onClick={() => router.push("/settings?tab=credits")}
              >
                View details
              </Button>

              <Button 
                className={`
                  flex-1 rounded-lg
                  bg-gradient-to-r from-blue-600 to-indigo-600
                  hover:from-blue-700 hover:to-indigo-700
                  shadow-lg shadow-blue-500/30
                  transition-all duration-300
                  font-medium
                  hover:shadow-xl hover:shadow-blue-500/40
                  active:scale-95
                `}
                onClick={() => router.push("/settings?tab=credits#add-credits")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add credits
              </Button>
            </div>

          </CardContent>
        </div>
      </Card>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        :global(.animate-fade-in) {
          animation: fadeIn 0.6s ease-out;
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
      `}</style>
    </div>
  );
}
