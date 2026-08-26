import React, { useState } from "react";
import { X, Sparkles, AlertCircle, Film, Check, Trash2, ArrowRight, Maximize2, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { BuilderBottomInput } from "./BuilderBottomInput";
import { cn } from "@/lib/utils";

export function AgentBuilderKeyframesConfirm({
  title = "Review Video Storyboard",
  description = "",
  keyframes = [],
  onClose,
  onNext,
  phase,
  references = [],
  onUpload,
  onRemove,
  isUploading = false,
  error = "",
  onBack,
  feedbackText,
  setFeedbackText,
  isSplitScreen = false,
}: {
  title?: string;
  description?: string;
  keyframes?: string[];
  onClose?: () => void;
  onNext?: (val?: string) => void;
  phase?: string;
  references?: { filename: string; thumbnail: string; path: string }[];
  onUpload?: (file: File) => void;
  onRemove?: (path: string) => void;
  isUploading?: boolean;
  error?: string;
  onBack?: () => void;
  feedbackText?: string;
  setFeedbackText?: (val: string) => void;
  isSplitScreen?: boolean;
}) {
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [localFeedbackText, setLocalFeedbackText] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const currentFeedbackText = feedbackText !== undefined ? feedbackText : localFeedbackText;
  const currentSetFeedbackText = setFeedbackText !== undefined ? setFeedbackText : setLocalFeedbackText;

  const handleFilesSelected = (files: FileList) => {
    if (onUpload) {
      Array.from(files).forEach((file) => {
        onUpload(file);
      });
    }
  };

  const handleAction = (actionType: "confirm" | "cancel" | "change" | "discard" | "regenerate") => {
    if (actionType === "confirm") {
      onNext?.("confirm storyboard");
    } else if (actionType === "cancel") {
      onNext?.("cancel storyboard");
    } else if (actionType === "change" && selectedFrame !== null) {
      onNext?.(`change frame ${selectedFrame}: ${currentFeedbackText}`);
      currentSetFeedbackText("");
      setSelectedFrame(null);
    } else if (actionType === "discard" && selectedFrame !== null) {
      onNext?.(`discard after frame ${selectedFrame}: ${currentFeedbackText}`);
      currentSetFeedbackText("");
      setSelectedFrame(null);
    } else if (actionType === "regenerate") {
      onNext?.(`regenerate storyboard: ${currentFeedbackText}`);
      currentSetFeedbackText("");
      setSelectedFrame(null);
    }
  };

  const isInstructionEmpty = !currentFeedbackText.trim();
  const isGenerating = phase === "Storyboard Generation";

  return (
    <div className="relative flex flex-col items-center w-[460px] max-w-full h-[620px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none">
      {/* Header */}
      <div className="w-full flex shrink-0 items-center justify-between p-4 border-b border-slate-100 bg-white/80 z-10">
        <div className="flex items-center gap-2 pl-4">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-1 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all active:scale-95 border border-transparent hover:border-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <Film className="size-4 text-slate-700 animate-pulse" />
          <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
            {phase || "Storyboard Review"}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all active:scale-95 border border-slate-100"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col pt-4 overflow-y-auto scrollbar-none px-6 pb-2">
        <h2 className="text-xl font-bold text-[#0b1957] text-center leading-snug mb-3">
          {title}
        </h2>
        
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-4 text-center">
          {description}
        </p>

        {/* Storyboard Keyframes Grid */}
        {keyframes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
            <span className="loading loading-ring loading-md"></span>
            <span className="text-xs font-semibold animate-pulse">Generating scene drawings...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {keyframes.map((url, idx) => {
              const isSelected = selectedFrame === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedFrame(isSelected ? null : idx)}
                  className={cn(
                    "relative aspect-video rounded-xl border-2 bg-slate-900 overflow-hidden cursor-pointer group shadow-sm hover:shadow transition-all duration-200 select-none",
                    isSelected ? "border-[#0b1957] ring-2 ring-[#0b1957]/20" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <img src={url} alt={`Frame ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                  
                  {/* Expand Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedIdx(idx);
                    }}
                    className="absolute top-1.5 right-1.5 p-1.5 bg-black/55 hover:bg-black/75 rounded text-white z-30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center opacity-0 group-hover:opacity-100 border border-white/10"
                    title="Expand Image"
                  >
                    <Maximize2 className="size-3" />
                  </button>
                  
                  {/* Badge */}
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[8px] text-white font-bold tracking-wider uppercase z-10">
                    Frame {idx + 1}
                  </div>
                  
                  {/* Selection Overlay */}
                  <div className={cn(
                    "absolute inset-0 bg-[#0b1957]/10 transition-opacity z-20 flex items-center justify-center",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                  )}>
                    {isSelected && (
                      <div className="size-6 rounded-full bg-[#0b1957] border-2 border-white flex items-center justify-center shadow-md">
                        <Check className="size-3.5 text-white stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Uploaded References List (For frame feedback) */}
        {references.length > 0 && (
          <div className="w-full flex flex-col mb-4 space-y-1">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Attached References
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {references.map((ref) => (
                <div key={ref.path} className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm group">
                  <img src={ref.thumbnail} alt={ref.filename} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemove?.(ref.path)}
                    className="absolute top-0.5 right-0.5 bg-slate-900/70 hover:bg-slate-950 text-white rounded-full p-0.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
              {isUploading && (
                <div className="w-10 h-10 rounded-lg border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 animate-pulse">
                  <span className="loading loading-spinner loading-xs text-slate-400"></span>
                </div>
              )}
            </div>
            {error && <div className="text-[9px] text-red-500 font-semibold">{error}</div>}
          </div>
        )}
      </div>

      {/* Action Buttons Panel */}
      <div className="w-full flex-shrink-0 flex flex-col gap-2 px-6 pt-2 pb-2.5 border-t border-slate-50 bg-white">
        {selectedFrame !== null ? (
          <div className="flex gap-2">
            <div 
              title={isInstructionEmpty ? "First type the change request in the input box" : undefined}
              className="flex-1 flex"
            >
              <button
                type="button"
                disabled={isInstructionEmpty}
                onClick={() => handleAction("change")}
                className="w-full py-2 bg-gradient-to-br from-[#0b1957] to-[#1e293b] hover:from-[#0b1957] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[10px] rounded-xl transition-all active:scale-95 shadow-sm hover:shadow"
              >
                Request Frame Changes
              </button>
            </div>
            <div 
              title={isInstructionEmpty ? "First type the change request in the input box" : undefined}
              className="flex-1 flex"
            >
              <button
                type="button"
                disabled={isInstructionEmpty}
                onClick={() => handleAction("discard")}
                className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[10px] rounded-xl transition-all active:scale-95 shadow-sm hover:shadow flex items-center justify-center gap-1"
              >
                <Trash2 className="size-3" />
                Discard After This
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 w-full">
            <button
              type="button"
              disabled={isGenerating || keyframes.length === 0}
              onClick={() => handleAction("confirm")}
              className="w-full py-2.5 bg-gradient-to-br from-[#0b1957] to-[#1e293b] hover:from-[#0b1957] hover:to-[#0b1957] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
            >
              <Film className="size-3.5" />
              Confirm Storyboard & Generate Video
            </button>
            <div className="flex gap-2 w-full">
              <div 
                title={isInstructionEmpty ? "First type the change request in the input box" : undefined}
                className="flex-1 flex"
              >
                <button
                  type="button"
                  disabled={isInstructionEmpty || isGenerating}
                  onClick={() => handleAction("regenerate")}
                  className="w-full py-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 font-bold text-[10px] rounded-xl transition-all"
                >
                  Regenerate Storyboard
                </button>
              </div>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => handleAction("cancel")}
                className="flex-1 py-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 font-bold text-[10px] rounded-xl transition-all"
              >
                Cancel Storyboard
              </button>
            </div>
          </div>
        )}
        {selectedFrame !== null && isInstructionEmpty && (
          <div className="flex items-center gap-1 mt-1.5 text-[9px] text-amber-600 font-bold justify-center select-none">
            <AlertCircle className="size-3 shrink-0" />
            <span>
              {isSplitScreen
                ? "First type the request in the input box to enable action buttons."
                : "Type change instructions below to enable action buttons."}
            </span>
          </div>
        )}
      </div>

      {/* Dynamic input bar for instructions */}
      {!isSplitScreen && (
        <div className="w-full flex flex-col pb-4 pt-2 bg-white relative z-20 border-t border-slate-50 shrink-0">
          <BuilderBottomInput
            value={currentFeedbackText}
            onChange={currentSetFeedbackText}
            onSend={(val) => {
              if (selectedFrame !== null) {
                onNext?.(`change frame ${selectedFrame}: ${val || ""}`);
                setSelectedFrame(null);
                currentSetFeedbackText("");
              } else {
                onNext?.(`regenerate storyboard: ${val || ""}`);
                currentSetFeedbackText("");
              }
            }}
            placeholder={
              selectedFrame !== null
                ? `*Mandatory*: Describe changes for Frame ${selectedFrame + 1}...`
                : "Feedback instructions to regenerate storyboard..."
            }
            enableUpload={true}
            onFilesSelected={handleFilesSelected}
          />
        </div>
      )}

      {/* Expanded Lightbox Modal Overlay */}
      {expandedIdx !== null && (
        <div className="absolute inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          {/* Close button */}
          <button
            type="button"
            onClick={() => setExpandedIdx(null)}
            className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white/80 hover:text-white transition-all active:scale-95 border border-white/10 z-55"
          >
            <X className="size-5" />
          </button>

          {/* Prev Arrow */}
          <button
            type="button"
            disabled={expandedIdx === 0}
            onClick={() => setExpandedIdx(prev => prev !== null && prev > 0 ? prev - 1 : prev)}
            className="absolute left-4 p-3 bg-black/40 hover:bg-black/60 disabled:opacity-20 disabled:cursor-not-allowed text-white/80 hover:text-white rounded-full transition-all border border-white/10 z-55 opacity-50 hover:opacity-100"
          >
            <ChevronLeft className="size-6" />
          </button>

          {/* Image */}
          <div className="max-w-full max-h-[80%] flex flex-col items-center justify-center gap-3">
            <img
              src={keyframes[expandedIdx]}
              alt={`Frame ${expandedIdx + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10"
            />
            <div className="px-3 py-1 bg-black/45 backdrop-blur-sm rounded-full text-xs text-white/95 font-bold tracking-wider">
              Frame {expandedIdx + 1} of {keyframes.length}
            </div>
          </div>

          {/* Next Arrow */}
          <button
            type="button"
            disabled={expandedIdx === keyframes.length - 1}
            onClick={() => setExpandedIdx(prev => prev !== null && prev < keyframes.length - 1 ? prev + 1 : prev)}
            className="absolute right-4 p-3 bg-black/40 hover:bg-black/60 disabled:opacity-20 disabled:cursor-not-allowed text-white/80 hover:text-white rounded-full transition-all border border-white/10 z-55 opacity-50 hover:opacity-100"
          >
            <ChevronRight className="size-6" />
          </button>
        </div>
      )}
    </div>
  );
}
