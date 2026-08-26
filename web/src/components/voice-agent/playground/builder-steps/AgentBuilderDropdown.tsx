import React, { useState } from "react";
import { X, Sparkles, ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export interface DropdownOption {
  id: string;
  label: string;
}

export function AgentBuilderDropdown({
  question,
  description,
  options = [],
  onClose,
  onNext,
  phase,
}: {
  question: string;
  description?: string;
  options: DropdownOption[];
  onClose?: () => void;
  onNext?: (val?: string, action?: string) => void;
  phase?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedOption = options.find((opt) => opt.id === selectedId);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative flex flex-col items-center w-full max-w-md h-[600px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus:outline-none focus:ring-0">
      
      {/* Header */}
      <div className="w-full flex flex-shrink-0 items-center justify-between p-4 border-b border-slate-100 bg-white/80 z-25">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-emerald-500" />
          <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
            {phase || "Builder / Select"}
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

      {/* Content */}
      <div className="flex-1 w-full flex flex-col pt-6 px-6 overflow-y-auto scrollbar-none pb-4">
        
        {/* Texts */}
        <div className="mb-6 space-y-4 px-2">
          <h2 className="text-center text-[#0b1957] text-[16px] font-bold leading-tight">
            {question}
          </h2>
          {description && (
            <div className="text-sm text-slate-500 text-center leading-relaxed font-medium">
              <ReactMarkdown
                components={{
                  strong: ({ node, ref, ...props }) => <strong className="font-bold" {...props} />,
                  p: ({ node, ref, ...props }) => <p className="leading-relaxed" {...props} />,
                  ul: ({ node, ref, ...props }) => <ul className="list-disc pl-4 space-y-1 text-left my-2" {...props} />,
                  ol: ({ node, ref, ...props }) => <ol className="list-decimal pl-4 space-y-1 text-left my-2" {...props} />,
                  li: ({ node, ref, ...props }) => <li className="text-slate-500 font-medium" {...props} />,
                }}
              >
                {description}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Dropdown Container */}
        <div className="relative w-full px-2 pb-10">
          
          {/* Trigger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-2xl px-5 py-4 text-sm text-[#0b1957] font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0b1957]/15"
          >
            <span className={cn(selectedOption ? "text-[#0b1957]" : "text-slate-400 font-normal")}>
              {selectedOption ? selectedOption.label : "Choose an option..."}
            </span>
            <ChevronDown className={cn("size-4 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
          </button>

          {/* Options Panel */}
          {isOpen && (
            <div className="absolute left-2 right-2 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden flex flex-col max-h-[300px] animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* Search Box */}
              {options.length > 5 && (
                <div className="relative border-b border-slate-100 px-4 py-3 bg-slate-50 flex items-center">
                  <Search className="absolute left-4 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search options..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 bg-transparent text-sm text-[#0b1957] outline-none placeholder:text-slate-400 font-medium"
                    autoFocus
                  />
                </div>
              )}

              {/* Scrollable Options List */}
              <div className="overflow-y-auto flex-1 max-h-[240px] scrollbar-none py-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelect(opt.id)}
                      className={cn(
                        "w-full flex items-center justify-between text-left text-sm px-5 py-3.5 transition-colors font-medium",
                        selectedId === opt.id
                          ? "bg-slate-50 text-[#0b1957] font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-[#0b1957]"
                      )}
                    >
                      <span className="truncate pr-4">{opt.label}</span>
                      {selectedId === opt.id && <Check className="size-4 text-[#0b1957] shrink-0" />}
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400 font-medium">
                    No matching options found.
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Submit Button */}
      <div className="w-full flex-shrink-0 flex justify-end pb-8 px-6 pt-2 bg-gradient-to-t from-white via-white to-transparent relative z-20 border-t border-slate-50">
        <button
          type="button"
          onClick={() => {
            if (selectedId && onNext) {
              onNext(selectedId);
            }
          }}
          disabled={!selectedId}
          className={cn(
            "px-8 py-3 rounded-full font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2",
            selectedId
              ? "bg-gradient-to-br from-[#0b1957] to-[#1e293b] text-white hover:shadow-xl shadow-[#0b1957]/20 cursor-pointer"
              : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none"
          )}
        >
          Submit
        </button>
      </div>

    </div>
  );
}
