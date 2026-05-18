import React from "react";
import { BuilderBottomInput } from "./BuilderBottomInput";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SummaryBlock {
  id: string;
  title: string;
  content: string | React.ReactNode;
}

export function AgentBuilderSummary({
  title,
  description,
  blocks,
  onClose,
  onNext,
}: {
  title: string;
  description?: string;
  blocks: SummaryBlock[];
  onClose?: () => void;
  onNext?: (val?: string, action?: string) => void;
}) {
  return (
    <div className="relative flex flex-col items-center w-full max-w-md h-[600px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      
      <div className="w-full flex w-shrink-0 items-center justify-between p-4 border-b border-slate-100 bg-white/80 z-10">
         <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-500" />
            <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
               Builder / Summary
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

      <div className="flex-1 w-full flex flex-col pt-6 px-6 overflow-y-auto scrollbar-none">
        
        <div className="mb-6 space-y-4 px-2 shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-[#0b1957] text-center leading-snug">
             {title}
          </h2>
          {description && (
             <p className="text-sm text-slate-500 text-center leading-relaxed font-medium">
               {description}
             </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pb-[180px]">
          {blocks.map((block, index) => {
            const isWide = index === 0 || index === 3 || index === 4;
            
            return (
              <div 
                key={block.id} 
                className={cn(
                  "bg-slate-50 rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow",
                  isWide ? "col-span-2" : "col-span-1",
                  "max-h-[160px]" 
                )}
              >
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 shrink-0">
                  {block.title}
                </h3>
                <div className="text-sm text-[#0b1957] leading-relaxed font-bold overflow-y-auto scrollbar-thin">
                  {block.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full flex flex-col items-center pt-24 pb-4 px-4 bg-gradient-to-t from-white via-white/95 to-transparent z-20 pointer-events-none">
        
        <button 
           type="button"
           onClick={() => onNext?.("", "finalize")}
           className="bg-gradient-to-br from-[#0b1957] to-[#1e293b] hover:from-[#152778] active:scale-95 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-xl shadow-[#0b1957]/20 transition-all mb-3 pointer-events-auto"
        >
          Finalize Agent
        </button>

        <div className="w-full pointer-events-auto">
           <BuilderBottomInput onSend={(val) => onNext?.(val, "continue")} placeholder="or continue iterating..." />
        </div>
      </div>
    
    </div>
  );
}
