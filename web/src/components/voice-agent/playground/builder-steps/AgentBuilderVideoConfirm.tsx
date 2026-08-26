import React from "react";
import { X, Sparkles, AlertCircle, Film, Play, Loader2, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { BuilderBottomInput } from "./BuilderBottomInput";

export function AgentBuilderVideoConfirm({
  title = "Ready to Animate?",
  description = "",
  image = "",
  onClose,
  onNext,
  phase,
  references = [],
  onUpload,
  onRemove,
  isUploading = false,
  error = "",
  onBack,
}: {
  title?: string;
  description?: string;
  image?: string;
  onClose?: () => void;
  onNext?: (val?: string) => void;
  phase?: string;
  references?: { filename: string; thumbnail: string; path: string }[];
  onUpload?: (file: File) => void;
  onRemove?: (path: string) => void;
  isUploading?: boolean;
  error?: string;
  onBack?: () => void;
}) {
  const handleFilesSelected = (files: FileList) => {
    if (onUpload) {
      Array.from(files).forEach((file) => {
        onUpload(file);
      });
    }
  };

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
            {phase || "Confirm Animation"}
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
      <div className="relative flex-1 min-h-0 w-full flex flex-col pt-4 overflow-y-auto scrollbar-none px-6">
        <h2 className="text-xl font-bold text-[#0b1957] text-center leading-snug mb-4">
          {title}
        </h2>

        {/* Prepared Motion Prompt */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4 text-xs text-slate-600 leading-relaxed font-medium">
          <div className="flex items-center gap-1.5 mb-2 text-[#0b1957] font-bold uppercase tracking-wider text-[9px]">
            <Sparkles className="size-3 text-emerald-500 animate-pulse" /> Enhanced Motion Prompt
          </div>
          <div className="italic text-slate-500 max-h-[140px] overflow-y-auto pr-1">
            <ReactMarkdown>{description}</ReactMarkdown>
          </div>
        </div>

        {/* Note about sound and rates */}
        <div className="flex items-start gap-2 p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl text-[10px] text-slate-500 mb-4 font-medium">
          <AlertCircle className="size-3.5 text-blue-600 shrink-0 mt-0.5" />
          <span>
            Veo 3.1 Lite generates a premium video with sound enabled. This process takes ~30 seconds.
          </span>
        </div>

        {/* Concept Frame & Uploaded References Area */}
        <div className="w-full flex flex-col mb-4 space-y-1">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Concept Frame & References
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Preselected Concept Frame Image (Read-only, Cannot be removed) */}
            {image && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-blue-500/40 bg-slate-50 shadow-sm group">
                <img src={image} alt="Concept Frame" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-blue-600/90 text-white text-[7px] font-bold text-center py-0.5 uppercase tracking-wide">
                  Frame
                </div>
                <button
                  type="button"
                  className="absolute top-0.5 right-0.5 bg-slate-400/80 hover:bg-slate-500 text-white rounded-full p-0.5 shadow-sm cursor-not-allowed transition-colors"
                  title="preselected frame"
                  onClick={(e) => e.stopPropagation()}
                >
                  <X className="size-2.5" />
                </button>
              </div>
            )}

            {/* User Uploaded References */}
            {references.map((ref) => (
              <div key={ref.path} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm group">
                <img src={ref.thumbnail} alt={ref.filename} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemove?.(ref.path)}
                  className="absolute top-0.5 right-0.5 bg-slate-900/70 hover:bg-slate-950 text-white rounded-full p-0.5 shadow-sm transition-colors cursor-pointer"
                  aria-label="Remove image"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}

            {isUploading && (
              <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 animate-pulse">
                <Loader2 className="size-4 text-slate-400 animate-spin" />
              </div>
            )}
          </div>
          {error && (
            <div className="text-[10px] text-red-500 font-semibold mt-1">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex-shrink-0 flex items-center gap-3 px-6 pt-2 pb-1 border-t border-slate-50 bg-white">
        <button
          type="button"
          onClick={() => onNext?.("No, cancel")}
          className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-[#0b1957] font-bold text-xs rounded-full transition-all active:scale-95 cursor-pointer text-center"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onNext?.("Yes, generate video")}
          className="flex-1 py-3 bg-gradient-to-br from-[#0b1957] to-[#1e293b] hover:from-[#0b1957] hover:to-[#0b1957] text-white font-bold text-xs rounded-full transition-all active:scale-95 shadow-md hover:shadow-lg shadow-[#0b1957]/10 cursor-pointer text-center flex items-center justify-center gap-1.5"
        >
          <Film className="size-3.5" />
          Generate Video
        </button>
      </div>

      {/* Refinement input bar */}
      <div className="w-full flex flex-col pb-4 pt-2 bg-white relative z-20 border-t border-slate-50">
        <BuilderBottomInput
          onSend={(val) => onNext?.(val)}
          placeholder="Refine animation prompt..."
          enableUpload={true}
          onFilesSelected={handleFilesSelected}
        />
      </div>
    </div>
  );
}
