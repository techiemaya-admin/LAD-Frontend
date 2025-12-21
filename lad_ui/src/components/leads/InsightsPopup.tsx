import React from 'react';
import {
  X,
  Sparkles,
  TrendingUp,
  TrendingDown,
  LineChart,
  Lightbulb,
  GaugeCircle,
  Flame,
  Star,
  Trophy,
  Clock4,
  MessageCircle,
  Brain,
  Timeline,
} from 'lucide-react';

// Mock data for insights
export const insightsMockData = {
  leadId: "24",
  leadName: "Prem Kumar",
  engagementTrends: {
    currentWeek: 85,
    lastWeek: 72,
    trend: "up",
    percentageChange: 18
  },
  behaviorAnalysis: {
    mostActiveTime: "Weekday Evenings (6-9 PM)",
    preferredChannel: "Facebook Messenger",
    responseRate: 92,
    averageResponseTime: "2.5 hours",
    interactionFrequency: "High"
  },
  interestSignals: [
    { category: "Product Interest", signal: "Viewed laptop specs 15 times", strength: "high", color: "error" },
    { category: "Price Sensitivity", signal: "Compared 5 different models", strength: "medium", color: "warning" },
    { category: "Purchase Intent", signal: "Asked about financing options", strength: "high", color: "success" },
  ],
  aiRecommendations: [
    {
      title: "Optimal Contact Time",
      description: "Best time to reach out is weekday evenings between 6-9 PM for higher engagement.",
      priority: "high",
      icon: Timeline
    },
    {
      title: "Personalized Offer",
      description: "Lead shows strong interest in gaming laptops. Recommend highlighting GPU performance and cooling systems.",
      priority: "high",
      icon: Lightbulb
    },
    {
      title: "Financing Discussion",
      description: "Customer has shown interest in payment plans. Prepare flexible financing options for next conversation.",
      priority: "medium",
      icon: Brain
    },
  ],
  sentimentAnalysis: {
    overall: "Positive",
    score: 78,
    keywords: ["interested", "excited", "considering", "budget-conscious"]
  },
  conversionPrediction: {
    likelihood: 75,
    timeframe: "7-14 days",
    confidence: "High"
  }
};

const InsightsPopup = ({ open, onClose }) => {
  if (!open) return null;

  const insights = insightsMockData;

  const progressWidth = (value: number) => ({ width: `${Math.min(100, Math.max(0, value))}%` });

  const priorityStyles: Record<string, string> = {
    high: 'border-rose-300 bg-rose-50 text-rose-600',
    medium: 'border-amber-300 bg-amber-50 text-amber-600',
    low: 'border-sky-300 bg-sky-50 text-sky-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-4 border-b border-slate-100 bg-white px-6 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">AI-Powered Customer Insights</h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Deep analysis for {insights.leadName} • ID {insights.leadId}
            </p>
          </div>
        </div>

        <div className="space-y-6 bg-slate-50 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Week Score</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-2xl font-semibold text-indigo-700">{insights.engagementTrends.currentWeek}%</span>
                    {insights.engagementTrends.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-rose-500" />
                    )}
                  </div>
                </div>
                <LineChart className="h-6 w-6 text-indigo-500" />
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400" style={progressWidth(insights.engagementTrends.currentWeek)} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Last week: {insights.engagementTrends.lastWeek}%</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                  +{insights.engagementTrends.percentageChange}%
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Conversion Prediction</p>
                  <span className="mt-2 block text-2xl font-semibold text-emerald-600">
                    {insights.conversionPrediction.likelihood}%
                  </span>
                </div>
                <Trophy className="h-6 w-6 text-amber-500" />
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-emerald-500" style={progressWidth(insights.conversionPrediction.likelihood)} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full border border-slate-200 px-2 py-1">Timeframe: {insights.conversionPrediction.timeframe}</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-600">
                  Confidence: {insights.conversionPrediction.confidence}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <GaugeCircle className="h-5 w-5" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Behavior Analysis</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-400">Most Active Time</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{insights.behaviorAnalysis.mostActiveTime}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-400">Preferred Channel</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{insights.behaviorAnalysis.preferredChannel}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-400">Response Rate</p>
                <p className="mt-1 text-sm font-semibold text-emerald-600">{insights.behaviorAnalysis.responseRate}%</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-xs uppercase tracking-wide text-slate-400">Avg Response</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{insights.behaviorAnalysis.averageResponseTime}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Flame className="h-5 w-5 text-rose-500" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Interest Signals</h3>
              </div>
              <div className="mt-4 space-y-3">
                {insights.interestSignals.map((signal, index) => (
                  <div key={signal.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">{signal.category}</span>
                      <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold uppercase text-slate-500">
                        {signal.strength}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{signal.signal}</p>
                    {index < insights.interestSignals.length - 1 && <div className="h-px w-full bg-slate-100" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Star className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sentiment Analysis</h3>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Overall sentiment</span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
                  {insights.sentimentAnalysis.overall}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" style={progressWidth(insights.sentimentAnalysis.score)} />
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Keywords</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {insights.sentimentAnalysis.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Lightbulb className="h-5 w-5 text-indigo-500" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI Recommendations</h3>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {insights.aiRecommendations.map((rec) => (
                <div
                  key={rec.title}
                  className={`space-y-2 rounded-2xl border px-3 py-4 text-sm ${priorityStyles[rec.priority] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}
                >
                  <div className="flex items-center gap-2 text-slate-600">
                    <rec.icon className="h-4 w-4" />
                    <span className="font-semibold text-slate-700">{rec.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600/80">{rec.description}</p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/40 px-2 py-1 text-[11px] font-semibold uppercase">
                    Priority: {rec.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightsPopup;


