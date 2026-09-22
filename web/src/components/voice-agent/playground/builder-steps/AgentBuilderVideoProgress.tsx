import React from "react";
import { Loader2, CheckCircle2, Circle, AlertCircle, Video, Download, ArrowLeft, RotateCcw, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressBlock {
  label: string;
  value: string; // "pending" | "generating prompt" | "generating video" | "analyzing visual flow" | "completed" | "failed"
}

export function AgentBuilderVideoProgress({
  title = "Generating Video Ad...",
  description = "Sequential generation loop is running.",
  blocks = [],
  onClose,
  phase,
  videoUrl,
  status = "active",
  onNext,
  progress,
  onBack,
}: {
  title?: string;
  description?: string;
  blocks?: ProgressBlock[];
  onClose?: () => void;
  phase?: string;
  videoUrl?: string;
  status?: "active" | "completed" | "cancelled" | "failed";
  onNext?: (val?: string) => void;
  progress?: number;
  onBack?: () => void;
}) {
  const [retryCounts, setRetryCounts] = React.useState<Record<string, number>>({});
  const [cooldowns, setCooldowns] = React.useState<Record<string, number>>({});

  const isExtraction = phase?.toLowerCase().includes("dna") || phase?.toLowerCase().includes("extraction") || phase?.toLowerCase().includes("business");

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns((prev) => {
        const next = { ...prev };
        let updated = false;
        for (const key in next) {
          if (next[key] > 0) {
            next[key] -= 1;
            updated = true;
          }
        }
        return updated ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRetry = (key: string, command: string) => {
    const currentCount = retryCounts[key] || 0;
    if (currentCount >= 3) {
      alert("Maximum retry limit of 3 attempts reached for this segment.");
      return;
    }
    setCooldowns((prev) => ({ ...prev, [key]: 15 }));
    setRetryCounts((prev) => ({ ...prev, [key]: currentCount + 1 }));
    onNext?.(command);
  };

  const getBlockKey = (block: ProgressBlock, idx: number): string => {
    const partMatch = block.label.match(/Part (\d+)/);
    const sceneMatch = block.label.match(/Scene (\d+)/);
    return partMatch ? `part_${partMatch[1]}` : sceneMatch ? `scene_${sceneMatch[1]}` : `segment_${idx + 1}`;
  };

  const handleGlobalRetry = () => {
    const failedBlocks = cleanBlocks.filter(b => b.value === "failed");
    let triggeredAny = false;
    
    const nextCooldowns = { ...cooldowns };
    const nextRetryCounts = { ...retryCounts };

    failedBlocks.forEach((block) => {
      const blockIdx = cleanBlocks.indexOf(block);
      const key = getBlockKey(block, blockIdx);
      const currentCount = nextRetryCounts[key] || 0;
      if (currentCount < 3 && !(nextCooldowns[key] > 0)) {
        nextCooldowns[key] = 15;
        nextRetryCounts[key] = currentCount + 1;
        triggeredAny = true;
      }
    });

    if (triggeredAny) {
      setCooldowns(nextCooldowns);
      setRetryCounts(nextRetryCounts);
      onNext?.("[RETRY_FAILED_SEGMENTS]");
    }
  };

  const getWeight = (val: string) => {
    switch (val) {
      case "completed": return 1.0;
      case "analyzing visual flow": return 0.8;
      case "generating video": return 0.5;
      case "generating prompt": return 0.2;
      case "active":
      case "generating": return 0.4;
      default: return 0.0;
    }
  };
  
  // Extract percentage in parentheses/brackets from title, description, or blocks
  let extractedProgress: number | undefined = progress;
  const pctRegex = /[\(\[]\s*(\d+)\s*%\s*[\)\]]/;

  let cleanTitle = title;
  const titleMatch = cleanTitle.match(pctRegex);
  if (titleMatch) {
    extractedProgress = parseInt(titleMatch[1], 10);
    cleanTitle = cleanTitle.replace(pctRegex, "").replace(/\s+/g, " ").trim();
  }

  let cleanDescription = description;
  const descMatch = cleanDescription.match(pctRegex);
  if (descMatch) {
    extractedProgress = parseInt(descMatch[1], 10);
    cleanDescription = cleanDescription.replace(pctRegex, "").replace(/\s+/g, " ").trim();
  }

  const cleanBlocks = blocks.map((block) => {
    let cleanLabel = block.label;
    const blockMatch = cleanLabel.match(pctRegex);
    if (blockMatch) {
      if (extractedProgress === undefined || extractedProgress === progress) {
        extractedProgress = parseInt(blockMatch[1], 10);
      }
      cleanLabel = cleanLabel.replace(pctRegex, "").replace(/\s+/g, " ").trim();
    }
    const blockValue = status === "completed" ? "completed" : block.value;
    return { ...block, label: cleanLabel, value: blockValue };
  });

  const total = cleanBlocks.length || 4;
  const totalWeight = cleanBlocks.reduce((acc, b) => acc + getWeight(b.value), 0);
  const allCompleted = cleanBlocks.length > 0 && cleanBlocks.every((b) => b.value === "completed");
  const progressPercent = status === "completed" ? 100 : (extractedProgress !== undefined ? extractedProgress : (allCompleted ? 100 : Math.min(99, Math.round((totalWeight / total) * 100))));

  const handleDownload = async () => {
    if (!videoUrl) return;
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "video-ad-segment.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Direct download failed, opening in tab:", err);
      const a = document.createElement("a");
      a.href = videoUrl;
      a.target = "_blank";
      a.click();
    }
  };

  // Helper to get status color and icon using theme variables
  const getStatusDetails = (statusVal: string) => {
    switch (statusVal) {
      case "completed":
        return {
          icon: <CheckCircle2 className="size-5 text-blue-500 shrink-0" />,
          statusText: "Completed",
          colorClass: "text-blue-700 dark:text-blue-300 bg-blue-50/40 dark:bg-[#071131] border-blue-100 dark:border-blue-900/40",
        };
      case "active":
      case "generating":
        return {
          icon: <Loader2 className="size-5 text-primary dark:text-blue-400 animate-spin shrink-0" />,
          statusText: "Processing...",
          colorClass: "text-primary dark:text-blue-400 bg-primary/5 dark:bg-[#071131] border-primary/10 dark:border-blue-500/20 animate-pulse",
        };
      case "generating prompt":
        return {
          icon: <Loader2 className="size-5 text-primary dark:text-blue-400 animate-spin shrink-0" />,
          statusText: "Drafting prompt...",
          colorClass: "text-primary dark:text-blue-400 bg-primary/5 dark:bg-[#071131] border-primary/10 dark:border-blue-500/20 animate-pulse",
        };
      case "generating video":
        return {
          icon: <Loader2 className="size-5 text-primary dark:text-blue-400 animate-spin shrink-0" />,
          statusText: "Generating video segment...",
          colorClass: "text-primary dark:text-blue-400 bg-primary/10 dark:bg-[#071131] border-primary/20 dark:border-blue-500/30 animate-pulse",
        };
      case "analyzing visual flow":
        return {
          icon: <Loader2 className="size-5 text-amber-500 animate-spin shrink-0" />,
          statusText: "Analyzing flow continuity...",
          colorClass: "text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-[#071131] border-amber-100 dark:border-amber-900/40 animate-pulse",
        };
      case "failed":
        return {
          icon: <AlertCircle className="size-5 text-red-500 shrink-0" />,
          statusText: "Failed",
          colorClass: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-[#071131] border-red-100 dark:border-red-900/40",
        };
      case "pending":
      default:
        return {
          icon: <Circle className="size-5 text-slate-300 shrink-0" />,
          statusText: "Pending",
          colorClass: "text-slate-400 bg-slate-50/50 dark:bg-[#071131] border-slate-100 dark:border-blue-950/40",
        };
    }
  };

  // Check retry eligibility for global button
  const failedBlocks = cleanBlocks.filter(b => b.value === "failed");
  const retryableFailedBlocks = failedBlocks.filter(b => {
    const key = getBlockKey(b, cleanBlocks.indexOf(b));
    return (retryCounts[key] || 0) < 3 && !(cooldowns[key] > 0);
  });
  const allFailedReachedLimit = failedBlocks.length > 0 && retryableFailedBlocks.length === 0;

  return (
    <div className="relative flex flex-col items-center w-[460px] max-w-full h-[620px] bg-white dark:bg-[#000724] rounded-3xl border border-slate-200 dark:border-blue-950/40 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none">
      {/* Header */}
      <div className="w-full flex shrink-0 items-center justify-between p-4 border-b border-slate-100 dark:border-blue-950/40 bg-white/80 dark:bg-[#081331] z-10">
        <div className="flex items-center gap-2 pl-4">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-1 p-1 hover:bg-slate-100 dark:hover:bg-blue-950/60 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all active:scale-95 border border-transparent hover:border-slate-100 dark:hover:border-blue-900/60"
              aria-label="Go back"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <Video className={cn("size-4 text-primary dark:text-blue-400", status === "active" && "animate-pulse")} />
          <span className="text-[11px] font-bold text-primary dark:text-blue-400 uppercase tracking-wider">
            {phase || "Production Pipeline"}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col pt-6 px-6 overflow-y-auto scrollbar-none">
        <h2 className="text-xl font-bold text-[#0b1957] dark:text-slate-100 text-center leading-snug mb-2">
          {cleanTitle}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 font-medium max-w-[320px] mx-auto leading-relaxed">
          {cleanDescription}
        </p>

        {/* Real-time Video Player Preview */}
        {videoUrl && (status === "completed" || !phase?.includes("Phase 6")) && (
          <div className="w-full flex flex-col items-center mb-6 shrink-0">
            <div className="w-full max-w-[340px] rounded-2xl overflow-hidden border border-slate-200 dark:border-blue-950/40 shadow-lg bg-slate-950 aspect-video relative group">
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
            </div>
            {status === "active" && (
              <button
                onClick={handleDownload}
                className="mt-2 text-[10px] font-bold text-primary dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors active:scale-95 cursor-pointer"
              >
                <Download className="size-3" />
                Download Current Video
              </button>
            )}
          </div>
        )}

        {/* Dynamic Progress Bar (Only show when active) */}
        {status === "active" && (
          <div className="w-full flex items-center justify-between gap-4 mb-6 shrink-0">
            <div className="flex-1 bg-slate-100 dark:bg-[#071131] h-2.5 rounded-full overflow-hidden relative shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-primary dark:from-blue-600 to-blue-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-primary dark:text-blue-400 min-w-[32px] text-right shrink-0">
              {progressPercent}%
            </span>
          </div>
        )}

        {/* Segments Progress List */}
        <div className="flex-1 w-full space-y-3 pb-8">
          {cleanBlocks.map((block, idx) => {
            const { icon, statusText, colorClass } = getStatusDetails(block.value);
            
            const itemKey = getBlockKey(block, idx);
            const cooldown = cooldowns[itemKey] || 0;
            const retryCount = retryCounts[itemKey] || 0;
            const isIndividualFailed = block.value === "failed";
            
            const partMatch = block.label.match(/Part (\d+)/);
            const sceneMatch = block.label.match(/Scene (\d+)/);
            let command = "";
            if (partMatch) {
              command = `[RETRY_PART_${partMatch[1]}]`;
            } else if (sceneMatch) {
              command = `[RETRY_SCENE_${sceneMatch[1]}]`;
            }

            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between p-3.5 border rounded-2xl transition-all shadow-sm",
                  colorClass
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {icon}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                      {block.label}
                    </div>
                    <div className="text-[10px] font-medium opacity-85 mt-0.5">
                      {statusText} {isIndividualFailed && retryCount > 0 && `(Attempt ${retryCount}/3)`}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {isIndividualFailed && (
                    cooldown > 0 ? (
                      <span className="text-[10px] font-bold text-red-650 dark:text-red-400 px-2 py-0.5 bg-red-100 dark:bg-red-950/50 rounded-lg">
                        {cooldown}s
                      </span>
                    ) : (
                      retryCount < 3 && (
                        <button
                          type="button"
                          onClick={() => handleRetry(itemKey, command)}
                          className="p-1 bg-white dark:bg-[#000724] border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg transition-all active:scale-90 cursor-pointer shadow-sm flex items-center justify-center"
                          title="Retry this segment"
                        >
                          <RotateCcw className="size-3.5" />
                        </button>
                      )
                    )
                  )}
                  <div className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/60 dark:bg-[#071131] border border-slate-100 dark:border-blue-950/40 rounded-full">
                    Step {idx + 1}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / Action Controls */}
      <div className="w-full border-t border-slate-100 dark:border-blue-950/40 bg-slate-50/80 dark:bg-[#000724] p-4 flex flex-col items-center justify-center gap-2 shrink-0 z-20">
        {status === "active" ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className="size-3 text-slate-500 dark:text-slate-400 animate-spin" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                {isExtraction ? "Extracting Brand Guidelines..." : "Processing Generation Loop..."}
              </span>
            </div>
            <button
              onClick={() => onNext?.("[CANCEL_VIDEO_GEN]")}
              className="w-full max-w-[280px] py-2 bg-white dark:bg-[#000724] border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 font-bold text-[11px] rounded-xl transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1 shadow-sm"
            >
              {isExtraction ? "Stop Extraction" : "Stop & Keep Video"}
            </button>
          </>
        ) : (
          <div className="w-full flex flex-col gap-2">
            {status === "failed" && (
              <div className="flex w-full gap-2">
                {allFailedReachedLimit ? (
                  <button
                    disabled
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-[#071131] text-slate-400 border border-slate-200 dark:border-blue-950/40 font-bold text-[11px] rounded-xl text-center flex items-center justify-center gap-1.5"
                  >
                    Retry Limit Reached
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGlobalRetry}
                    className="flex-1 py-2.5 bg-gradient-to-br from-[#0b1957] dark:from-blue-600 to-[#1e293b] dark:to-blue-700 hover:from-[#0b1957] dark:hover:from-blue-700 hover:to-[#0b1957] dark:hover:to-blue-800 text-white font-bold text-[11px] rounded-xl transition-all active:scale-95 shadow-md hover:shadow-lg cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="size-3.5" />
                    Retry Failed
                  </button>
                )}

                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => onNext?.("[SKIP_TO_SHOWCASE]")}
                    className="flex-1 py-2.5 bg-gradient-to-br from-blue-600 to-[#0b1957] dark:to-blue-700 hover:from-blue-700 hover:to-[#0b1957] dark:hover:to-blue-800 text-white font-bold text-[11px] rounded-xl transition-all active:scale-95 shadow-md hover:shadow-lg cursor-pointer text-center flex items-center justify-center gap-1"
                  >
                    Skip & View Video
                    <ArrowRight className="size-3.5" />
                  </button>
                )}
              </div>
            )}
            
            <div className="w-full flex items-center justify-center gap-2">
              {!isExtraction && (
                <button
                  type="button"
                  onClick={() => onNext?.("[SHOW_GALLERY]")}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-blue-950/40 hover:bg-slate-50 dark:hover:bg-blue-950/40 text-[#0b1957] dark:text-slate-100 font-bold text-[11px] rounded-xl transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1 shadow-sm"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to Gallery
                </button>
              )}
              {!isExtraction && status !== "completed" && (
                <button
                  type="button"
                  onClick={() => onNext?.("Back to script approval")}
                  className="flex-1 py-2.5 border border-blue-200 dark:border-blue-900/40 hover:bg-blue-50/50 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 bg-blue-50/25 dark:bg-blue-950/25 font-bold text-[11px] rounded-xl transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1 shadow-sm"
                >
                  Back to Script
                </button>
              )}
              {status === "completed" && videoUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 py-2.5 bg-gradient-to-br from-[#0b1957] dark:from-blue-600 to-[#1e293b] dark:to-blue-700 hover:from-[#0b1957] dark:hover:from-blue-700 hover:to-[#0b1957] dark:hover:to-blue-800 text-white font-bold text-[11px] rounded-xl transition-all active:scale-95 shadow-md hover:shadow-lg cursor-pointer text-center flex items-center justify-center gap-1"
                >
                  <Download className="size-3.5" />
                  Download Video
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
