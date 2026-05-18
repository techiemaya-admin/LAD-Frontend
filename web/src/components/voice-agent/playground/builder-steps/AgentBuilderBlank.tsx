import React from "react";
import { BuilderBottomInput } from "./BuilderBottomInput";
import { X, Sparkles } from "lucide-react";

export function AgentBuilderBlank({
  htmlContent,
  onClose,
  onNext
}: {
  htmlContent: string;
  onClose?: () => void;
  onNext?: (val?: string, action?: string) => void;
}) {
  return (
    <div className="relative flex flex-col items-center w-full max-w-md h-[600px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      
      <div className="w-full shrink-0 flex items-center justify-between p-4 border-b border-slate-100 bg-white/80 z-10">
         <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-500" />
            <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
               Builder / Result
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

      <div 
        className="flex-1 w-full overflow-y-auto px-6 py-6 text-[#0b1957] prose prose-sm prose-p:leading-relaxed prose-headings:text-[#0b1957] prose-a:text-[#1e293b] prose-strong:text-[#0b1957] scrollbar-thin"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      <div className="w-full flex shrink-0 flex-col mt-auto pb-4 pt-4 bg-gradient-to-t from-white via-white to-transparent relative z-20">
         <BuilderBottomInput onSend={(val) => onNext?.(val)} />
      </div>
    
    </div>
  );
}
