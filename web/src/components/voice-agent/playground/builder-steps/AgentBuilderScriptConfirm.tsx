import React from "react";
import { X, Sparkles, ScrollText, Check, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { BuilderBottomInput } from "./BuilderBottomInput";

export function AgentBuilderScriptConfirm({
  title = "Approve Ad Script?",
  description = "",
  options = [],
  onClose,
  onNext,
  phase,
  onBack,
}: {
  title?: string;
  description?: string;
  options?: (string | { id: string; label: string })[];
  onClose?: () => void;
  onNext?: (val?: string) => void;
  phase?: string;
  onBack?: () => void;
}) {
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
          <ScrollText className="size-4 text-slate-700" />
          <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
            {phase || "Script Writing"}
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

        {/* Detailed Script Markdown Block */}
        <div className="flex-1 min-h-0 bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-4 overflow-y-auto scrollbar-none text-xs text-slate-600 leading-relaxed font-medium">
          <div className="flex items-center gap-1.5 mb-3 text-[#0b1957] font-bold uppercase tracking-wider text-[9px]">
            <Sparkles className="size-3 text-emerald-500 animate-pulse" /> Master Ad Script (1 Minute)
          </div>
          <div className="prose prose-slate prose-xs max-w-none text-slate-600 italic">
            <ReactMarkdown
              components={{
                h3: ({ node, ...props }) => <h3 className="text-[11px] font-bold text-[#0b1957] mt-3 mb-1 uppercase tracking-wide" {...props} />,
                p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-bold text-slate-700" {...props} />,
              }}
            >
              {description}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex-shrink-0 flex items-center gap-3 px-6 pt-2 pb-1 border-t border-slate-50 bg-white">
        <div className="flex w-full items-center gap-3">
          <button
            type="button"
            onClick={() => onNext?.("No, cancel")}
            className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-[#0b1957] font-bold text-xs rounded-full transition-all active:scale-95 cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onNext?.("Yes, approve script")}
            className="flex-1 py-3 bg-gradient-to-br from-[#0b1957] to-[#1e293b] hover:from-[#0b1957] hover:to-[#0b1957] text-white font-bold text-xs rounded-full transition-all active:scale-95 shadow-md hover:shadow-lg shadow-[#0b1957]/10 cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <Check className="size-3.5" />
            Approve Script
          </button>
        </div>
      </div>

      {/* Refinement input bar */}
      <div className="w-full flex flex-col pb-4 pt-2 bg-white relative z-20 border-t border-slate-50">
        <BuilderBottomInput
          onSend={(val) => onNext?.(val)}
          placeholder="Refine script requirements..."
          enableUpload={false}
        />
      </div>
    </div>
  );
}
