import React, { useState } from "react";
import { X, Sparkles, Volume2, Music, Speech, Move } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export interface VoiceConfigPayload {
  speed: number;
  pitch: number;
  volume: number;
  background_sound_on: boolean;
  background_sound_url: string;
  background_sound_volume: number;
}

export function AgentBuilderConfigs({
  question = "Configure Voice & Ambience Settings",
  description = "Fine-tune the tone, speed, volume, and ambient environment of your voice agent.",
  onClose,
  onNext,
  phase,
}: {
  question?: string;
  description?: string;
  onClose?: () => void;
  onNext?: (val?: string, action?: string) => void;
  phase?: string;
}) {
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [bgOn, setBgOn] = useState<boolean>(true);
  const [bgUrl, setBgUrl] = useState<string>("/office_chatter_loud.mp3");
  const [bgVolume, setBgVolume] = useState<number>(0.4);

  const handleSubmit = () => {
    if (onNext) {
      const payload: VoiceConfigPayload = {
        speed,
        pitch,
        volume,
        background_sound_on: bgOn,
        background_sound_url: bgUrl,
        background_sound_volume: bgVolume,
      };
      onNext(JSON.stringify(payload));
    }
  };

  return (
    <div className="relative flex flex-col items-center w-full max-w-md h-[600px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus:outline-none focus:ring-0">
      
      {/* Header */}
      <div className="w-full flex flex-shrink-0 items-center justify-between p-4 border-b border-slate-100 bg-white/80 z-20">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-emerald-500" />
          <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
            {phase || "Builder / Voice Settings"}
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
      <div className="flex-1 w-full flex flex-col pt-5 px-6 overflow-y-auto scrollbar-none pb-24">
        
        {/* Title & Desc */}
        <div className="mb-4 space-y-2 px-2 text-center">
          <h2 className="text-[#0b1957] text-[16px] font-bold leading-tight">
            {question}
          </h2>
          {description && (
            <div className="text-xs text-slate-500 leading-relaxed font-medium">
              <ReactMarkdown
                components={{
                  strong: ({ ...props }) => <strong className="font-bold text-[#0b1957]" {...props} />,
                  p: ({ ...props }) => <p className="leading-relaxed" {...props} />,
                }}
              >
                {description}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Configuration sliders */}
        <div className="space-y-5 px-2 pb-4">
          
          {/* TTS Speed */}
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100/80">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-[#0b1957] flex items-center gap-1.5">
                <Speech className="size-3.5 text-slate-500" /> Speak Rate (Speed)
              </span>
              <span className="text-[11px] font-bold text-[#0b1957] bg-slate-200/60 px-2 py-0.5 rounded-full">
                {speed.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0b1957]"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">
              <span>Slower (0.5)</span>
              <span>Normal (1.0)</span>
              <span>Faster (2.0)</span>
            </div>
          </div>

          {/* TTS Pitch */}
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100/80">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-[#0b1957] flex items-center gap-1.5">
                <Move className="size-3.5 text-slate-500" /> Pitch
              </span>
              <span className="text-[11px] font-bold text-[#0b1957] bg-slate-200/60 px-2 py-0.5 rounded-full">
                {pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0b1957]"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">
              <span>Lowest (-1.0)</span>
              <span>Default (0.0)</span>
              <span>Highest (1.0)</span>
            </div>
          </div>

          {/* TTS Volume */}
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100/80">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-[#0b1957] flex items-center gap-1.5">
                <Volume2 className="size-3.5 text-slate-500" /> Voice Volume
              </span>
              <span className="text-[11px] font-bold text-[#0b1957] bg-slate-200/60 px-2 py-0.5 rounded-full">
                {volume.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0b1957]"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">
              <span>Quiet (0.5)</span>
              <span>Normal (1.0)</span>
              <span>Loud (2.0)</span>
            </div>
          </div>

          {/* Background Ambient Audio Toggle */}
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100/80 space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0b1957] flex items-center gap-1.5">
                <Music className="size-3.5 text-slate-500" /> Ambient Noise Masking
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={bgOn}
                  onChange={(e) => setBgOn(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-4 after:w-4 after:h-4 after:transition-all peer-checked:bg-[#0b1957]"></div>
              </label>
            </div>

            {bgOn && (
              <div className="space-y-3 pt-2 border-t border-slate-150/60 animate-in fade-in duration-200">
                
                {/* Select Ambiance Sound */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Ambiance Sound Override
                  </label>
                  <select
                    value={bgUrl}
                    onChange={(e) => setBgUrl(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-[#0b1957] outline-none shadow-sm focus:border-[#0b1957]"
                  >
                    <option value="/office_chatter_loud.mp3">Office Ambience</option>
                  </select>
                </div>

                {/* Ambient Sound Volume */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Ambiance Volume
                    </span>
                    <span className="text-[10px] font-bold text-[#0b1957]">
                      {Math.round(bgVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={bgVolume}
                    onChange={(e) => setBgVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0b1957]"
                  />
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* Submit Button */}
      <div className="absolute bottom-0 left-0 right-0 w-full flex justify-end pb-8 px-6 pt-4 bg-gradient-to-t from-white via-white to-transparent z-30 border-t border-slate-50">
        <button
          type="button"
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 bg-gradient-to-br from-[#0b1957] to-[#1e293b] text-white hover:shadow-xl shadow-[#0b1957]/20 cursor-pointer"
        >
          Submit Selections
        </button>
      </div>

    </div>
  );
}
