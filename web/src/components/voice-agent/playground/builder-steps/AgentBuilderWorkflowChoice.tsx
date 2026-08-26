import React from "react";
import { X, Sparkles, Film, Layers, LayoutGrid, ArrowLeft } from "lucide-react";

interface WorkflowChoiceProps {
  title?: string;
  description?: string;
  options?: (string | { id: string; label: string })[];
  onClose?: () => void;
  onNext?: (val?: string) => void;
  phase?: string;
  onBack?: () => void;
}

export function AgentBuilderWorkflowChoice({
  title = "Select Video Generation Workflow",
  description = "Choose how you want to partition and generate your video ad.",
  options = [],
  onClose,
  onNext,
  phase,
  onBack,
}: WorkflowChoiceProps) {
  
  // Custom metadata for each workflow option card
  const workflows = [
    {
      keyword: "workflow 1",
      icon: <Film className="size-5 text-indigo-500" />,
      badge: "Dialogue & Control",
      title: "Dialogue-Rich Storyboard",
      desc: "Generates storyboard keyframes for review first, then animates scenes with spoken dialogues from the script.",
      defaultOption: "Workflow 1: Dialogue-Rich Storyboard (Key-Frame + Dialogue)"
    },
    {
      keyword: "workflow 2",
      icon: <Layers className="size-5 text-violet-500" />,
      badge: "Fast & Long",
      title: "Multi-Segment Parallel Loop",
      desc: "Splits script into parts, generates them in parallel, and stitches them. Ideal for rich 1-minute ads.",
      defaultOption: "Workflow 2: Multi-Segment Parallel Loop (Max 1 min)"
    },
    {
      keyword: "workflow 3",
      icon: <LayoutGrid className="size-5 text-emerald-500" />,
      badge: "Most Creative Control",
      title: "Keyframe Directed Storyboard",
      desc: "Generates keyframes for review first, then animates transitions. Best for custom storytelling.",
      defaultOption: "Workflow 3: Key-Frame Directed Storyboard (First-Last Frame Video)"
    }
  ];

  const handleSelect = (optionLabel: string) => {
    onNext?.(optionLabel);
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
          <Sparkles className="size-4 text-[#0b1957]" />
          <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
            {phase || "Workflow Selection"}
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
      <div className="relative flex-1 min-h-0 w-full flex flex-col pt-5 px-6 overflow-y-auto scrollbar-none pb-4">
        <h2 className="text-xl font-bold text-[#0b1957] text-center leading-snug mb-2">
          {title}
        </h2>
        <p className="text-xs text-slate-500 text-center mb-6 font-medium max-w-[320px] mx-auto leading-relaxed">
          {description}
        </p>

        {/* Workflow Selection Cards */}
        <div className="flex-1 w-full space-y-4">
          {workflows.map((wf, idx) => {
            // Find corresponding option label from props, fallback to default
            const optionObj = options.find(opt => {
              const label = typeof opt === "string" ? opt : opt.label;
              return label.toLowerCase().includes(wf.keyword);
            });
            const optionLabel = optionObj ? (typeof optionObj === "string" ? optionObj : optionObj.label) : wf.defaultOption;
            
            return (
              <button
                key={idx}
                onClick={() => handleSelect(optionLabel)}
                className="w-full text-left flex items-start gap-4 p-4 bg-white border border-slate-150 hover:border-primary/30 hover:bg-primary/[0.01] rounded-2xl transition-all shadow-sm hover:shadow active:scale-[0.99] cursor-pointer group"
              >
                <div className="size-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 group-hover:bg-primary/5 group-hover:border-primary/10 transition-colors">
                  {wf.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-[#0b1957]">
                      {wf.title}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                      {wf.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">
                    {wf.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="w-full border-t border-slate-50 bg-white p-4 shrink-0 flex items-center justify-center">
        <button
          onClick={onBack || (() => {
            const backObj = options.find(opt => {
              const label = typeof opt === "string" ? opt : opt.label;
              return label.toLowerCase().includes("back");
            });
            const backOpt = backObj ? (typeof backObj === "string" ? backObj : backObj.label) : "Back to script";
            handleSelect(backOpt);
          })}
          className="text-xs font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
        >
          <ArrowLeft className="size-3.5" />
          Back to script writing
        </button>
      </div>
    </div>
  );
}
