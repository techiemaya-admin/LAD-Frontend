"use client";
import React from "react";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X, Sparkles, PlusCircle, ArrowLeft, Wand2, Settings2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentOption } from "@/hooks/voice-agent/usePlayground";

import { AgentBuilderTextInput } from "./builder-steps/AgentBuilderTextInput";
import { AgentBuilderMCQ } from "./builder-steps/AgentBuilderMCQ";
import { AgentBuilderSummary } from "./builder-steps/AgentBuilderSummary";
import { AgentBuilderBlank } from "./builder-steps/AgentBuilderBlank";
import { AgentBuilderMultiSelect } from "./builder-steps/AgentBuilderMultiSelect";
import { AgentBuilderMasterDraft } from "./builder-steps/AgentBuilderMasterDraft";
import { AgentBuilderDropdown } from "./builder-steps/AgentBuilderDropdown";
import { AgentBuilderConfigs } from "./builder-steps/AgentBuilderConfigs";
import { BuilderData } from "@/hooks/voice-agent/usePlayground";
import { useTheme } from "@/contexts/ThemeContext";

interface PlaygroundConfigViewProps {
  onClose?: () => void;
  onBack: () => void;
  onOpenCreateSelection: () => void;
  onStartTesting: () => void;
  onStartDirectConfig: () => void;
  onStartGuidedJourney: () => void;
  advanceBuilderStep: (userInput?: string | string[], action?: string) => void;
  builderData?: BuilderData | null;
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
  step: 
    | "welcome" | "config" | "create-selection" | "guided-journey"
    | "builder-text" | "builder-mcq" | "builder-mcq-few" | "builder-mcq-many" | "builder-mcq-multi" | "builder-multi-select" | "builder-summary" | "builder-blank" | "builder-master-draft" | "builder-dropdown" | "builder-configs";
}

/* Shared UI fragments */

