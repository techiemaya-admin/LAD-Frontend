import React, { useState, useRef } from "react";
import { Mic, Send, Plus } from "lucide-react";

export function BuilderBottomInput({ 
  onSend, 
  placeholder = "Type your response...",
  enableUpload = false,
  onFilesSelected,
  value,
  onChange
}: { 
  onSend?: (val?: string) => void;
  placeholder?: string;
  enableUpload?: boolean;
  onFilesSelected?: (files: FileList) => void;
  value?: string;
  onChange?: (val: string) => void;
}) {
  const [internalVal, setInternalVal] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isControlled = value !== undefined;
  const val = isControlled ? value : internalVal;
  const setVal = (v: string) => {
    if (isControlled) {
      onChange?.(v);
    } else {
      setInternalVal(v);
    }
  };

  const handleSubmit = () => {
    if (onSend) onSend(val);
    if (!isControlled) setInternalVal("");
  };

  return (
    <div className="w-full flex justify-center mt-2 px-2 pb-2">
      <div className="w-full relative flex items-center bg-slate-50/80 dark:bg-[#071131] backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-blue-950/40 shadow-sm p-1.5 transition-all focus-within:shadow-md focus-within:border-[#0b1957]/30 dark:focus-within:border-blue-500/50">
        {enableUpload ? (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 shrink-0 text-[#0b1957]/50 dark:text-slate-400 hover:text-[#0b1957] dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-blue-950/60 cursor-pointer"
              aria-label="Add attachment"
            >
              <div className="border border-current rounded-full p-0.5">
                <Plus className="size-4" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files) onFilesSelected?.(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        <input
          type="text"
          placeholder={placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          className="media-builder-prompt flex-1 bg-transparent border-none outline-none text-sm text-[#0b1957] dark:text-slate-100 placeholder:text-slate-400 px-2"
        />

        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          <button
            type="button"
            className="p-2.5 bg-transparent hover:bg-slate-200 dark:hover:bg-blue-900/60 rounded-full text-[#0b1957]/70 dark:text-slate-300 hover:text-[#0b1957] dark:hover:text-white transition-all cursor-pointer"
            aria-label="Voice input"
          >
            <Mic className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="p-2.5 bg-gradient-to-br from-[#0b1957] dark:from-blue-600 to-[#1e293b] dark:to-blue-700 hover:to-[#0b1957] dark:hover:to-blue-800 active:scale-95 rounded-full text-white transition-all shadow-md cursor-pointer"
            aria-label="Send"
          >
            <Send className="size-4 -ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
