"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X, Sparkles, PlusCircle, ArrowLeft } from "lucide-react";
import type { AgentOption } from "@/hooks/voice-agent/usePlayground";

interface PlaygroundConfigViewProps {
  onClose?: () => void;
  onBack: () => void;
  onStartComingSoon: () => void;
  onStartTesting: () => void;
  isHolding: boolean;
  reloading: boolean;
  timerDisplay: string;
  error: string;
  agents: AgentOption[];
  selectedAgent: number | null;
  setSelectedAgent: (id: number | null) => void;
  loadingAgents: boolean;
  fetchAgents: () => Promise<void>;
  skipAnalysis: boolean;
  setSkipAnalysis: (val: boolean) => void;
  enableRecording: boolean;
  setEnableRecording: (val: boolean) => void;
  enableCallLog: boolean;
  setEnableCallLog: (val: boolean) => void;
  connecting: boolean;
  startCall: () => Promise<void>;
  step: "welcome" | "config" | "coming-soon";
}

/* Shared UI fragments */

function StatusBar({ isHolding, timerDisplay }: { isHolding: boolean; timerDisplay: string }) {
  return (
    <div className="flex items-center justify-between w-full mb-4 px-10">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${isHolding ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" : "bg-amber-500 animate-pulse"}`}
        />
        <span className="text-xs font-semibold text-[#0b1957] uppercase tracking-wider">
          {isHolding ? "Worker Active" : "Connecting…"}
        </span>
      </div>
      {isHolding && timerDisplay && (
        <span className="text-[10px] font-bold text-[#0b1957] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
          {timerDisplay}
        </span>
      )}
    </div>
  );
}

function Notices({ reloading, error }: { reloading: boolean; error: string }) {
  return (
    <div className="w-full space-y-2 mb-4 px-2">
      {reloading && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2 text-center animate-in fade-in slide-in-from-top-1">
          Session recycling to maintain worker hold…
        </div>
      )}
      {error && (
        <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-md p-2 text-center animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}
    </div>
  );
}

function CloseButton({ onClose }: { onClose?: () => void }) {
  if (!onClose) return null;
  return (
    <button
      onClick={onClose}
      className="absolute top-4 right-4 z-50 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-all hover:scale-110 active:scale-95"
      aria-label="Close modal"
    >
      <X className="size-4" />
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 left-4 z-50 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-all hover:scale-110 active:scale-95 border border-slate-100"
      aria-label="Go back"
    >
      <ArrowLeft className="size-4" />
    </button>
  );
}

export default function PlaygroundConfigView({
  onClose,
  onBack,
  onStartComingSoon,
  onStartTesting,
  isHolding,
  reloading,
  timerDisplay,
  error,
  agents,
  selectedAgent,
  setSelectedAgent,
  loadingAgents,
  fetchAgents,
  skipAnalysis,
  setSkipAnalysis,
  enableRecording,
  setEnableRecording,
  enableCallLog,
  setEnableCallLog,
  connecting,
  startCall,
  step,
}: PlaygroundConfigViewProps) {
  /* ── COMING SOON ── */
  if (step === "coming-soon") {
    return (
      <div className="relative flex flex-col items-center w-full max-w-md p-8 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <BackButton onClick={onBack} />
        <CloseButton onClose={onClose} />

        <div className="flex flex-col items-center text-center space-y-4 pt-4">
          <div className="size-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-2">
            <PlusCircle className="size-8 stroke-[1.5]" />
          </div>
          <h2 className="text-2xl font-bold text-[#0b1957]">Coming Soon</h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-[240px]">
            The ability to design and train new voice agents is under active
            development. Stay tuned!
          </p>
          <Button
            variant="outline"
            onClick={onBack}
            className="mt-4 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  /* ── WELCOME ── */
  if (step === "welcome") {
    return (
      <div className="relative flex flex-col items-center w-full max-w-md p-8 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <CloseButton onClose={onClose} />

        <div className="mb-8 mt-2 relative w-48 h-12">
          <Image
            src="/logo.png"
            alt="LADS Logo"
            fill
            className="object-contain"
            sizes="192px"
            priority
          />
        </div>

        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-[#0b1957] tracking-tight">
            Welcome to Playground
          </h2>
          <p className="text-sm text-slate-500">
            Pick an option below to explore our voice AI.
          </p>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={onStartTesting}
            className="w-full group relative flex items-center gap-4 p-4 bg-slate-50 hover:bg-white border hover:border-blue-200 rounded-2xl transition-all hover:shadow-md active:scale-[0.98]"
          >
            <div className="size-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Sparkles className="size-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-[#0b1957]">
                Test Existing Agent
              </div>
              <div className="text-[11px] text-slate-400">
                Launch a live call session with our presets.
              </div>
            </div>
          </button>
          <button
            onClick={onStartComingSoon}
            className="w-full group relative flex items-center gap-4 p-4 bg-slate-50 hover:bg-white border hover:border-slate-300 rounded-2xl transition-all hover:shadow-md active:scale-[0.98]"
          >
            <div className="size-10 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-slate-700 group-hover:text-white transition-colors">
              <PlusCircle className="size-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-[#0b1957]">
                Create New Agent
              </div>
              <div className="text-[11px] text-slate-400">
                Custom training and knowledge integration.
              </div>
            </div>
          </button>
        </div>

        <p className="mt-8 text-[10px] text-slate-400 text-center italic">
          No worker session active. Sessions start upon selection.
        </p>
      </div>
    );
  }

  /* ── CONFIG (agent selection + toggles + start call) ── */
  return (
    <div className="relative flex flex-col items-center w-full max-w-md p-6 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
      <BackButton onClick={onBack} />
      <CloseButton onClose={onClose} />
      <StatusBar isHolding={isHolding} timerDisplay={timerDisplay} />
      <Notices reloading={reloading} error={error} />

      <div className="mb-6 mt-2 relative w-48 h-12">
        <Image
          src="/logo.png"
          alt="LADS Logo"
          fill
          className="object-contain"
          sizes="192px"
          priority
        />
      </div>

      <div className="w-full space-y-5">
        {/* Agent selector */}
        <div className="space-y-1.5 w-full">
          <div className="flex items-center justify-between ml-1">
            <Label
              htmlFor="pg-agent"
              className="text-[10px] font-bold text-[#0b1957] uppercase tracking-widest"
            >
              Voice Agent
            </Label>
            {!loadingAgents && agents.length === 0 && (
              <button
                onClick={fetchAgents}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline uppercase tracking-widest"
              >
                Reload List
              </button>
            )}
          </div>
          {loadingAgents ? (
            <div className="h-11 flex items-center justify-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100 animate-pulse">
              Fetching available agents…
            </div>
          ) : (
            <div className="relative">
              {agents.length > 0 ? (
                <select
                  id="pg-agent"
                  className="w-full h-11 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0b1957] focus:ring-2 focus:ring-[#0b1957]/10 focus:border-[#0b1957] outline-none transition-all appearance-none cursor-pointer"
                  value={selectedAgent ?? ""}
                  onChange={(e) => setSelectedAgent(Number(e.target.value))}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.description ? ` (${a.description})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <input
                    id="pg-agent"
                    type="number"
                    className="w-full h-11 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0b1957] focus:ring-2 focus:ring-[#0b1957]/10 focus:border-[#0b1957] outline-none transition-all"
                    placeholder="Enter Agent ID (manual)"
                    value={selectedAgent ?? ""}
                    onChange={(e) =>
                      setSelectedAgent(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                  <p className="text-[10px] text-amber-600 px-1 italic">
                    * Could not fetch agent list. Please enter ID manually or
                    try &quot;Reload List&quot;.
                  </p>
                </div>
              )}
              {agents.length > 0 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toggles */}
        <div className="p-4 bg-[#f8faff] border border-[#0b1957]/5 rounded-2xl space-y-3.5">
          <div className="flex items-center gap-3">
            <Checkbox
              id="pg-skip-analysis"
              checked={!skipAnalysis}
              onCheckedChange={(checked) => {
                const isChecked = !!checked;
                setSkipAnalysis(!isChecked);
                if (isChecked) setEnableCallLog(true);
              }}
              className="rounded-md border-slate-300 data-[state=checked]:bg-[#0b1957] data-[state=checked]:border-[#0b1957]"
            />
            <Label
              htmlFor="pg-skip-analysis"
              className="text-sm font-medium text-[#0b1957] cursor-pointer selection:bg-transparent"
            >
              Run Post-Call Analysis
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="pg-enable-recording"
              checked={enableRecording}
              onCheckedChange={(checked) => {
                const isChecked = !!checked;
                setEnableRecording(isChecked);
                if (isChecked) setEnableCallLog(true);
              }}
              className="rounded-md border-slate-300 data-[state=checked]:bg-[#0b1957] data-[state=checked]:border-[#0b1957]"
            />
            <Label
              htmlFor="pg-enable-recording"
              className="text-sm font-medium text-[#0b1957] cursor-pointer selection:bg-transparent"
            >
              Save Recording
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="pg-enable-call-log"
              checked={enableCallLog}
              onCheckedChange={(checked) => {
                const isChecked = !!checked;
                setEnableCallLog(isChecked);
                if (!isChecked) {
                  setEnableRecording(false);
                  setSkipAnalysis(true);
                }
              }}
              className="rounded-md border-slate-300 data-[state=checked]:bg-[#0b1957] data-[state=checked]:border-[#0b1957]"
            />
            <Label
              htmlFor="pg-enable-call-log"
              className="text-sm font-medium text-[#0b1957] cursor-pointer selection:bg-transparent"
            >
              Write Call Log to Database
            </Label>
          </div>
        </div>

        {/* Start call button */}
        <Button
          onClick={startCall}
          disabled={!isHolding || reloading || connecting || !selectedAgent}
          className="w-full h-12 bg-[#0b1957] hover:bg-[#0b1957]/90 text-white rounded-xl font-bold text-base shadow-lg shadow-[#0b1957]/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {connecting ? "Connecting…" : "Start Agent Call"}
        </Button>

        <p className="text-[10px] text-slate-400 text-center leading-relaxed">
          Playground calls are isolated. No production SIP trunks or credits are
          used.
        </p>
      </div>
    </div>
  );
}
