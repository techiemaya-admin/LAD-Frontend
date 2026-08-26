import React from "react";
import { BuilderBottomInput } from "./BuilderBottomInput";
import { X, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function AgentBuilderTextInput({
  question = "Enter your business's name.",
  description = "",
  showSkip = true,
  onClose,
  onNext,
  phase,
  enableUpload = false,
  references = [],
  onUpload,
  onRemove,
  isUploading = false,
  error = "",
}: {
  question?: string;
  description?: string;
  showSkip?: boolean;
  onClose?: () => void;
  onNext?: (val?: string, action?: string) => void;
  phase?: string;
  enableUpload?: boolean;
  references?: { filename: string; thumbnail: string; path: string }[];
  onUpload?: (file: File) => void;
  onRemove?: (path: string) => void;
  isUploading?: boolean;
  error?: string;
}) {
  const handleFilesSelected = (files: FileList) => {
    if (onUpload) {
      Array.from(files).forEach((file) => {
        onUpload(file);
      });
    }
  };

  return (
    <div className="relative flex flex-col items-center w-[448px] max-w-full h-[550px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus:outline-none focus:ring-0">
      
      <div className="w-full flex shrink-0 items-center justify-between p-4 border-b border-slate-100 bg-white/80 z-10">
         <div className="flex items-center gap-2 pl-10">
            <Sparkles className="size-4 text-emerald-500" />
            <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
               {phase || "Builder / Step"}
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

      <div className="relative flex-1 min-h-0 w-full flex flex-col pt-6">
         <div className="flex-grow overflow-y-auto scrollbar-none px-6 pb-12">
            <h2 className="text-xl md:text-2xl font-bold text-[#0b1957] text-center leading-snug">
               {question}
            </h2>
            {description && (
               <div className="mt-4 text-xs md:text-sm text-slate-500 text-center leading-relaxed font-medium">
                 <ReactMarkdown
                   components={{
                     strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                     p: ({ node, ...props }) => <p className="leading-relaxed" {...props} />,
                     ul: ({ node, ...props }) => <ul className="list-disc pl-4 space-y-1 text-left my-2" {...props} />,
                     ol: ({ node, ...props }) => <ol className="list-decimal pl-4 space-y-1 text-left my-2" {...props} />,
                     li: ({ node, ...props }) => <li className="text-slate-500 font-medium" {...props} />,
                   }}
                 >
                   {description}
                 </ReactMarkdown>
               </div>
            )}
         </div>
         {/* Fade overlay at the bottom of the scrollable description area */}
         <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
      </div>

      {/* Uploaded References Thumbnails Area */}
      {enableUpload && (references.length > 0 || isUploading) && (
        <div className="w-full flex flex-col px-8 mb-2 z-10 space-y-1 animate-in fade-in duration-200">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            References ({references.length}/5)
          </div>
          {references.length > 0 && (
            <div className="text-[10px] text-slate-500 font-medium italic mb-1 animate-in fade-in duration-200">
              user has attached {references.length} references with this request.
            </div>
          )}
          <div className="flex flex-wrap gap-2 items-center">
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
      )}

      <div className="w-full flex flex-col mt-auto pb-6 pt-2 bg-gradient-to-t from-white via-white to-transparent relative z-20">
         {showSkip && (
            <div className="w-full flex justify-end px-6 -mb-1 z-10">
              <button 
                 type="button"
                 onClick={() => onNext?.("")}
                 className="px-4 py-1.5 rounded-full border border-slate-200 text-[10px] font-semibold text-slate-400 hover:bg-slate-50 hover:text-[#0b1957] transition-all uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Skip
              </button>
            </div>
         )}
         <BuilderBottomInput 
            onSend={(val) => onNext?.(val)} 
            enableUpload={enableUpload}
            onFilesSelected={handleFilesSelected}
         />
      </div>
    </div>
  );
}