function StatusBar({ isHolding, timerDisplay }: { isHolding: boolean; timerDisplay: string }) {
  return (
    <div className="flex items-center justify-between w-full mb-4 px-10">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${isHolding ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" : "bg-amber-500 animate-pulse"}`}
        />
        <span className="text-xs font-semibold text-[#0b1957] dark:text-blue-400 uppercase tracking-wider">
          {isHolding ? "Worker Active" : "Connecting…"}
        </span>
      </div>
      {isHolding && timerDisplay && (
        <span className="text-[10px] font-bold text-[#0b1957] dark:text-gray-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-gray-700">
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
        <div className="text-xs text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md p-2 text-center animate-in fade-in slide-in-from-top-1">
          Session recycling to maintain worker hold…
        </div>
      )}
      {error && (
        <div className="text-xs text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md p-2 text-center animate-in fade-in slide-in-from-top-1">
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
      className="absolute top-4 right-4 z-50 p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-gray-400 transition-all hover:scale-110 active:scale-95 cursor-pointer"
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
      className="absolute top-4 left-4 z-50 p-1.5 bg-slate-50 dark:bg-[#000724] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-300 transition-all hover:scale-110 active:scale-95 border border-slate-100 dark:border-gray-800 cursor-pointer"
      aria-label="Go back"
    >
      <ArrowLeft className="size-4" />
    </button>
  );
}

export default function PlaygroundConfigView({
  onClose,
  onBack,
  onOpenCreateSelection,
  onStartTesting,
  onStartDirectConfig,
  onStartGuidedJourney,
  advanceBuilderStep,
  builderData,
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
  const { isDark } = useTheme();

  /* ── GUIDED JOURNEY TEXT CYCLING component ── */
  const ThinkingIndicator = () => {
    const [index, setIndex] = React.useState(0);
    const steps = [
      "Waking up Mr. LADs...",
      "Mr. LADs is loading your business info...",
      "Using your existing info with Mr. LADs..."
    ];

    React.useEffect(() => {
      const timer = setInterval(() => {
        setIndex((prev) => (prev + 1) % steps.length);
      }, 2500);
      return () => clearInterval(timer);
    }, []);

    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="relative size-24 flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 bg-[#0b1957]/10 dark:bg-blue-500/10 rounded-full"
          />
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
            }}
            className="size-16 border-2 border-dashed border-[#0b1957]/20 dark:border-gray-700 rounded-full flex items-center justify-center"
          >
            <Sparkles className="size-8 text-[#0b1957] dark:text-blue-400 animate-pulse" />
          </motion.div>
        </div>
        <div className="h-6 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-sm font-medium text-[#0b1957]/70 dark:text-gray-300"
            >
              {steps[index]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    );
  };

  /* ── GUIDED JOURNEY SCREEN ── */
  if (step === "guided-journey") {
    return (
      <div className="relative flex flex-col items-center w-full max-w-md p-10 bg-white dark:bg-[#000c3b] rounded-3xl border border-slate-200 dark:border-gray-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus:outline-none focus:ring-0">
        <CloseButton onClose={onClose} />
        <BackButton onClick={onBack} />
        <Notices reloading={reloading} error={error} />
        <div className="flex flex-col items-center text-center space-y-8 pt-6 pb-4 w-full">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#0b1957] dark:text-white">AI Guided Journey</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">Creating your agent in real-time</p>
          </div>
          {!error && <ThinkingIndicator />}
          <p className="text-[10px] text-slate-400 dark:text-slate-300 max-w-[200px] leading-relaxed">
            This minimal configuration ensures your agent follows best practices for interaction and goal achievement.
          </p>
        </div>
      </div>
    );
  }

  /* ── BUILDER SCENARIOS (Demo Flow) ── */
  if (step === "builder-text") {
    return <AgentBuilderTextInput onClose={onClose} onNext={advanceBuilderStep} question={builderData?.question || "Provide input"} description={builderData?.description || ""} phase={builderData?.phase} />;
  }

  if (step === "builder-mcq" || step === "builder-mcq-few" || step === "builder-mcq-many") {
    return <AgentBuilderMCQ 
      onClose={onClose}
      onNext={advanceBuilderStep}
      question={builderData?.question || ""}
      description={builderData?.description || ""}
      options={builderData?.options || []}
      phase={builderData?.phase}
    />;
  }

  if (step === "builder-mcq-multi" || step === "builder-multi-select") {
    return <AgentBuilderMultiSelect 
      onClose={onClose}
      onNext={advanceBuilderStep}
      question={builderData?.question || ""}
      description={builderData?.description || ""}
      options={builderData?.options || []}
      phase={builderData?.phase}
    />;
  }

  if (step === "builder-summary") {
    return <AgentBuilderSummary
      onClose={onClose}
      onNext={advanceBuilderStep}
      title={builderData?.question || "Summary"}
      description={builderData?.description || ""}
      blocks={builderData?.blocks || []}
      buttonLabel={builderData?.buttonLabel}
      phase={builderData?.phase}
    />;
  }

  if (step === "builder-blank") {
     return <AgentBuilderBlank onClose={onClose} onNext={advanceBuilderStep} htmlContent={builderData?.htmlContent || ""} phase={builderData?.phase} />;
  }

  if (step === "builder-master-draft") {
    return <AgentBuilderMasterDraft
      onClose={onClose}
      onNext={advanceBuilderStep}
      title={builderData?.question || "Review Agent Blueprint"}
      description={builderData?.description || ""}
      draft={builderData?.draft}
      buttonLabel={builderData?.buttonLabel}
      phase={builderData?.phase}
    />;
  }

  if (step === "builder-dropdown") {
    return <AgentBuilderDropdown
      onClose={onClose}
      onNext={advanceBuilderStep}
      question={builderData?.question || ""}
      description={builderData?.description || ""}
      options={builderData?.options || []}
      phase={builderData?.phase}
    />;
  }

  if (step === "builder-configs") {
    return <AgentBuilderConfigs
      onClose={onClose}
      onNext={advanceBuilderStep}
      question={builderData?.question || ""}
      description={builderData?.description || ""}
      phase={builderData?.phase}
    />;
  }

  /* ── CREATE SELECTION SCREEN ── */
  if (step === "create-selection") {
    return (
      <div className="relative flex flex-col items-center w-full max-w-md p-8 bg-white dark:bg-[#000c3b] rounded-3xl border border-slate-200 dark:border-gray-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus:outline-none focus:ring-0">
        <BackButton onClick={onBack} />
        <CloseButton onClose={onClose} />

        <div className="text-center space-y-2 mb-8 mt-4">
          <h2 className="text-2xl font-bold text-[#0b1957] dark:text-white">Create New Agent</h2>
          <p className="text-sm text-slate-500 dark:text-gray-400">Choose how you want to build your AI.</p>
        </div>

        <div className="w-full space-y-4">
          <button
            onClick={onStartGuidedJourney}
            className="w-full group relative flex items-center gap-4 p-5 bg-gradient-to-br from-[#0b1957] to-[#1e293b] hover:to-[#0b1957] dark:from-blue-600 dark:to-[#000724] dark:hover:to-blue-600 text-white rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer"
          >
            <div className="size-12 bg-white/10 rounded-xl flex items-center justify-center text-blue-200">
              <Wand2 className="size-6" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold">AI Guided Journey</div>
              <div className="text-[11px] text-blue-100/80 dark:text-gray-300">
                Answer a few questions and let AI build it.
              </div>
            </div>
          </button>

          <button
            onClick={onStartDirectConfig}
            className="w-full group relative flex items-center gap-4 p-5 bg-white dark:bg-[#000724] border-2 border-slate-100 dark:border-gray-800 hover:border-[#0b1957]/20 dark:hover:border-gray-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="size-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-[#0b1957]/60 dark:text-gray-400 group-hover:text-[#0b1957] dark:group-hover:text-blue-400">
              <Settings2 className="size-6" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold text-[#0b1957] dark:text-white">Direct Configuration</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-300">
                Full manual control over all parameters.
              </div>
            </div>
          </button>
        </div>

        <p className="mt-8 text-[10px] text-slate-400 dark:text-slate-300 text-center">
            You can always modify agents manually after creation.
        </p>
      </div>
    );
  }


  /* ── WELCOME ── */
  if (step === "welcome") {
    return (
      <div className="relative flex flex-col items-center w-full max-w-md p-8 bg-white dark:bg-[#000c3b] rounded-3xl border border-slate-200 dark:border-gray-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus:outline-none focus:ring-0">
        <CloseButton onClose={onClose} />

        <div className="mb-8 mt-2 relative w-48 h-12">
          <Image
            src={isDark ? "/MrLAD-logo-dark.svg" : "/MrLAD-logo.svg"}
            alt="LADS Logo"
            fill
            className="object-contain"
            sizes="192px"
            priority
          />
        </div>

        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-[#0b1957] dark:text-white tracking-tight">
            Welcome to Playground
          </h2>
          <p className="text-sm text-slate-500 dark:text-gray-400">
            Pick an option below to explore our voice AI.
          </p>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={onStartTesting}
            className="w-full group relative flex items-center gap-4 p-4 bg-slate-50 dark:bg-[#000724] border hover:border-blue-200 dark:hover:border-gray-700 rounded-2xl transition-all hover:shadow-md dark:hover:shadow-black/40 active:scale-[0.98] cursor-pointer"
          >
            <div className="size-10 bg-blue-100 dark:bg-blue-950/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Sparkles className="size-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-[#0b1957] dark:text-white">
                Test Existing Agent
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-300">
                Launch a live call session with our presets.
              </div>
            </div>
          </button>
          <button
            onClick={onOpenCreateSelection}
            className="w-full group relative flex items-center gap-4 p-4 bg-slate-50 dark:bg-[#000724] border hover:border-slate-300 dark:hover:border-gray-700 rounded-2xl transition-all hover:shadow-md dark:hover:shadow-black/40 active:scale-[0.98] cursor-pointer"
          >
            <div className="size-10 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-gray-400 group-hover:bg-slate-700 dark:group-hover:bg-slate-600 group-hover:text-white transition-colors">
              <PlusCircle className="size-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-[#0b1957] dark:text-white">
                Create New Agent
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-300">
                Custom training and knowledge integration.
              </div>
            </div>
          </button>
        </div>

        <p className="mt-8 text-[10px] text-slate-400 dark:text-slate-300 text-center italic">
          No worker session active. Sessions start upon selection.
        </p>
      </div>
    );
  }

  /* ── CONFIG (agent selection + toggles + start call) ── */
  return (
    <div className="relative flex flex-col items-center w-full max-w-md p-6 bg-white dark:bg-[#000c3b] rounded-3xl border border-slate-200 dark:border-gray-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus:outline-none focus:ring-0">
      <BackButton onClick={onBack} />
      <CloseButton onClose={onClose} />
      <StatusBar isHolding={isHolding} timerDisplay={timerDisplay} />
      <Notices reloading={reloading} error={error} />

      <div className="mb-6 mt-2 relative w-48 h-12">
        <Image
          src={isDark ? "/MrLAD-logo-dark.svg" : "/MrLAD-logo.svg"}
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
              className="text-[10px] font-bold text-[#0b1957] dark:text-gray-400 uppercase tracking-widest"
            >
              Voice Agent
            </Label>
            {!loadingAgents && agents.length === 0 && (
              <button
                onClick={fetchAgents}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline uppercase tracking-widest cursor-pointer"
            >
                Reload List
              </button>
            )}
          </div>
          {loadingAgents ? (
            <div className="h-11 flex items-center justify-center text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-gray-800 animate-pulse">
              Fetching available agents…
            </div>
          ) : (
            <div className="relative">
              {agents.length > 0 ? (
                <select
                  id="pg-agent"
                  className="w-full h-11 px-4 py-2 bg-slate-50 dark:bg-[#000724] border border-slate-200 dark:border-gray-800 rounded-xl text-sm text-[#0b1957] dark:text-white focus:ring-2 focus:ring-[#0b1957]/10 focus:border-[#0b1957] dark:focus:ring-blue-500/20 dark:focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                  value={selectedAgent ?? ""}
                  onChange={(e) => setSelectedAgent(Number(e.target.value))}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} className="dark:bg-[#000724]">
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
                    className="w-full h-11 px-4 py-2 bg-slate-50 dark:bg-[#000724] border border-slate-200 dark:border-gray-800 rounded-xl text-sm text-[#0b1957] dark:text-white focus:ring-2 focus:ring-[#0b1957]/10 focus:border-[#0b1957] dark:focus:ring-blue-500/20 dark:focus:border-blue-500 outline-none transition-all"
                    placeholder="Enter Agent ID (manual)"
                    value={selectedAgent ?? ""}
                    onChange={(e) =>
                      setSelectedAgent(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 px-1 italic">
                    * Could not fetch agent list. Please enter ID manually or
                    try &quot;Reload List&quot;.
                  </p>
                </div>
              )}
              {agents.length > 0 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-300">
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
        <div className="p-4 bg-[#f8faff] dark:bg-[#000724] border border-[#0b1957]/5 dark:border-gray-800 rounded-2xl space-y-3.5">
          <div className="flex items-center gap-3">
            <Checkbox
              id="pg-skip-analysis"
              checked={!skipAnalysis}
              onCheckedChange={(checked) => {
                const isChecked = !!checked;
                setSkipAnalysis(!isChecked);
                if (isChecked) setEnableCallLog(true);
              }}
              className="h-5 w-5 rounded-[6px] border-slate-300 dark:border-sky-500/80 data-[state=checked]:bg-[#0b1957] dark:data-[state=checked]:bg-sky-500 data-[state=checked]:border-[#0b1957] dark:data-[state=checked]:border-sky-500 transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Label
              htmlFor="pg-skip-analysis"
              className="text-sm font-medium text-[#0b1957] dark:text-gray-300 cursor-pointer selection:bg-transparent"
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
              className="h-5 w-5 rounded-[6px] border-slate-300 dark:border-sky-500/80 data-[state=checked]:bg-[#0b1957] dark:data-[state=checked]:bg-sky-500 data-[state=checked]:border-[#0b1957] dark:data-[state=checked]:border-sky-500 transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Label
              htmlFor="pg-enable-recording"
              className="text-sm font-medium text-[#0b1957] dark:text-gray-300 cursor-pointer selection:bg-transparent"
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
              className="h-5 w-5 rounded-[6px] border-slate-300 dark:border-sky-500/80 data-[state=checked]:bg-[#0b1957] dark:data-[state=checked]:bg-sky-500 data-[state=checked]:border-[#0b1957] dark:data-[state=checked]:border-sky-500 transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Label
              htmlFor="pg-enable-call-log"
              className="text-sm font-medium text-[#0b1957] dark:text-gray-300 cursor-pointer selection:bg-transparent"
            >
              Write Call Log to Database
            </Label>
          </div>
        </div>

        {/* Start call button */}
        <Button
          onClick={startCall}
          disabled={!isHolding || reloading || connecting || !selectedAgent}
          className="w-full h-12 bg-[#0b1957] dark:bg-primary hover:bg-[#0b1957]/90 dark:hover:bg-primary/90 text-white dark:text-primary-foreground rounded-xl font-bold text-base shadow-lg shadow-[#0b1957]/20 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
        >
          {connecting ? "Connecting…" : "Start Agent Call"}
        </Button>

        <p className="text-[10px] text-slate-400 dark:text-slate-300 text-center leading-relaxed">
          Playground calls are isolated. No production SIP trunks or credits are
          used.
        </p>
      </div>
    </div>
  );
}
