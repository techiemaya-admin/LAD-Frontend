"use client";

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";

// SDK Imports
import {
  useCallLogs,
  useBatchStatus,
  useEndCall,
  useRetryFailedCalls,
  useRecordingSignedUrl,
  useCallLead,
  getCallLog,
  type CallLog,
  type BatchPayload,
} from "@lad/frontend-features/call-logs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneCall, SquarePen } from "lucide-react";
import {
  Play,
  Mic,
  Info,
  MessageSquare,
  DollarSign,
  X,
  User,
  Bot,
  AlertCircle,
  CheckCircle,
  Zap,
  Lightbulb,
  TrendingUp,
  MinusCircle,
  Clock,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/app-toaster";
import { logger } from "@/lib/logger";
import { AgentAudioPlayer } from "./AgentAudioPlayer";
import { downloadRecording, generateRecordingFilename } from "@/utils/recordingDownload";
import { categorizeLead, getTagConfig, normalizeLeadCategory } from "@/utils/leadCategorization";
import { formatDateTimeUnified } from "@/utils/dateTime";

// shadcn + recharts
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Sector, Label } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

/* ----------------- Helpers ------------------ */
function normalizeList(value: any): string[] {
  if (!value && value !== 0) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    const v = value.trim();
    if (v.startsWith("[") && v.endsWith("]")) {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      } catch { }
    }
    if (v.includes(",")) return v.split(",").map((x) => x.trim()).filter(Boolean);
    return [v];
  }
  if (typeof value === "object") return Object.values(value).map(String).filter(Boolean);
  return [String(value)];
}

function formatTimestamp(input: any): string {
  if (input === null || input === undefined) return "";
  if (typeof input === "number") {
    const total = Math.max(0, Math.floor(input));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
  }
  if (typeof input === "string") {
    const t = input.trim();
    const parsed = Date.parse(t);
    if (!Number.isNaN(parsed)) return new Date(parsed).toLocaleString();
    const fixed = t.replace(/(\.\d{3})\d+/, "$1");
    const fixedParsed = Date.parse(fixed);
    if (!Number.isNaN(fixedParsed)) return new Date(fixedParsed).toLocaleString();
    const maybeNum = Number(t);
    if (!Number.isNaN(maybeNum)) return formatTimestamp(maybeNum);
    return t;
  }
  return String(input);
}

/* ----------------- Transcripts Tab ------------------ */
const TranscriptsTab = ({
  segments,
}: {
  segments: Array<{ time?: string; speaker?: string; text: string }>;
}) => (
  <ScrollArea className="h-full p-4">
    <div className="space-y-3">
      {segments.map((msg, i) => (
        <div
          key={i}
          className={cn(
            "flex items-start space-x-2",
            (msg.speaker || "").toLowerCase() === "assistant" ||
              (msg.speaker || "").toLowerCase() === "agent"
              ? "justify-start"
              : "justify-end"
          )}
        >
          {((msg.speaker || "").toLowerCase() === "assistant" ||
            (msg.speaker || "").toLowerCase() === "agent") && (
              <Bot className="h-5 w-5 text-blue-500 mt-1" />
            )}
          <div
            className={cn(
              "p-3 rounded-2xl max-w-xs shadow-md",
              (msg.speaker || "").toLowerCase() === "user"
                ? "bg-linear-to-r from-orange-100 to-orange-200 text-orange-900"
                : "bg-linear-to-r from-blue-100 to-blue-200 text-blue-900"
            )}
          >
            <p className="text-sm font-medium wrap-break-word">{msg.text}</p>
            <span className="text-[10px] text-muted-foreground block mt-1">
              {formatTimestamp(msg.time)}
            </span>
          </div>
          {(msg.speaker || "").toLowerCase() === "user" && (
            <User className="h-5 w-5 text-orange-500 mt-1" />
          )}
        </div>
      ))}
    </div>
  </ScrollArea>
);

/* ----------------- Analysis Tab ------------------ */
const StatBox = ({ label, value, subValue, colorClass }: { label: string; value: string; subValue?: string; colorClass?: string }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1 min-w-[120px] flex-1">
    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</span>
    <span className={cn("text-lg font-bold leading-tight", colorClass || "text-[#172560]")}>{value}</span>
    {subValue && <span className="text-[10px] text-gray-400 font-medium truncate">{subValue}</span>}
  </div>
);

