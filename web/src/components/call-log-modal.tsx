"use client";

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { apiGet } from "@/lib/api";
import { logger } from "@/lib/logger";
import { AgentAudioPlayer } from "./AgentAudioPlayer";
import { downloadRecording, generateRecordingFilename } from "@/utils/recordingDownload";
import { categorizeLead, getTagConfig, normalizeLeadCategory } from "@/utils/leadCategorization";

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
      } catch {}
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
                ? "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-900"
                : "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900"
            )}
          >
            <p className="text-sm font-medium break-words">{msg.text}</p>
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
const AnalysisTab = ({ analysis }: { analysis: any | null }) => {
  const recoList = normalizeList(analysis?.recommendations);
  const summaryText = analysis?.summary ?? "";
  const sentimentText = analysis?.sentiment ?? "";
  const dispositionText = analysis?.disposition ?? "";

  const getSentimentVariant = (sentiment: string) => {
    const lower = sentiment.toLowerCase();
    if (lower.includes("positive"))
      return {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      };
    if (lower.includes("negative"))
      return {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: AlertCircle,
      };
    return {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: MinusCircle,
    };
  };
  
  // Color mapping derived from disposition
  const getDispositionVariant = (disposition: string) => {
    const lower = (disposition || "").toLowerCase();
    const compact = lower.replace(/[^a-z0-9]+/g, " ").trim();
    const noPunct = lower.replace(/[^a-z0-9]/g, "");

    // Green
    if (compact.includes("proceed immediately") || noPunct.includes("proceedimmediately")) {
      return { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle };
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

    // Red (don't pursue)
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
      return { color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle };
    }

    return { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: MinusCircle };
  };

  const dispositionInfo = getDispositionVariant(dispositionText);
  const DispoIcon = dispositionInfo.icon;

  return (
    <ScrollArea className="h-full p-4">
      <Card className="border-orange-200 shadow-lg overflow-hidden">
        <CardContent className="p-6 space-y-6 bg-gradient-to-br from-white to-orange-50">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-[#0b1957]" />
              <h3 className="font-bold text-xl text-gray-800">Call Summary</h3>
            </div>
            <p className="text-gray-600 leading-relaxed bg-white/50 p-4 rounded-xl border border-gray-200 break-words whitespace-pre-wrap">
              {summaryText || "No summary available."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <h3 className="font-bold text-xl text-gray-800">Overall Sentiment</h3>
            </div>
            <Badge
              className={cn(
                "px-4 py-2 text-sm font-semibold shadow-md break-words whitespace-pre-wrap",
                dispositionInfo.color
              )}
            >
              <DispoIcon className="h-4 w-4 mr-1 shrink-0" />
              <span className="break-words whitespace-pre-wrap">
                {sentimentText || "Neutral"}
              </span>
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <h3 className="font-bold text-xl text-gray-800">Disposition</h3>
            </div>
            <p className="text-gray-600 bg-white/50 p-4 rounded-xl border border-gray-200">
              {dispositionText || "Resolved successfully."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-orange-500" />
              <h3 className="font-bold text-xl text-gray-800">Actionable Recommendations</h3>
            </div>
            <div className="space-y-2 bg-white/50 p-4 rounded-xl border border-gray-200">
              {recoList.length > 0 ? (
                recoList.map((r, i) => (
                  <div key={i} className="flex items-start space-x-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5" />
                    <span>{r}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No recommendations available.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
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
        <CardContent className="p-6 space-y-6 bg-gradient-to-br from-white to-orange-50">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-orange-500" />
              <h3 className="font-bold text-xl text-gray-800">Prospect Questions</h3>
            </div>
            <div className="space-y-2 bg-white/50 p-4 rounded-xl border border-gray-200">
              {questions.length > 0 ? (
                questions.map((q, i) => (
                  <div key={i} className="flex items-start space-x-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5" />
                    <span>{q}</span>
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
            <div className="space-y-2 bg-white/50 p-4 rounded-xl border border-gray-200">
              {concerns.length > 0 ? (
                concerns.map((c, i) => (
                  <div key={i} className="flex items-start space-x-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5" />
                    <span>{c}</span>
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
      <div className="flex flex-col md:flex-row gap-6 p-6 bg-gradient-to-r from-orange-50 to-amber-50">
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
          <ChartContainer id={pieId} config={chartConfig} className="mx-auto aspect-square w-full max-w-[240px]">
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
  const [segments, setSegments] = useState<Array<{ time?: string; speaker?: string; text: string }>>(
    []
  );
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [signedRecordingUrl, setSignedRecordingUrl] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<any | null>(null);
  const [isDownloadingRecording, setIsDownloadingRecording] = useState(false);

  useEffect(() => {
    async function load() {
      if (!open || !id) {
        setLog(null);
        setSegments([]);
        setAnalysis(null);
        setMessages(null);
        setSignedRecordingUrl(undefined);
        return;
      }

      try {
        // Call log - Using voice-agent API (get by call_log_id)
        const res = await apiGet<{ success: boolean; log?: any; data?: any }>(`/api/voice-agent/calllogs/${id}`);
        const l = res.data || res.log;
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

        // 3) Audio: always try signed URL using a real call id, then fallback
        try {
          const callId = l?.call_id ?? l?.callId ?? l?.voice_call_id ?? l?.id;
          let audioUrl: string | undefined;

          if (callId) {
            try {
              // Using voice-agent API for recording URL (VAPI integration disabled in backend)
              const signedRes = await apiGet<{ success: boolean; signed_url?: string }>(
                `/api/voice-agent/calls/${callId}/recording-signed-url`
              );
              if (signedRes?.success && signedRes?.signed_url) {
                audioUrl = signedRes.signed_url;
              }
            } catch (apiError) {
              logger.warn('[CallLogModal] Failed to fetch signed recording URL, using fallback', {
                error: apiError instanceof Error ? apiError.message : String(apiError)
              });
            }
          }
          if (!audioUrl && l?.signed_recording_url) {
            audioUrl = l.signed_recording_url;
          }
          if (!audioUrl && l?.recording_url) {
            audioUrl = l.recording_url;
          }
          if (!audioUrl && l?.call_recording_url) {
            audioUrl = l.call_recording_url;
          }
          setSignedRecordingUrl(audioUrl);
        } catch (signErr) {
          // Fallback to direct URLs if signed URL fetch fails
          setSignedRecordingUrl(l?.signed_recording_url || l?.recording_url || l?.call_recording_url);
        }

        // 4) Analysis - included in the main call log response
        try {
          const a = l?.analysis ?? null;
          setAnalysis(a);
          setMessages(a);
        } catch {
          setAnalysis(null);
          setMessages(null);
        }
      } catch (e) {
        logger.error('[CallLogModal] Failed to load call log', {
          error: e instanceof Error ? e.message : String(e),
          isDevelopment: process.env.NODE_ENV === 'development'
        });
        setLog(null);
        setSegments([]);
        setAnalysis(null);
        setMessages(null);
        setSignedRecordingUrl(undefined);
      }
    }

    load();
  }, [open, id]);

  // Availability flags & default tab
  const hasTranscripts = segments && segments.length > 0;
  const hasAudio = Boolean(signedRecordingUrl);
  const hasAnalysis = analysis && typeof analysis === "object" && Object.keys(analysis).length > 0;

  const availableTabs: Array<"transcripts" | "analysis" | "messages" | "cost"> = [];
  if (hasTranscripts) availableTabs.push("transcripts");
  if (hasAnalysis) {
    availableTabs.push("analysis");
    availableTabs.push("messages");
  }
  availableTabs.push("cost");
  const defaultTab = availableTabs[0] ?? "cost";

  // Download handler
  const handleDownloadRecording = async () => {
    if (!signedRecordingUrl || !log) return;
    setIsDownloadingRecording(true);
    try {
      const leadName = [log?.lead_first_name, log?.lead_last_name]
        .filter(Boolean)
        .join(' ') || '';
      const filename = generateRecordingFilename(leadName, log?.started_at);
      await downloadRecording(signedRecordingUrl, filename);
    } catch (error) {
      logger.error('[CallLogModal] Failed to download recording', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsDownloadingRecording(false);
    }
  };

  // Get lead category from API response or categorize
  const leadCategory = (() => {
    if (log?.lead_category) {
      const normalized = normalizeLeadCategory(log.lead_category);
      if (normalized) return normalized;
    }
    return categorizeLead(log || {});
  })();
  const tagConfig = getTagConfig(leadCategory);

  return (
    <>
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-6xl bg-white border-l shadow-2xl flex flex-col overflow-hidden",
          open ? "translate-x-0" : "translate-x-full",
          "transition-transform duration-300 ease-in-out rounded-l-3xl"
        )}
      >
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center shadow-sm">
          <div className="flex items-center space-x-3">
            <PhoneCall className="h-6 w-6 text-orange-500" />
            <div className="flex flex-col space-y-1">
              <h2 className="text-2xl font-bold text-gray-800">Call Details & Insights</h2>
              {leadCategory && (
                <Badge className={cn(
                  "w-fit text-xs font-semibold",
                  tagConfig.bgColor,
                  tagConfig.textColor
                )}>
                  {tagConfig.label}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasAudio && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadRecording}
                disabled={isDownloadingRecording}
                className="hover:bg-orange-100"
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloadingRecording ? "Downloading..." : "Call Recording Download"}
              </Button>
            )}  
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="hover:bg-orange-100">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col h-full p-6 space-y-6 overflow-hidden">
          {/* Audio (only if present) */}
          {/* {hasAudio && <AgentAudioPlayer src={signedRecordingUrl} />} */}

          {hasAudio && (
  <div className="w-full">
    <AgentAudioPlayer src={signedRecordingUrl} />
  </div>
)}


          <Tabs key={defaultTab} defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-4 gap-1 bg-gray-50 rounded-2xl p-1 shadow-inner">
              {hasTranscripts && (
                <TabsTrigger
                  value="transcripts"
                  className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md rounded-xl"
                >
                  <Mic className="h-4 w-4" /> Transcripts
                </TabsTrigger>
              )}

              {hasAnalysis && (
                <TabsTrigger
                  value="analysis"
                  className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md rounded-xl"
                >
                  <Info className="h-4 w-4" /> Analysis
                </TabsTrigger>
              )}

              {hasAnalysis && (
                <TabsTrigger
                  value="messages"
                  className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md rounded-xl"
                >
                  <MessageSquare className="h-4 w-4" /> Messages
                </TabsTrigger>
              )}

              <TabsTrigger
                value="cost"
                className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md rounded-xl"
              >
                <DollarSign className="h-4 w-4" /> Cost
              </TabsTrigger>
            </TabsList>

            {hasTranscripts && (
              <TabsContent value="transcripts" className="flex-1 overflow-hidden mt-4 border border-gray-200 rounded-2xl">
                <TranscriptsTab segments={segments} />
              </TabsContent>
            )}

            {hasAnalysis && (
              <TabsContent value="analysis" className="flex-1 overflow-hidden mt-4 border border-gray-200 rounded-2xl">
                <AnalysisTab analysis={analysis} />
              </TabsContent>
            )}

            {hasAnalysis && (
              <TabsContent value="messages" className="flex-1 overflow-hidden mt-4 border border-gray-200 rounded-2xl">
                <MessagesTab messages={messages} />
              </TabsContent>
            )}

            <TabsContent value="cost" className="flex-1 overflow-hidden mt-4 border border-gray-200 rounded-2xl pt-6">
              <CallCostTab log={log} analysis={analysis} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      )}
    </>
  );
}

// "use client";

// import * as React from "react";
// import { useState, useMemo, useEffect } from "react";
// import { cn } from "@/lib/utils";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Badge } from "@/components/ui/badge";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import {
//   Play,
//   Mic,
//   Info,
//   MessageSquare,
//   DollarSign,
//   X,
//   User,
//   Bot,
//   AlertCircle,
//   CheckCircle,
//   Zap,
//   Lightbulb,
//   TrendingUp,
//   MinusCircle,
//   Clock,
// } from "lucide-react";
// import { Card, CardContent } from "@/components/ui/card";
// import { apiGet } from "@/lib/api";
// import { AgentAudioPlayer } from "./AgentAudioPlayer";

// // ⬇️ shadcn + recharts (correct imports)
// import { Checkbox } from "@/components/ui/checkbox";
// import {
//   ChartConfig,
//   ChartContainer,
//   ChartStyle,
//   ChartTooltip,
//   ChartTooltipContent,
// } from "@/components/ui/chart";
// import { PieChart, Pie, Sector, Label } from "recharts";
// import type { PieSectorDataItem } from "recharts/types/polar/Pie";

// // 🎵 Waveform Player
// const Waveform = ({ url }: { url?: string }) => {
//   const [playing, setPlaying] = useState(false);
//   return (
//     <div className="flex items-center justify-between border rounded-2xl p-6 shadow-lg bg-gradient-to-r from-orange-50 via-amber-50 to-white border-orange-200">
//       <div className="flex-1 mr-4">
//         {url ? (
//           <audio controls src={url} className="w-full" />
//         ) : (
//           <div className="flex space-x-1">
//             {Array.from({ length: 40 }).map((_, i) => (
//               <div
//                 key={i}
//                 className="w-[3px] bg-gradient-to-t from-orange-400 to-orange-600 rounded-sm"
//                 style={{
//                   height: `${Math.random() * 25 + 10}px`,
//                   animation: playing ? `wave-${i % 3} 1s infinite ease-in-out` : "none",
//                 }}
//               />
//             ))}
//           </div>
//         )}
//       </div>
//       {!url && (
//         <Button
//           variant="outline"
//           size="sm"
//           onClick={() => setPlaying(!playing)}
//           className="border-orange-300 hover:bg-orange-50"
//         >
//           <Play className="h-4 w-4" />
//         </Button>
//       )}
//       <style jsx>{`
//         @keyframes wave-0 {
//           0%,
//           100% {
//             transform: scaleY(1);
//           }
//           50% {
//             transform: scaleY(1.8);
//           }
//         }
//         @keyframes wave-1 {
//           0%,
//           100% {
//             transform: scaleY(1);
//           }
//           50% {
//             transform: scaleY(1.4);
//           }
//         }
//         @keyframes wave-2 {
//           0%,
//           100% {
//             transform: scaleY(1);
//           }
//           50% {
//             transform: scaleY(1.6);
//           }
//         }
//       `}</style>
//     </div>
//   );
// };

// // Helper for arrays
// function normalizeList(value: any): string[] {
//   if (!value && value !== 0) return [];
//   if (Array.isArray(value)) return value.map(String).filter(Boolean);
//   if (typeof value === "string") {
//     const v = value.trim();
//     if (v.startsWith("[") && v.endsWith("]")) {
//       try {
//         const parsed = JSON.parse(v);
//         if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
//       } catch {}
//     }
//     if (v.includes(",")) return v.split(",").map((x) => x.trim()).filter(Boolean);
//     return [v];
//   }
//   if (typeof value === "object") return Object.values(value).map(String).filter(Boolean);
//   return [String(value)];
// }

// function formatTimestamp(input: any): string {
//   if (input === null || input === undefined) return "";
//   if (typeof input === "number") {
//     const total = Math.max(0, Math.floor(input));
//     const h = Math.floor(total / 3600);
//     const m = Math.floor((total % 3600) / 60);
//     const s = total % 60;
//     const mm = String(m).padStart(2, "0");
//     const ss = String(s).padStart(2, "0");
//     return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
//   }
//   if (typeof input === "string") {
//     const t = input.trim();
//     const parsed = Date.parse(t);
//     if (!Number.isNaN(parsed)) return new Date(parsed).toLocaleString();
//     const fixed = t.replace(/(\.\d{3})\d+/, "$1");
//     const fixedParsed = Date.parse(fixed);
//     if (!Number.isNaN(fixedParsed)) return new Date(fixedParsed).toLocaleString();
//     const maybeNum = Number(t);
//     if (!Number.isNaN(maybeNum)) return formatTimestamp(maybeNum);
//     return t;
//   }
//   return String(input);
// }

// // 💬 Transcripts Tab
// const TranscriptsTab = ({
//   segments,
// }: {
//   segments: Array<{ time?: string; speaker?: string; text: string }>;
// }) => (
//   <ScrollArea className="h-full p-4">
//     <div className="space-y-3">
//       {segments.map((msg, i) => (
//         <div
//           key={i}
//           className={cn(
//             "flex items-start space-x-2",
//             (msg.speaker || "").toLowerCase() === "assistant" ||
//               (msg.speaker || "").toLowerCase() === "agent"
//               ? "justify-start"
//               : "justify-end"
//           )}
//         >
//           {((msg.speaker || "").toLowerCase() === "assistant" ||
//             (msg.speaker || "").toLowerCase() === "agent") && (
//             <Bot className="h-5 w-5 text-blue-500 mt-1" />
//           )}
//           <div
//             className={cn(
//               "p-3 rounded-2xl max-w-xs shadow-md",
//               (msg.speaker || "").toLowerCase() === "user"
//                 ? "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-900"
//                 : "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900"
//             )}
//           >
//             <p className="text-sm font-medium">{msg.text}</p>
//             <span className="text-[10px] text-muted-foreground block mt-1">
//               {formatTimestamp(msg.time)}
//             </span>
//           </div>
//           {(msg.speaker || "").toLowerCase() === "user" && (
//             <User className="h-5 w-5 text-orange-500 mt-1" />
//           )}
//         </div>
//       ))}
//     </div>
//   </ScrollArea>
// );

// // 🧠 Analysis Tab (scrollable)
// const AnalysisTab = ({ analysis }: { analysis: any | null }) => {
//   const recoList = normalizeList(analysis?.recommendations);
//   const summaryText = analysis?.summary ?? "";
//   const sentimentText = analysis?.sentiment ?? "";
//   const dispositionText = analysis?.disposition ?? "";

//   const getSentimentVariant = (sentiment: string) => {
//     const lower = sentiment.toLowerCase();
//     if (lower.includes("positive"))
//       return {
//         color: "bg-green-100 text-green-800 border-green-200",
//         icon: CheckCircle,
//       };
//     if (lower.includes("negative"))
//       return {
//         color: "bg-red-100 text-red-800 border-red-200",
//         icon: AlertCircle,
//       };
//     return {
//       color: "bg-yellow-100 text-yellow-800 border-yellow-200",
//       icon: MinusCircle,
//     };
//   };

//   const sentimentInfo = getSentimentVariant(sentimentText);
//   const SentIcon = sentimentInfo.icon; // ✅ fix dynamic icon render

//   return (
//     <ScrollArea className="h-full p-4">
//       <Card className="border-orange-200 shadow-lg overflow-hidden">
//         <CardContent className="p-6 space-y-6 bg-gradient-to-br from-white to-orange-50">
//           {/* Summary */}
//           <div className="space-y-3">
//             <div className="flex items-center space-x-2">
//               <Zap className="h-5 w-5 text-[#0b1957]" />
//               <h3 className="font-bold text-xl text-gray-800">Call Summary</h3>
//             </div>
//             <p className="text-gray-600 leading-relaxed bg-white/50 p-4 rounded-xl border border-gray-200 break-words whitespace-pre-wrap">
//               {summaryText || "No summary available."}
//             </p>
//           </div>

//           {/* Sentiment */}
//           <div className="space-y-3">
//             <div className="flex items-center space-x-2">
//               <TrendingUp className="h-5 w-5 text-orange-500" />
//               <h3 className="font-bold text-xl text-gray-800">Overall Sentiment</h3>
//             </div>
//             <Badge
//               className={cn(
//                 "px-4 py-2 text-sm font-semibold shadow-md break-words whitespace-pre-wrap",
//                 sentimentInfo.color
//               )}
//             >
//               <SentIcon className="h-4 w-4 mr-1 shrink-0" />
//               <span className="break-words whitespace-pre-wrap">
//                 {sentimentText || "Neutral"}
//               </span>
//             </Badge>
//           </div>

//           {/* Disposition */}
//           <div className="space-y-3">
//             <div className="flex items-center space-x-2">
//               <Clock className="h-5 w-5 text-orange-500" />
//               <h3 className="font-bold text-xl text-gray-800">Disposition</h3>
//             </div>
//             <p className="text-gray-600 bg-white/50 p-4 rounded-xl border border-gray-200">
//               {dispositionText || "Resolved successfully."}
//             </p>
//           </div>

//           {/* Recommendations */}
//           <div className="space-y-3">
//             <div className="flex items-center space-x-2">
//               <Lightbulb className="h-5 w-5 text-orange-500" />
//               <h3 className="font-bold text-xl text-gray-800">Actionable Recommendations</h3>
//             </div>
//             <div className="space-y-2 bg-white/50 p-4 rounded-xl border border-gray-200">
//               {recoList.length > 0 ? (
//                 recoList.map((r, i) => (
//                   <div key={i} className="flex items-start space-x-2 text-sm text-gray-700">
//                     <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5" />
//                     <span>{r}</span>
//                   </div>
//                 ))
//               ) : (
//                 <p className="text-gray-500 italic">No recommendations available.</p>
//               )}
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     </ScrollArea>
//   );
// };

// // 💬 Messages Tab
// const MessagesTab = ({ messages }: { messages: any | null }) => {
//   const questions = normalizeList(messages?.prospect_questions);
//   const concerns = normalizeList(messages?.prospect_concerns);
//   const phrases = normalizeList(messages?.key_phrases);

//   return (
//     <ScrollArea className="h-full p-4">
//       <Card className="border-orange-200 shadow-lg overflow-hidden">
//         <CardContent className="p-6 space-y-6 bg-gradient-to-br from-white to-orange-50">
//           {/* Prospect Questions */}
//           <div className="space-y-3">
//             <div className="flex items-center space-x-2">
//               <MessageSquare className="h-5 w-5 text-orange-500" />
//               <h3 className="font-bold text-xl text-gray-800">Prospect Questions</h3>
//             </div>
//             <div className="space-y-2 bg-white/50 p-4 rounded-xl border border-gray-200">
//               {questions.length > 0 ? (
//                 questions.map((q, i) => (
//                   <div key={i} className="flex items-start space-x-2 text-sm text-gray-700">
//                     <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5" />
//                     <span>{q}</span>
//                   </div>
//                 ))
//               ) : (
//                 <p className="text-gray-500 italic">No prospect questions found.</p>
//               )}
//             </div>
//           </div>

//           {/* Prospect Concerns */}
//           <div className="space-y-3">
//             <div className="flex items-center space-x-2">
//               <AlertCircle className="h-5 w-5 text-orange-500" />
//               <h3 className="font-bold text-xl text-gray-800">Prospect Concerns</h3>
//             </div>
//             <div className="space-y-2 bg-white/50 p-4 rounded-xl border border-gray-200">
//               {concerns.length > 0 ? (
//                 concerns.map((c, i) => (
//                   <div key={i} className="flex items-start space-x-2 text-sm text-gray-700">
//                     <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5" />
//                     <span>{c}</span>
//                   </div>
//                 ))
//               ) : (
//                 <p className="text-gray-500 italic">No concerns found.</p>
//               )}
//             </div>
//           </div>

//           {/* Key Phrases */}
//           <div className="space-y-3">
//             <div className="flex items-center space-x-2">
//               <Zap className="h-5 w-5 text-orange-500" />
//               <h3 className="font-bold text-xl text-gray-800">Key Phrases</h3>
//             </div>
//             <div className="flex flex-wrap gap-2 bg-white/50 p-4 rounded-xl border border-gray-200">
//               {phrases.length > 0 ? (
//                 phrases.map((p, i) => (
//                   <Badge
//                     key={i}
//                     variant="outline"
//                     className="text-sm px-3 py-1 border-orange-300 text-orange-700 bg-orange-50"
//                   >
//                     {p}
//                   </Badge>
//                 ))
//               ) : (
//                 <p className="text-gray-500 italic">No key phrases extracted.</p>
//               )}
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     </ScrollArea>
//   );
// };

// /* ----------------- Cost Helpers ------------------ */
// function parseCurrency(input: unknown): number {
//   if (input == null) return 0;
//   if (typeof input === "number") return isFinite(input) ? input : 0;
//   if (typeof input === "string") {
//     const cleaned = input.replace(/[,$\s]/g, "");
//     const n = Number(cleaned);
//     return Number.isFinite(n) ? n : 0;
//   }
//   return 0;
// }
// function formatUSD(n: number): string {
//   return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
// }

// /* --------------- Cost Tab (Interactive Pie) --------------- */
// const CallCostTab = ({ log, analysis }: { log: any | null; analysis: any | null }) => {
//   // Backend values
//   const callCostRaw = log?.cost; // voice_agent.call_logs_voiceagent.cost
//   const analysisCostRaw = analysis?.cost; // post_call_analysis_voiceagent.cost (string like "$0.000435")

//   const callCost = parseCurrency(callCostRaw);
//   const analysisCost = parseCurrency(analysisCostRaw);

//   const [includeCall, setIncludeCall] = useState(true);
//   const [includeAnalysis, setIncludeAnalysis] = useState(true);

//   const data = useMemo(() => {
//     const rows: Array<{ key: "call" | "analysis"; label: string; value: number; fill: string }> =
//       [];
//     if (includeCall && callCost > 0) {
//       rows.push({ key: "call", label: "Call", value: callCost, fill: "var(--color-call)" });
//     }
//     if (includeAnalysis && analysisCost > 0) {
//       rows.push({
//         key: "analysis",
//         label: "Analysis",
//         value: analysisCost,
//         fill: "var(--color-analysis)",
//       });
//     }
//     return rows;
//   }, [includeCall, includeAnalysis, callCost, analysisCost]);

//   const total = useMemo(
//     () => (includeCall ? callCost : 0) + (includeAnalysis ? analysisCost : 0),
//     [includeCall, includeAnalysis, callCost, analysisCost]
//   );

//   const chartConfig = {
//     call: { label: "Call", color: "var(--chart-1)" },
//     analysis: { label: "Analysis", color: "var(--chart-2)" },
//   } satisfies ChartConfig;

//   const pieId = "call-cost-pie";
//   const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

//   return (
//     <Card className="border-orange-200 shadow-lg">
//       <ChartStyle id={pieId} config={chartConfig} />
//       <div className="flex flex-col md:flex-row gap-6 p-6 bg-gradient-to-r from-orange-50 to-amber-50">
//         {/* Left: switches & totals */}
//         <div className="flex-1 space-y-4">
//           <div className="flex items-center justify-between">
//             <span className="text-lg font-semibold text-gray-800">Total Cost</span>
//             <Badge
//               variant="secondary"
//               className="text-lg px-4 py-2 bg-green-100 text-green-800 border-green-200"
//             >
//               {formatUSD(total)}
//             </Badge>
//           </div>

//           <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <Checkbox
//                   id="include-call"
//                   checked={includeCall}
//                   onCheckedChange={(v) => setIncludeCall(!!v)}
//                 />
//                 <label htmlFor="include-call" className="text-sm font-medium text-gray-800">
//                   Call Cost
//                 </label>
//               </div>
//               <span className="text-sm font-semibold">{formatUSD(callCost)}</span>
//             </div>

//             <div className="flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <Checkbox
//                   id="include-analysis"
//                   checked={includeAnalysis}
//                   onCheckedChange={(v) => setIncludeAnalysis(!!v)}
//                 />
//                 <label htmlFor="include-analysis" className="text-sm font-medium text-gray-800">
//                   Analysis Cost
//                 </label>
//               </div>
//               <span className="text-sm font-semibold">{formatUSD(analysisCost)}</span>
//             </div>
//           </div>
//         </div>

//         {/* Right: pie */}
//         <div className="flex-1 flex justify-center items-center">
//           {/* <ChartContainer id={pieId} config={chartConfig} className="mx-auto aspect-square w-full max-w-[320px]">
//             <PieChart>
//               <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
//               <Pie
//                 data={data}
//                 dataKey="value"
//                 nameKey="label"
//                 innerRadius={60}
//                 strokeWidth={5}
//                 onMouseEnter={(_, idx) => setActiveIndex(idx)}
//                 onMouseLeave={() => setActiveIndex(undefined)}
//                 activeIndex={activeIndex}
//                 activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
//                   <g>
//                     <Sector {...props} outerRadius={outerRadius + 10} />
//                     <Sector {...props} outerRadius={outerRadius + 24} innerRadius={outerRadius + 12} />
//                   </g>
//                 )}
//               >
//                 <Label
//                   content={({ viewBox }) => {
//                     if (viewBox && "cx" in viewBox && "cy" in viewBox) {
//                       return (
//                         <text
//                           x={viewBox.cx}
//                           y={viewBox.cy}
//                           textAnchor="middle"
//                           dominantBaseline="middle"
//                         >
//                           <tspan
//                             x={viewBox.cx}
//                             y={viewBox.cy}
//                             className="fill-foreground text-2xl font-bold"
//                           >
//                             {formatUSD(total)}
//                           </tspan>
//                           <tspan
//                             x={viewBox.cx}
//                             y={(viewBox.cy || 0) + 22}
//                             className="fill-muted-foreground text-xs"
//                           >
//                             Selected Total
//                           </tspan>
//                         </text>
//                       );
//                     }
//                     return null;
//                   }}
//                 />
//               </Pie>
//             </PieChart>
//           </ChartContainer> */}


//           {/* <ChartContainer
//   id={pieId}
//   config={chartConfig}
//   className="mx-auto aspect-square w-full max-w-[300px]" // was 320px
// >
//   <PieChart>
//     <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
//    <Pie
//   data={data}
//   dataKey="value"
//   nameKey="label"
//   innerRadius={90}
//   strokeWidth={2}
//   activeIndex={activeIndex}
//   onMouseEnter={(_, idx) => setActiveIndex(idx)}
//   onMouseLeave={() => setActiveIndex(undefined)}
//   isAnimationActive        // ✅ Enables animation
//   animationBegin={0}
//   animationDuration={1000}  // ✅ smooth speed
//   animationEasing="ease-out"  // ✅ smooth slow-end
//   activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
//     <g>
//       <Sector
//         {...props}
//         outerRadius={outerRadius + 20}  // ✅ smooth pop size
//         innerRadius={outerRadius - 20}
//       />
//     </g>
//   )}
// >

//       <Label
//         content={({ viewBox }) => {
//           if (viewBox && "cx" in viewBox && "cy" in viewBox) {
//             return (
//               <text
//                 x={viewBox.cx}
//                 y={viewBox.cy}
//                 textAnchor="middle"
//                 dominantBaseline="middle"
//               >
//                 <tspan
//                   x={viewBox.cx}
//                   y={viewBox.cy}
//                   className="fill-foreground text-xl font-bold"   // ✅ smaller text
//                 >
//                   {formatUSD(total)}
//                 </tspan>
//                 <tspan
//                   x={viewBox.cx}
//                   y={(viewBox.cy || 0) + 18}
//                   className="fill-muted-foreground text-[10px]"
//                 >
//                   Selected Total
//                 </tspan>
//               </text>
//             );
//           }
//           return null;
//         }}
//       />
//     </Pie>
//   </PieChart>
// </ChartContainer>

//  */}


// {/* --- Pie (must be a single child inside ChartContainer) --- */}
// <ChartContainer
//   id={pieId}
//   config={chartConfig}
//   className="mx-auto aspect-square w-full max-w-[240px]"
// >
//   <PieChart>
//     <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
//     <Pie
//       data={data}
//       dataKey="value"
//       nameKey="label"
//       innerRadius={70}          // compact size
//       strokeWidth={4}
//       activeIndex={activeIndex}
//       onMouseEnter={(_, idx) => setActiveIndex(idx)}
//       onMouseLeave={() => setActiveIndex(undefined)}
//       isAnimationActive
//       animationBegin={0}
//       animationDuration={400}
//       animationEasing="ease-out"
//       activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
//         <g>
//           {/* expanded slice */}
//           <Sector
//             {...props}
//             outerRadius={outerRadius + 10}   // smooth pop
//             innerRadius={outerRadius - 12}
//             className="pie-sector-active"    // for glow
//           />
//         </g>
//       )}
//     >
//       <Label
//         content={({ viewBox }) => {
//           if (viewBox && "cx" in viewBox && "cy" in viewBox) {
//             return (
//               <text
//                 x={viewBox.cx}
//                 y={viewBox.cy}
//                 textAnchor="middle"
//                 dominantBaseline="middle"
//               >
//                 <tspan
//                   x={viewBox.cx}
//                   y={viewBox.cy}
//                   className="fill-foreground text-xl font-bold"
//                 >
//                   {formatUSD(total)}
//                 </tspan>
//                 <tspan
//                   x={viewBox.cx}
//                   y={(viewBox.cy || 0) + 18}
//                   className="fill-muted-foreground text-[10px]"
//                 >
//                   Selected Total
//                 </tspan>
//               </text>
//             );
//           }
//           return null;
//         }}
//       />
//     </Pie>
//   </PieChart>
// </ChartContainer>

// {/* Put styles OUTSIDE ChartContainer so it's a single child */}
// <style jsx>{`
//   /* Smooth transitions for all sectors */
//   .recharts-sector {
//     transition: all 0.25s cubic-bezier(.25,.8,.25,1);
//   }
//   /* Hover glow for normal sectors */
//   .recharts-sector:hover {
//     filter:
//       drop-shadow(0 0 6px rgba(255, 165, 0, 0.75))
//       drop-shadow(0 0 12px rgba(255, 165, 0, 0.5));
//   }
//   /* Extra glow for the active expanded sector */
//   .pie-sector-active {
//     filter:
//       drop-shadow(0 0 8px rgba(255, 140, 0, 0.85))
//       drop-shadow(0 0 16px rgba(255, 140, 0, 0.6));
//   }
// `}</style>


//         </div>
//       </div>
//     </Card>
//   );
// };

// // 🧩 Main Modal
// export function CallLogModal({
//   id,
//   open,
//   onOpenChange,
// }: {
//   id?: string;
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
// }) {
//   const [log, setLog] = useState<any | null>(null);
//   const [segments, setSegments] = useState<Array<{ time?: string; speaker?: string; text: string }>>(
//     []
//   );
//   const [analysis, setAnalysis] = useState<any | null>(null);
//   const [signedRecordingUrl, setSignedRecordingUrl] = useState<string | undefined>(undefined);
//   const [messages, setMessages] = useState<any | null>(null);

//   useEffect(() => {
//     async function load() {
//       if (!open || !id) {
//         setLog(null);
//         setSegments([]);
//         setAnalysis(null);
//         setMessages(null);
//         setSignedRecordingUrl(undefined);
//         return;
//       }
//       try {
//         const res = await apiGet<{ success: boolean; log: any }>(`/api/calllogs/${id}`);
//         const l = res.log;
//         setLog(l);

//         const t = typeof l?.transcriptions === "string" ? l.transcriptions : undefined;
//         if (t) {
//           try {
//             const parsed = JSON.parse(t);
//             const segs = Array.isArray(parsed?.segments)
//               ? parsed.segments.map((s: any) => ({
//                   time: s.timestamp,
//                   speaker: s.speaker,
//                   text: s.text,
//                 }))
//               : [];
//             setSegments(segs);
//           } catch {
//             setSegments([]);
//           }
//         }

//         // Signed recording URL
//         if (l?.call_recording_url) {
//           try {
//             const signedRes = await apiGet<{ success: boolean; signed_url: string }>(
//               `/api/voiceagents/calls/${id}/recording-signed-url`
//             );
//             if (signedRes.success && signedRes.signed_url) {
//               setSignedRecordingUrl(signedRes.signed_url);
//             } else {
//               setSignedRecordingUrl(l.call_recording_url);
//             }
//           } catch (signError) {
//             console.error("Failed to fetch signed recording URL:", signError);
//             setSignedRecordingUrl(l.call_recording_url);
//           }
//         }

//         const ra = await apiGet<{ success: boolean; analysis: any }>(`/api/calllogs/${id}/analysis`);
//         setAnalysis(ra.analysis || null);
//         setMessages(ra.analysis || null);
//       } catch {
//         setLog(null);
//         setSegments([]);
//         setAnalysis(null);
//         setMessages(null);
//         setSignedRecordingUrl(undefined);
//       }
//     }
//     load();
//   }, [open, id]);

//   return (
//     <>
//       <div
//         className={cn(
//           "fixed inset-y-0 right-0 z-50 w-full max-w-6xl bg-white border-l shadow-2xl flex flex-col overflow-hidden",
//           open ? "translate-x-0" : "translate-x-full",
//           "transition-transform duration-300 ease-in-out rounded-l-3xl"
//         )}
//       >
//         {/* Header */}
//         <div className="p-6 border-b flex justify-between items-center shadow-sm">
//           <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
//             <Mic className="h-6 w-6 text-orange-500" />
//             <span>Call Details & Insights</span>
//           </h2>
//           <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="hover:bg-orange-100">
//             <X className="h-4 w-4" />
//           </Button>
//         </div>

//         {/* Body */}
//         <div className="flex flex-col h-full p-6 space-y-6 overflow-hidden">
//           <AgentAudioPlayer src={signedRecordingUrl} />

//           <Tabs defaultValue="analysis" className="flex-1 flex flex-col overflow-hidden">
//             <TabsList className="grid grid-cols-4 gap-1 bg-gray-50 rounded-2xl p-1 shadow-inner">
//               <TabsTrigger
//                 value="transcripts"
//                 className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md rounded-xl"
//               >
//                 <Mic className="h-4 w-4" /> Transcripts
//               </TabsTrigger>
//               <TabsTrigger
//                 value="analysis"
//                 className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md rounded-xl"
//               >
//                 <Info className="h-4 w-4" /> Analysis
//               </TabsTrigger>
//               <TabsTrigger
//                 value="messages"
//                 className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md rounded-xl"
//               >
//                 <MessageSquare className="h-4 w-4" /> Messages
//               </TabsTrigger>
//               <TabsTrigger
//                 value="cost"
//                 className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md rounded-xl"
//               >
//                 <DollarSign className="h-4 w-4" /> Cost
//               </TabsTrigger>
//             </TabsList>

//             <TabsContent value="transcripts" className="flex-1 overflow-hidden mt-4 border border-gray-200 rounded-2xl">
//               <TranscriptsTab segments={segments} />
//             </TabsContent>
//             <TabsContent value="analysis" className="flex-1 overflow-hidden mt-4 border border-gray-200 rounded-2xl">
//               <AnalysisTab analysis={analysis} />
//             </TabsContent>
//             <TabsContent value="messages" className="flex-1 overflow-hidden mt-4 border border-gray-200 rounded-2xl">
//               <MessagesTab messages={messages} />
//             </TabsContent>

//             {/* ✅ Pass log & analysis to cost tab */}
//             <TabsContent value="cost" className="flex-1 overflow-hidden mt-4 border border-gray-200 rounded-2xl pt-6">
//               <CallCostTab log={log} analysis={analysis} />
//             </TabsContent>
//           </Tabs>
//         </div>
//       </div>

//       {open && (
//         <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
//       )}
//     </>
//   );
// }
