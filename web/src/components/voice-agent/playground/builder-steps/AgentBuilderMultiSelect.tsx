import React, { useState } from "react";
import { X, Sparkles, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  id: string;
  label: string;
}

export function AgentBuilderMultiSelect({
  question,
  description,
  options,
  onClose,
  onNext,
}: {
  question: string;
  description?: string;
  options: MultiSelectOption[];
  onClose?: () => void;
  onNext?: (val?: string[], action?: string) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Layout rule: stack rows up to 4 options, wrap chips if more.
  const isStacked = options.length <= 4;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="relative flex flex-col items-center w-full max-w-md h-[600px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      
      <div className="w-full flex w-shrink-0 items-center justify-between p-4 border-b border-slate-100 bg-white/80 z-10">
         <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-500" />
            <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
               Builder / Multi-Select
            </span>
         </div>
         {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all active:scale-95 border border-slate-100"
            >
              <X className="size-4" />
            </button>
         )}
      </div>

      <div className="flex-1 w-full flex flex-col pt-6 px-6 overflow-y-auto scrollbar-none pb-4">
        
        {/* Texts */}
        <div className="mb-6 space-y-4 px-2">
          {question.split('\n').map((line, i) => (
             <p key={i} className={cn(
                 "text-center text-[#0b1957]",
                 i === 0 ? "text-[16px] font-bold leading-tight" : "text-[14px] font-semibold text-slate-500 leading-relaxed"
             )}>
                {line}
             </p>
          ))}
          {description && (
             <p className="text-sm text-slate-400 text-center leading-relaxed">
               {description}
             </p>
          )}
        </div>

        {/* Options */}
        <div className={cn(
            "w-full pb-10",
            isStacked ? "flex flex-col gap-3" : "flex flex-wrap gap-2.5 justify-center"
        )}>
          {options.map((opt) => {
            const isSelected = selectedIds.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleSelect(opt.id)}
                className={cn(
                  "bg-white border text-left text-sm text-[#0b1957] flex items-center gap-3 transition-all hover:bg-slate-50 group",
                  isStacked ? "w-full rounded-2xl px-5 py-4 shadow-sm hover:shadow-md" : "w-auto rounded-full px-4 py-2 hover:shadow-sm",
                  isSelected ? "border-[#0b1957] ring-1 ring-[#0b1957] shadow-md z-10 bg-slate-50" : "border-slate-200"
                )}
              >
                <div className="shrink-0 transition-colors duration-200 text-slate-300 group-hover:text-[#0b1957]/50">
                   {isSelected ? <CheckSquare className="size-4 text-[#0b1957]" /> : <Square className="size-4" />}
                </div>
                <span className={cn("flex-1 font-medium", isStacked ? "truncate" : "")}>{opt.label}</span>
              </button>
            );
          })}

          {/* Plus custom option */}
          {showCustomInput ? (
            <div className={cn("w-full animate-in fade-in zoom-in-95 mt-1", isStacked ? "" : "w-full")}>
                <input 
                  type="text" 
                  placeholder="Type your option..." 
                  className="w-full bg-white border border-[#0b1957] rounded-2xl px-5 py-4 text-sm text-[#0b1957] shadow-lg outline-none focus:ring-2 focus:ring-[#0b1957]/20" 
                  autoFocus 
                  onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim() && onNext) {
                          const customVal = e.currentTarget.value.trim();
                          const existingLabels = selectedIds.map(id => options.find(o => o.id === id)?.label).filter(Boolean) as string[];
                          onNext([...existingLabels, customVal]);
                      }
                  }}
                />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className={cn(
                "border border-slate-300 border-dashed text-left text-sm text-slate-500 font-medium flex items-center gap-3 hover:bg-slate-50 hover:text-[#0b1957] transition-all",
                isStacked ? "w-full rounded-2xl px-5 py-3.5 bg-transparent" : "w-auto rounded-full px-4 py-2 bg-transparent/50"
              )}
            >
              <div className="size-3.5 flex items-center justify-center shrink-0">
                  <span className="text-xl leading-none -mt-0.5">+</span>
              </div>
              <span>something different ..?</span>
            </button>
          )}
        </div>
      </div>

      <div className="w-full flex-shrink-0 flex justify-end pb-8 px-6 pt-2 bg-gradient-to-t from-white via-white to-transparent relative z-20">
         <button
            type="button"
            onClick={() => {
                if (onNext) {
                   const selectedLabels = selectedIds.map(id => options.find(o => o.id === id)?.label).filter(Boolean) as string[];
                   onNext(selectedLabels);
                }
            }}
            disabled={selectedIds.length === 0 && !showCustomInput}
            className={cn(
               "px-8 py-3 rounded-full font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2",
               (selectedIds.length > 0 || showCustomInput) 
                  ? "bg-gradient-to-br from-[#0b1957] to-[#1e293b] text-white hover:shadow-xl shadow-[#0b1957]/20 cursor-pointer" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none"
            )}
         >
            Finalize Choices
         </button>
      </div>
    
    </div>
  );
}
