import React, { useState } from "react";
import { BuilderBottomInput } from "./BuilderBottomInput";
import { X, Sparkles, Copy, Check, MessageSquare, PhoneCall } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function AgentBuilderMasterDraft({
  title = "Review Agent Blueprint",
  description = "Here is the compiled blueprint for your voice agent. Review the prompt and greetings below, then finalize or ask for changes.",
  draft,
  onClose,
  onNext,
  buttonLabel = "Finalize Blueprint",
  phase,
}: {
  title?: string;
  description?: string;
  draft?: {
    agent_prompt?: string;
    outbound_greeting?: string;
    inbound_greeting?: string;
  };
  onClose?: () => void;
  onNext?: (val?: string, action?: string) => void;
  buttonLabel?: string;
  phase?: string;
}) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleCopy = () => {
    if (draft?.agent_prompt) {
      navigator.clipboard.writeText(draft.agent_prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  return (
    <div className="relative flex flex-col items-center w-full max-w-md h-[600px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus:outline-none focus:ring-0">
      
      {/* Header */}
      <div className="w-full shrink-0 flex items-center justify-between p-4 border-b border-slate-100 bg-white/80 z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-emerald-500" />
          <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
            {phase || "Builder / Blueprint"}
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
      <div className="flex-1 w-full flex flex-col pt-5 px-5 overflow-y-auto scrollbar-thin">
        
        {/* Title & Description */}
        <div className="mb-4 space-y-2 px-1 shrink-0 text-center">
          <h2 className="text-lg font-extrabold text-[#0b1957] leading-snug">
            {title}
          </h2>
          {description && (
            <div className="text-xs text-slate-500 leading-relaxed font-medium">
              <ReactMarkdown
                components={{
                  strong: ({ node, ref, ...props }) => <strong className="font-bold" {...props} />,
                  p: ({ node, ref, ...props }) => <p className="leading-relaxed animate-none" {...props} />,
                  ul: ({ node, ref, ...props }) => <ul className="list-disc pl-4 space-y-1 text-left my-1" {...props} />,
                  ol: ({ node, ref, ...props }) => <ol className="list-decimal pl-4 space-y-1 text-left my-1" {...props} />,
                  li: ({ node, ref, ...props }) => <li className="text-slate-500 font-medium" {...props} />,
                }}
              >
                {description}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Blueprint details */}
        <div className="space-y-4 pb-[170px]">
          
          {/* Greetings Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Outbound Greeting */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 hover:shadow-sm transition-all">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1 shrink-0">
                <PhoneCall className="size-3 text-[#0b1957]/70" />
                <span className="text-[9px] font-bold uppercase tracking-widest">
                  Outbound Greeting
                </span>
              </div>
              <p className="text-xs text-[#0b1957] font-semibold leading-relaxed line-clamp-4 overflow-y-auto max-h-[80px] scrollbar-thin">
                {draft?.outbound_greeting || "Not configured"}
              </p>
            </div>

            {/* Inbound Greeting */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 hover:shadow-sm transition-all">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1 shrink-0">
                <MessageSquare className="size-3 text-[#0b1957]/70" />
                <span className="text-[9px] font-bold uppercase tracking-widest">
                  Inbound Greeting
                </span>
              </div>
              <p className="text-xs text-[#0b1957] font-semibold leading-relaxed line-clamp-4 overflow-y-auto max-h-[80px] scrollbar-thin">
                {draft?.inbound_greeting || "Not configured"}
              </p>
            </div>
          </div>

          {/* System Instructions / Prompt */}
          <div className="relative bg-[#0b1957]/5 border border-[#0b1957]/10 rounded-2xl p-4 flex flex-col hover:border-[#0b1957]/20 transition-all">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#0b1957]/60">
                System Instructions & Behavior
              </span>
              {draft?.agent_prompt && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[9px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider"
                  title="Copy full prompt"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="size-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="text-xs text-[#0b1957] leading-relaxed font-mono whitespace-pre-wrap max-h-[220px] overflow-y-auto scrollbar-thin border-t border-[#0b1957]/5 pt-2">
              {draft?.agent_prompt || "No system prompt compiled."}
            </div>
          </div>

        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="absolute bottom-0 left-0 w-full flex flex-col items-center pt-20 pb-4 px-4 bg-gradient-to-t from-white via-white/95 to-transparent z-20 pointer-events-none">
        
        <button
          type="button"
          onClick={() => onNext?.("", "finalize")}
          className="bg-gradient-to-br from-[#0b1957] to-[#1e293b] hover:from-[#152778] active:scale-95 text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-xl shadow-[#0b1957]/20 transition-all mb-3 pointer-events-auto cursor-pointer"
        >
          {buttonLabel}
        </button>

        <div className="w-full pointer-events-auto">
          <BuilderBottomInput 
            onSend={(val) => onNext?.(val, "continue")} 
            placeholder="Describe adjustments or changes..." 
          />
        </div>
      </div>
    
    </div>
  );
}