const AnalysisTab = ({ analysis, log, leadData, segments }: { analysis: any | null; log: any | null; leadData?: any; segments?: any[] }) => {
  const lead = leadData?.lead ?? leadData?.data?.lead ?? leadData ?? null;
  const recoList = normalizeList(analysis?.recommendations || analysis?.raw_analysis?.recommendations);
  const summaryText = analysis?.summary ?? "";
  const sentimentText = analysis?.sentiment ?? "";
  const dispositionText = (analysis?.disposition || analysis?.raw_analysis?.disposition || analysis?.raw_analysis?.lead_disposition || analysis?.raw_analysis?.disposition_full?.disposition || log?.disposition || "").replace(/_/g, ' ');

  // Data for the boxes
  const score = analysis?.lead_score ?? analysis?.raw_analysis?.lead_score ?? (log as any)?.lead_score ?? (log as any)?.score ?? 0;
  let category = (
    analysis?.lead_category || 
    analysis?.category || 
    analysis?.raw_analysis?.lead_category || 
    analysis?.raw_analysis?.category || 
    log?.lead_category || 
    log?.category || 
    "WARM"
  ).toUpperCase();

  // Score enforcement as safety (if score >= 8, it MUST be hot)
  if (score >= 8 && category !== "HOT") category = "HOT";
  if (score > 0 && score <= 3 && category !== "COLD") category = "COLD";
  // Logic for completion percentage based on questions asked vs answered
  const getCompletionStats = () => {
    if (!segments || segments.length === 0) return { percent: 0, answered: 0, total: 0 };
    
    let total = 0;
    let answered = 0;
    
    // Keywords for filler/greeting questions to ignore
    const fillerKeywords = ["hello", "hi ", "hey ", "are you there", "am i audible", "anybody there", "how are you"];
    
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const speaker = (seg.speaker || "").toLowerCase();
      const text = seg.text.trim().toLowerCase();
      
      // Heuristic for agent/assistant
      const isAgent = speaker.includes("agent") || speaker.includes("assistant") || speaker.includes("ai") || speaker.includes("mira");
      
      // Filter out greetings and short filler questions
      const isFiller = text.length < 15 || fillerKeywords.some(k => text.includes(k));

      if (isAgent && seg.text.includes("?") && !isFiller) {
        total++;
        // Check if user (any non-agent) responded in next 2 turns
        for (let j = 1; j <= 2; j++) {
          const next = segments[i + j];
          if (next) {
            const nextSpeaker = (next.speaker || "").toLowerCase();
            const nextText = next.text.trim().toLowerCase();
            
            const isUser = nextSpeaker.includes("user") || nextSpeaker.includes("lead") || nextSpeaker.includes("customer") || nextSpeaker.includes("human") || nextSpeaker.includes("prospect") ||
                           (!nextSpeaker.includes("agent") && !nextSpeaker.includes("assistant") && !nextSpeaker.includes("ai") && !nextSpeaker.includes("mira"));
            
            // Ignore very short responses or simple greetings as an "answer"
            const isMeaningfulResponse = nextText.length > 3 && !["hi", "hello", "yes", "okay"].includes(nextText);
            
            if (isUser && isMeaningfulResponse) {
              answered++;
              break;
            }
          }
        }
      }
    }
    
    const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
    return { percent, answered, total };
  };

  const { percent: completionPercent, answered: answeredCount, total: totalQuestions } = getCompletionStats();

  // Logic for sub-labels based on score
  const getScoreTier = (s: number) => {
    if (s >= 8) return "High-tier lead";
    if (s >= 5) return "Mid-tier lead";
    if (s >= 3) return "Lower-mid tier";
    return "Cold contact";
  };

  const getCategoryDesc = (c: string) => {
    if (c === "HOT") return "Qualified interest";
    if (c === "COLD") return "No interest";
    return "Unqualified interest";
  };

  const getPriorityDesc = (s: number) => {
    if (s >= 8) return "Immediate action";
    if (s >= 5) return "Follow up needed";
    return "Nurture sequence";
  };

  const getDispositionVariant = (disposition: string) => {
    const lower = (disposition || "").toLowerCase();
    const compact = lower.replace(/[^a-z0-9]+/g, " ").trim();
    const noPunct = lower.replace(/[^a-z0-9]/g, "");

    // Red (proceed immediately) - Changed from Green as per user request
    if (compact.includes("proceed immediately") || noPunct.includes("proceedimmediately")) {
      return { color: "bg-red-100 text-red-800 border-red-200", icon: () => null };
    }

    // Yellow (3-7 days)
    if (
      compact.includes("proceed in 3") ||
      compact.includes("proceed in 7") ||
      compact.includes("proceed in 3 7") ||
      compact.includes("proceed in 3-7") ||
      compact.includes("3 7 days") ||
      noPunct.includes("proceedin3") ||
      noPunct.includes("proceedin7") ||
      noPunct.includes("37days") ||
      noPunct.includes("3to7days")
    ) {
      return { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: MinusCircle };
    }

    // Blue (don't pursue) - Changed from Red as per user request
    if (
      compact.includes("do not pursue") ||
      compact.includes("dont pursue") ||
      compact.includes("don t pursue") ||
      compact.includes("dont purse") ||
      compact.includes("don t purse") ||
      noPunct.includes("donotpursue") ||
      noPunct.includes("dontpursue") ||
      noPunct.includes("dontpurse") ||
      noPunct.includes("donotpurse")
    ) {
      return { color: "bg-blue-100 text-blue-800 border-blue-200", icon: AlertCircle };
    }

    return { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: MinusCircle };
  };

  const getScoreColor = (cat: string) => {
    if (cat === "HOT") return { bar: "bg-red-100", dot: "bg-red-500", border: "border-red-500", text: "text-red-500", tick: "bg-red-300" };
    if (cat === "COLD") return { bar: "bg-blue-100", dot: "bg-blue-500", border: "border-blue-500", text: "text-blue-500", tick: "bg-blue-300" };
    return { bar: "bg-amber-100", dot: "bg-amber-500", border: "border-amber-500", text: "text-amber-500", tick: "bg-amber-300" };
  };

  const theme = getScoreColor(category);

  const getThemeGradient = (cat: string) => {
    if (cat === "HOT") return "from-white to-red-50";
    if (cat === "COLD") return "from-white to-blue-50";
    return "from-white to-amber-50";
  };
  const gradientClass = getThemeGradient(category);

  const dispositionInfo = getDispositionVariant(dispositionText);
  const DispoIcon = dispositionInfo.icon;

  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-6">
        {/* Summary Boxes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBox label="Lead Score" value={`${score}/10`} subValue={getScoreTier(score)} colorClass={theme.text} />
          <StatBox label="Category" value={category} subValue={getCategoryDesc(category)} colorClass={theme.text} />
          <StatBox 
            label="Emotion" 
            value={(() => {
              const text = (analysis?.sentiment || analysis?.raw_analysis?.sentiment || "").toLowerCase();
              if (text.includes("interested")) return "Interested";
              if (text.includes("excited")) return "Excited";
              if (text.includes("frustrated")) return "Frustrated";
              if (text.includes("hesitant") || text.includes("hesitation")) return "Hesitant";
              if (text.includes("curious")) return "Curious";
              if (text.includes("angry")) return "Angry";
              if (text.includes("polite")) return "Polite";
              return "Neutral";
            })()} 
            subValue="Call mindset" 
            colorClass="text-purple-600" 
          />
          <StatBox label="Stage Completion" value={`${completionPercent}%`} subValue={`${answeredCount}/${totalQuestions} answered`} colorClass="text-blue-600" />
        </div>

        {/* Scaling Indicator */}
        <div className="p-6 space-y-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
          {/* Scaling Indicator */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Scaling — Where this lead sits</h4>
            <div className="relative h-6 flex items-center">
              {/* Background Line */}
              <div className={cn("h-1.5 w-full rounded-full", theme.bar)} />

              {/* Animated Pointer */}
              <div
                className="absolute transition-all duration-500 ease-out flex items-center justify-center translate-y-[0px]"
                style={{ left: `${(score / 10) * 100}%`, transform: "translateX(-50%)" }}
              >
                <div className={cn("w-5 h-5 rounded-full border-2 bg-white shadow-md flex items-center justify-center", theme.border)}>
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", theme.dot)} />
                </div>
              </div>
            </div>

            {/* Scaling Labels */}
            <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1">
              <span className="text-left">Cold / wrong contact</span>
              <span className="text-center">Nurture</span>
              <span className="text-center">Active pipeline</span>
              <span className="text-right">Close now</span>
            </div>
          </div>

          {/* Scaling Note */}
          <div className={cn("border-l-4 p-4 rounded-r-xl",
            category === "HOT" ? "bg-red-50 border-red-400" :
              category === "COLD" ? "bg-blue-50 border-blue-400" :
                "bg-amber-50 border-amber-400"
          )}>
            <h5 className={cn("text-[10px] font-bold uppercase mb-1",
              category === "HOT" ? "text-red-800" :
                category === "COLD" ? "text-blue-800" :
                  "text-amber-800"
            )}>Scaling note</h5>
            <p className={cn("text-xs leading-relaxed font-medium",
              category === "HOT" ? "text-red-700" :
                category === "COLD" ? "text-blue-700" :
                  "text-amber-700"
            )}>
              {analysis?.scaling_note || (score >= 8 ? (
                "This lead is a high-priority prospect who showed immediate interest and buying signals. Focus on closing or scheduling the next concrete step."
              ) : score >= 5 ? (
                "This lead is in the active pipeline but needs further nurturing to qualify fully. Check follow-up reasons in disposition."
              ) : (
                "This lead sits in the lower-middle tier — above cold contacts but below qualified leads. One recovery call could shift this score significantly."
              ))}
            </p>
          </div>
        </div>

        {/* Main Analysis Sections (Priority) */}
        <div className={cn("p-6 space-y-6 bg-gradient-to-br rounded-2xl border border-gray-100 shadow-sm", gradientClass)}>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Zap className={cn("h-5 w-5", theme.text === "text-amber-500" ? "text-amber-600" : theme.text)} />
              <h3 className="font-bold text-xl text-gray-800">Call Summary</h3>
            </div>
            <p className="text-gray-600 leading-relaxed bg-white/50 p-4 rounded-xl border border-gray-100 wrap-break-word whitespace-pre-wrap">
              {summaryText || "No summary available."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className={cn("h-5 w-5", category === "WARM" ? "text-amber-500" : theme.text)} />
              <h3 className="font-bold text-xl text-gray-800">Overall Sentiment</h3>
            </div>
            <Badge
              className={cn(
                "px-4 py-2 text-sm font-semibold shadow-md wrap-break-word whitespace-pre-wrap",
                dispositionInfo.color
              )}
            >
              <span className="wrap-break-word whitespace-pre-wrap">{sentimentText || "Neutral"}</span>
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className={cn("h-5 w-5", category === "WARM" ? "text-amber-500" : theme.text)} />
              <h3 className="font-bold text-xl text-gray-800">Disposition</h3>
            </div>
            <p className="text-gray-600 bg-white/50 p-4 rounded-xl border border-gray-100">
              {dispositionText || "No disposition available."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className={cn("h-5 w-5", category === "WARM" ? "text-amber-500" : theme.text)} />
              <h3 className="font-bold text-xl text-gray-800">Actionable Recommendations</h3>
            </div>
            <div className="space-y-3 bg-white/60 p-5 rounded-2xl border border-white shadow-sm">
              {recoList.length > 0 ? (
                recoList.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className={cn("mt-1 flex-shrink-0", theme.text)}>
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm leading-relaxed text-gray-700 group-hover:text-gray-900 transition-colors">{r}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No recommendations available.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </ScrollArea>
  );
};

/* ----------------- Messages Tab ------------------ */
const MessagesTab = ({ messages }: { messages: any | null }) => {
  const questions = normalizeList(messages?.prospect_questions);
  const concerns = normalizeList(messages?.prospect_concerns);
  const phrases = normalizeList(messages?.key_phrases);

  return (
    <ScrollArea className="h-full p-4">
      <Card className="border-orange-200 shadow-lg overflow-hidden">
        <CardContent className="p-6 space-y-6 bg-linear-to-br from-white to-orange-50">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-orange-500" />
              <h3 className="font-bold text-xl text-gray-800">Prospect Questions</h3>
            </div>
            <div className="space-y-3 bg-white/60 p-5 rounded-2xl border border-white shadow-sm">
              {questions.length > 0 ? (
                questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="mt-1 flex-shrink-0 text-orange-500">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <span className="text-sm leading-relaxed text-gray-700 group-hover:text-gray-900 transition-colors">{q}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No prospect questions found.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <h3 className="font-bold text-xl text-gray-800">Prospect Concerns</h3>
            </div>
            <div className="space-y-3 bg-white/60 p-5 rounded-2xl border border-white shadow-sm">
              {concerns.length > 0 ? (
                concerns.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="mt-1 flex-shrink-0 text-red-500">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm leading-relaxed text-gray-700 group-hover:text-gray-900 transition-colors">{c}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No concerns found.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-orange-500" />
              <h3 className="font-bold text-xl text-gray-800">Key Phrases</h3>
            </div>
            <div className="flex flex-wrap gap-2 bg-white/50 p-4 rounded-xl border border-gray-200">
              {phrases.length > 0 ? (
                phrases.map((p, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-sm px-3 py-1 border-orange-300 text-orange-700 bg-orange-50"
                  >
                    {p}
                  </Badge>
                ))
              ) : (
                <p className="text-gray-500 italic">No key phrases extracted.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </ScrollArea>
  );
};

/* ----------------- Cost Helpers ------------------ */
function parseCurrency(input: unknown): number {
  if (input == null) return 0;
  if (typeof input === "number") return isFinite(input) ? input : 0;
  if (typeof input === "string") {
    const cleaned = input.replace(/[,$\s]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

/* --------------- Cost Tab (Interactive Pie) --------------- */
const CallCostTab = ({ log, analysis }: { log: any | null; analysis: any | null }) => {
  const callCostRaw = log?.cost;
  const analysisCostRaw = analysis?.cost;

  const callCost = parseCurrency(callCostRaw);
  const analysisCost = parseCurrency(analysisCostRaw);

  const [includeCall, setIncludeCall] = useState(true);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);

  const data = useMemo(() => {
    const rows: Array<{ key: "call" | "analysis"; label: string; value: number; fill: string }> =
      [];
    if (includeCall && callCost > 0) {
      rows.push({ key: "call", label: "Call", value: callCost, fill: "var(--color-analysis)" });
    }
    if (includeAnalysis && analysisCost > 0) {
      rows.push({
        key: "analysis",
        label: "Analysis",
        value: analysisCost,
        fill: "var(--color-call)",
      });
    }
    return rows;
  }, [includeCall, includeAnalysis, callCost, analysisCost]);

  const total = useMemo(
    () => (includeCall ? callCost : 0) + (includeAnalysis ? analysisCost : 0),
    [includeCall, includeAnalysis, callCost, analysisCost]
  );

  const chartConfig = {
    call: { label: "Call", color: "var(--chart-1)" },
    analysis: { label: "Analysis", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  const pieId = "call-cost-pie";
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  return (
    <Card className="border-orange-200 shadow-lg">
      <ChartStyle id={pieId} config={chartConfig} />
      <div className="flex flex-col md:flex-row gap-6 p-6 bg-linear-to-r from-orange-50 to-amber-50">
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-800">Total Cost</span>
            <Badge
              variant="secondary"
              className="text-lg px-4 py-2 bg-green-100 text-green-800 border-green-200"
            >
              {formatUSD(total)}
            </Badge>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="include-call"
                  checked={includeCall}
                  onCheckedChange={(v) => setIncludeCall(!!v)}
                />
                <label htmlFor="include-call" className="text-sm font-medium text-gray-800">
                  Call Cost
                </label>
              </div>
              <span className="text-sm font-semibold">{formatUSD(callCost)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="include-analysis"
                  checked={includeAnalysis}
                  onCheckedChange={(v) => setIncludeAnalysis(!!v)}
                />
                <label htmlFor="include-analysis" className="text-sm font-medium text-gray-800">
                  Analysis Cost
                </label>
              </div>
              <span className="text-sm font-semibold">{formatUSD(analysisCost)}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex justify-center items-center">
          <ChartContainer id={pieId} config={chartConfig} className="mx-auto aspect-square w-full max-w-60">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={70}
                strokeWidth={4}
                activeIndex={activeIndex}
                onMouseEnter={(_, idx) => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(undefined)}
                isAnimationActive
                animationBegin={0}
                animationDuration={400}
                animationEasing="ease-out"
                activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                  <g>
                    <Sector
                      {...props}
                      outerRadius={outerRadius + 10}
                      innerRadius={outerRadius - 12}
                      className="pie-sector-active"
                    />
                  </g>
                )}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-xl font-bold"
                          >
                            {formatUSD(total)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 18}
                            className="fill-muted-foreground text-[10px]"
                          >
                            Selected Total
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          <style jsx>{`
            .recharts-sector { transition: all 0.25s cubic-bezier(.25,.8,.25,1); }
            .recharts-sector:hover {
              filter:
                drop-shadow(0 0 6px rgba(255, 165, 0, 0.75))
                drop-shadow(0 0 12px rgba(255, 165, 0, 0.5));
            }
            .pie-sector-active {
              filter:
                drop-shadow(0 0 8px rgba(255, 140, 0, 0.85))
                drop-shadow(0 0 16px rgba(255, 140, 0, 0.6));
            }
          `}</style>
        </div>
      </div>
    </Card>
  );
};

/* ----------------- Lead Tab ------------------ */
const LeadField = ({ label, value }: { label: string; value?: any }) => (
  <div className="bg-white/60 p-3 rounded-xl border border-gray-200">
    <span className="text-xs text-gray-500 block mb-0.5 font-medium uppercase tracking-wide">{label}</span>
    <span className="text-gray-900 font-medium text-sm break-all">
      {value !== null && value !== undefined && value !== '' ? String(value) : '—'}
    </span>
  </div>
);

const LeadTab = ({ leadData, isLoading }: { leadData: any | null; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <ScrollArea className="h-full p-4">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </ScrollArea>
    );
  }

  // Unwrap: API typically returns { success, data: { lead: { ... } } }
  const payload = leadData?.data ?? leadData ?? null;
  const lead = payload?.lead ?? payload?.data?.lead ?? payload ?? null;

  if (!lead) {
    return (
      <ScrollArea className="h-full p-4">
        <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
          <User className="h-10 w-10 opacity-40" />
          <p className="text-sm">No lead data available for this call.</p>
        </div>
      </ScrollArea>
    );
  }


  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—';
  const phoneValue =
    lead.phone ??
    ([lead.country_code, lead.base_number].filter(Boolean).join('') || undefined);

  const contactFields = [
    { label: 'Full Name', value: fullName },
    { label: 'Phone', value: phoneValue },
    { label: 'Email', value: lead.email },
    { label: 'Company', value: lead.company_name },
    { label: 'Title', value: lead.title },
    { label: 'Location', value: lead.location },
    { label: 'LinkedIn', value: lead.linkedin_url },
    { label: 'Source', value: lead.source },
  ];

  const pipelineFields = [
    { label: 'Stage', value: lead.stage },
    { label: 'Status', value: lead.status },
    { label: 'Priority', value: lead.priority !== undefined ? String(lead.priority) : undefined },
    { label: 'Tags', value: Array.isArray(lead.tags) && lead.tags.length ? lead.tags.join(', ') : undefined },
    { label: 'Estimated Value', value: lead.estimated_value !== null && lead.estimated_value !== undefined ? `${lead.currency || 'USD'} ${lead.estimated_value}` : undefined },
    { label: 'Assigned User ID', value: lead.assigned_user_id },
    { label: 'Assigned At', value: lead.assigned_at ? formatDateTimeUnified(lead.assigned_at) : undefined },
    { label: 'Next Follow-up', value: lead.next_follow_up_at ? formatDateTimeUnified(lead.next_follow_up_at) : undefined },
    { label: 'Last Contacted', value: lead.last_contacted_at ? formatDateTimeUnified(lead.last_contacted_at) : undefined },
  ];

  const metaFields = [
    { label: 'Lead ID', value: lead.id },
    { label: 'Created At', value: lead.created_at ? formatDateTimeUnified(lead.created_at) : undefined },
    { label: 'Updated At', value: lead.updated_at ? formatDateTimeUnified(lead.updated_at) : undefined },
    { label: 'Archived', value: lead.is_archived !== undefined ? (lead.is_archived ? 'Yes' : 'No') : undefined },
  ];

  const hasContact = contactFields.some(f => f.value);
  const hasPipeline = pipelineFields.some(f => f.value);

  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-5">
        {/* Contact Info */}
        {hasContact && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <User className="h-4 w-4 text-orange-500" /> Contact Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {contactFields.map((f) => <LeadField key={f.label} label={f.label} value={f.value} />)}
            </div>
          </div>
        )}

        {/* Pipeline Info */}
        {hasPipeline && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-orange-500" /> Pipeline & CRM
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pipelineFields.map((f) => <LeadField key={f.label} label={f.label} value={f.value} />)}
            </div>
          </div>
        )}

        {/* Meta */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-orange-500" /> Record Info
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {metaFields.map((f) => <LeadField key={f.label} label={f.label} value={f.value} />)}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

/* ----------------- Main Modal ------------------ */
export function CallLogModal({
  id,
  open,
  onOpenChange,
}: {
  id?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [log, setLog] = useState<any | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [segments, setSegments] = useState<Array<{ time?: string; speaker?: string; text: string }>>([]
  );
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [messages, setMessages] = useState<any | null>(null);
  const [isDownloadingRecording, setIsDownloadingRecording] = useState(false);
  const { push } = useToast();

  // Get callId for recording URL query
  const callId = log?.call_id ?? log?.callId ?? log?.voice_call_id ?? log?.id;

  // Use SDK hook to fetch signed recording URL
  const recordingUrlQuery = useRecordingSignedUrl(callId);

  // Determine the final recording URL (SDK signed URL > fallback URLs from log)
  const signedRecordingUrl = useMemo(() => {
    if (recordingUrlQuery.data?.signed_url) {
      logger.debug('Using signed URL from SDK hook');
      return recordingUrlQuery.data.signed_url;
    }
    if (recordingUrlQuery.data?.data?.signed_url) {
      logger.debug('Using nested signed URL from SDK hook');
      return recordingUrlQuery.data.data.signed_url;
    }
    // Fallback to log data
    if (log?.signed_recording_url) {
      logger.debug('Using signed_recording_url from log data');
      return log.signed_recording_url;
    }
    if (log?.recording_url) {
      logger.debug('Using recording_url from log data');
      return log.recording_url;
    }
    if (log?.call_recording_url) {
      logger.debug('Using call_recording_url from log data');
      return log.call_recording_url;
    }
    return undefined;
  }, [recordingUrlQuery.data, log]);

  // Fetch lead data using the SDK hook
  const callLeadQuery = useCallLead(open && id ? id : null);
  const leadData = callLeadQuery.data ?? null;
  const leadLoading = callLeadQuery.isLoading;

  useEffect(() => {
    async function load() {
      setLogLoading(true);
      setLog(null);
      setAnalysis(null);
      setSegments([]);
      setMessages(null);

      if (!open || !id) {
        return;
      }

      try {
        setLogLoading(true);
        // Call log - Using call-logs SDK API
        const res: any = await getCallLog(id);
        const l = res.data || res.log || res;
        setLog(l);

        // 2) Transcripts: accept string OR object, and several common keys
        try {
          const raw =
            l?.transcripts ??
            l?.transcriptions ??
            l?.transcription ??
            l?.logs?.transcriptions ??
            l?.logs?.transcription;

          let segs: Array<{ time?: string; speaker?: string; text: string }> = [];

          if (typeof raw === "string") {
            const parsed = JSON.parse(raw);
            const arr =
              Array.isArray(parsed?.segments) ? parsed.segments :
                Array.isArray(parsed) ? parsed : [];
            segs = arr.map((s: any) => {
              const text = (s.text || s.intended_text || s.message || "").trim();
              return {
                time: s.timestamp ?? s.time ?? s.t,
                speaker: s.speaker ?? s.role,
                text,
              };
            }).filter((x: { text: string; }) => x.text.length > 0);
          } else if (raw && typeof raw === "object") {
            const arr =
              Array.isArray(raw?.segments) ? raw.segments :
                Array.isArray(raw) ? raw : [];
            segs = arr.map((s: any) => {
              const text = (s.text || s.intended_text || s.message || "").trim();
              return {
                time: s.timestamp ?? s.time ?? s.t,
                speaker: s.speaker ?? s.role,
                text,
              };
            }).filter((x: { text: string; }) => x.text.length > 0);
          }
          setSegments(segs);
        } catch {
          setSegments([]);
        }

        // 3) Analysis - included in the main call log response
        try {
          const a = l?.analysis ?? null;
          setAnalysis(a);
          setMessages(a);
        } catch {
          setAnalysis(null);
          setMessages(null);
        }
      } catch (e) {
        // Log error in development only
        if (process.env.NODE_ENV === 'development') {
          console.error("Failed to load call log:", e);
        }
        setLog(null);
        setSegments([]);
        setAnalysis(null);
        setMessages(null);
      } finally {
        setLogLoading(false);
      }
    }

    load();
  }, [open, id]);

  // Availability flags & default tab
  const hasTranscripts = segments && segments.length > 0;
  const hasAudio = Boolean(signedRecordingUrl);
  const hasAnalysis = analysis && typeof analysis === "object" && Object.keys(analysis).length > 0;

  const availableTabs: Array<"transcripts" | "analysis" | "messages"> = [];
  if (hasTranscripts) availableTabs.push("transcripts");
  if (hasAnalysis) {
    availableTabs.push("analysis");
    availableTabs.push("messages");
  }
  const defaultTab = availableTabs[0] ?? "analysis";

  // Download handler
  const handleDownloadRecording = async () => {
    if (!signedRecordingUrl || !log) return;
    setIsDownloadingRecording(true);
    try {
      const leadName = [log?.lead_first_name, log?.lead_last_name]
        .filter(Boolean)
        .join(' ') || '';
      const filename = generateRecordingFilename(leadName, log?.started_at);
      logger.debug("Starting recording download with URL:", signedRecordingUrl.substring(0, 100) + "...");
      await downloadRecording(signedRecordingUrl, filename);
      // Success - the download will happen in the browser
    } catch (error) {
      logger.error("Failed to download recording:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      const description = errorMsg.includes('CORS')
        ? "Recording downloads work in production. This is a localhost development limitation."
        : `Could not download recording: ${errorMsg}`;

      push({
        variant: 'error',
        title: 'Download Failed',
        description,
      });
    } finally {
      setIsDownloadingRecording(false);
    }
  };

  // Get lead category from API response or show unknown
  const leadCategory = (() => {
    if (log?.lead_category) {
      const normalized = normalizeLeadCategory(log.lead_category);
      if (normalized) return normalized;
    }
    return "unknown";
  })();
  const tagConfig = getTagConfig(leadCategory);

  return (
    <>
      <div
        className={cn(
          "fixed z-[9999] bg-white shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out rounded-2xl",
          // Centered modal
          "inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[90vw] sm:max-w-5xl sm:h-[90vh]",
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none invisible"
        )}
      >
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 p-2 rounded-xl bg-gray-50/80 hover:bg-gray-100 border border-gray-200 text-gray-400 hover:text-gray-600 transition-all duration-200 z-[10000] group shadow-sm"
          title="Close Modal"
        >
          <X className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </button>

        {/* Header */}
        {/* <div className="p-3 sm:p-4 border-b flex flex-row items-center justify-between gap-2 shadow-sm bg-white w-full min-h-[64px]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <PhoneCall className="h-5 w-5 text-orange-500 shrink-0" />
            <h1 className="text-sm xs:text-base sm:text-xl font-bold text-gray-800 leading-tight">
              Call Details & Insights
            </h1>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasAudio && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadRecording}
                disabled={isDownloadingRecording}
                className="hover:bg-orange-100 h-8 px-2 text-[10px] xs:text-xs border-orange-200"
              >
                <Download className="h-3 w-3 mr-1 text-orange-500" />
                <span className="text-gray-700">
                  {isDownloadingRecording ? "..." : "Recording"}
                </span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="hover:bg-orange-100 h-8 w-8 p-0 text-gray-500">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div> */}

        {/* Body */}
        <div className="flex flex-col h-full pt-20 p-6 space-y-6 overflow-hidden">

          {logLoading ? (
            /* ── Skeleton while initial data loads ── */
            <div className="flex-1 flex flex-col space-y-4">
              {/* Tab bar skeleton */}
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 flex-1 rounded-xl" />
                ))}
              </div>
              {/* Content skeleton */}
              <div className="flex-1 border border-gray-200 rounded-2xl p-6 space-y-4">
                {/* Avatar + name row */}
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                {/* Field grid */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-2 p-4 rounded-xl border border-gray-100">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {hasAudio && (
                <div className="w-full">
                  <AgentAudioPlayer src={signedRecordingUrl} />
                </div>
              )}


              <Tabs key={defaultTab} defaultValue="lead" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="flex items-center gap-1 bg-gray-50 rounded-2xl p-1 shadow-inner overflow-x-auto no-scrollbar w-full justify-start sm:justify-center">
                  <TabsTrigger
                    value="lead"
                    className="flex-none whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md rounded-xl py-2 px-4 text-xs xs:text-sm flex items-center gap-2"
                  >
                    <User className="h-4 w-4 shrink-0" />
                    <span>Profile</span>
                  </TabsTrigger>
                  {hasTranscripts && (
                    <TabsTrigger
                      value="transcripts"
                      className="flex-none whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md rounded-xl py-2 px-4 text-xs xs:text-sm flex items-center gap-2"
                    >
                      <Mic className="h-4 w-4 shrink-0" />
                      <span>Transcript</span>
                    </TabsTrigger>
                  )}

                  {hasAnalysis && (
                    <TabsTrigger
                      value="analysis"
                      className="flex-none whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md rounded-xl py-2 px-4 text-xs xs:text-sm flex items-center gap-2"
                    >
                      <Info className="h-4 w-4 shrink-0" />
                      <span>Analysis</span>
                    </TabsTrigger>
                  )}

                  {hasAnalysis && (
                    <TabsTrigger
                      value="messages"
                      className="flex-none whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md rounded-xl py-2 px-4 text-xs xs:text-sm flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <span>Messages</span>
                    </TabsTrigger>
                  )}

                </TabsList>

                <TabsContent value="lead" className="flex-1 overflow-hidden mt-4 border border-gray-200 rounded-2xl">
                  <LeadTab leadData={leadData} isLoading={leadLoading} />
                </TabsContent>

                {hasTranscripts && (
                  <TabsContent value="transcripts" className="flex-1 overflow-hidden mt-4 border border-gray-200 rounded-2xl">
                    <TranscriptsTab segments={segments} />
                  </TabsContent>
                )}

                {hasAnalysis && (
                  <TabsContent value="analysis" className="flex-1 overflow-hidden mt-4 border border-gray-200 rounded-2xl">
                    <AnalysisTab analysis={analysis} log={log} leadData={leadData} segments={segments} />
                  </TabsContent>
                )}

                {hasAnalysis && (
                  <TabsContent value="messages" className="flex-1 overflow-hidden mt-4 border border-gray-200 rounded-2xl">
                    <MessagesTab messages={messages} />
                  </TabsContent>
                )}

              </Tabs>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      )}
    </>
  );
}
