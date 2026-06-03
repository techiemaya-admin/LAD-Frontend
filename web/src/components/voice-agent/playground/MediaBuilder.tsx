"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Sparkles, Image as ImageIcon, Video, ArrowLeft, Loader2 } from "lucide-react";
import { useMediaBuilder } from "@/hooks/voice-agent/useMediaBuilder";
import { AgentBuilderTextInput } from "./builder-steps/AgentBuilderTextInput";
import { AgentBuilderMCQ } from "./builder-steps/AgentBuilderMCQ";
import { AgentBuilderImageOutput } from "./builder-steps/AgentBuilderImageOutput";
import { motion, AnimatePresence } from "framer-motion";

interface MediaBuilderProps {
  onClose?: () => void;
}

/* ── GUIDED JOURNEY TEXT CYCLING component ── */
function ThinkingIndicator({ generating }: { generating: boolean }) {
  const [index, setIndex] = React.useState(0);
  const steps = generating
    ? [
        "Waking up Mr. LADs...",
        "Analyzing your visual prompt...",
        "Generating unique design concepts...",
        "Finalizing visual assets...",
      ]
    : [
        "Waking up Mr. LADs...",
        "Aligning your media workspace...",
        "Loading design references...",
      ];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % steps.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [steps.length]);

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
          className="absolute inset-0 bg-[#0b1957]/10 rounded-full"
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
          className="size-16 border-2 border-dashed border-[#0b1957]/20 rounded-full flex items-center justify-center"
        >
          <Sparkles className="size-8 text-[#0b1957] animate-pulse" />
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
            className="text-sm font-medium text-[#0b1957]/70"
          >
            {steps[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function MediaBuilder({ onClose }: MediaBuilderProps) {
  const mb = useMediaBuilder();
  const [comingSoonMessage, setComingSoonMessage] = useState(false);

  useEffect(() => {
    mb.startFlow();
    return () => {
      mb.closeFlow();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVideoClick = () => {
    setComingSoonMessage(true);
    setTimeout(() => setComingSoonMessage(false), 3000);
  };

  /* ── 1. LOADING SCREEN ── */
  if (mb.step === "loading" || mb.generating) {
    return (
      <div className="relative flex flex-col items-center w-[448px] max-w-full p-10 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden h-[450px] justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all border border-slate-100"
          >
            <X className="size-4" />
          </button>
        )}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#0b1957]">
            {mb.generating ? "Generating Concepts" : "AI Media Journey"}
          </h2>
          <p className="text-xs text-slate-500">
            {mb.generating ? "Creating your visuals in real-time" : "Creating your workspace in real-time"}
          </p>
        </div>
        <ThinkingIndicator generating={mb.generating} />
      </div>
    );
  }

  /* ── 2. WELCOME / CHOICE SCREEN ── */
  if (mb.step === "welcome") {
    return (
      <div className="relative flex flex-col items-center w-[448px] max-w-full p-8 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 h-[550px]">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all border border-slate-100"
          >
            <X className="size-4" />
          </button>
        )}

        <div className="mb-6 mt-4 relative w-48 h-12 flex items-center justify-center">
          <img src="/MrLAD-logo.svg" alt="LAD Logo" className="object-contain max-h-10" />
        </div>

        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-[#0b1957] tracking-tight">
            AI Media Generation
          </h2>
          <p className="text-xs text-slate-500 max-w-[280px] leading-relaxed font-medium">
            Generate high-converting image concepts or premium videos for your outreach campaigns.
          </p>
        </div>

        {mb.error && (
          <div className="w-full p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl text-center animate-in fade-in duration-200">
            {mb.error}
          </div>
        )}

        <div className="w-full space-y-4">
          <button
            onClick={mb.selectImageCreation}
            className="w-full group relative flex items-center gap-4 p-5 bg-gradient-to-br from-[#0b1957] to-[#1e293b] hover:to-[#0b1957] text-white rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer"
          >
            <div className="size-12 bg-white/10 rounded-xl flex items-center justify-center text-blue-200">
              <ImageIcon className="size-6" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold">Image Creation</div>
              <div className="text-[11px] text-blue-100/80 font-medium">
                Create & edit custom brand designs or ICP target graphics.
              </div>
            </div>
          </button>

          <button
            onClick={handleVideoClick}
            className="w-full group relative flex items-center gap-4 p-5 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="size-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-slate-600">
              <Video className="size-6" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold text-slate-400 group-hover:text-slate-600">Video Generation</div>
              <div className="text-[11px] text-slate-400">
                Generate personalized video ads for outbound leads.
              </div>
            </div>
          </button>
        </div>

        {comingSoonMessage && (
          <div className="absolute bottom-20 bg-[#0b1957] text-white text-xs px-4 py-2 rounded-full font-semibold shadow-md animate-bounce">
            Video Generation is coming soon!
          </div>
        )}

        <p className="mt-auto text-[10px] text-slate-400 text-center font-medium">
          Media generations are saved to your asset vault.
        </p>
      </div>
    );
  }

  const handleBack = () => {
    if (mb.step === "builder-mcq-few") {
      mb.setStep("welcome");
    } else if (mb.step === "builder-text") {
      if (mb.uiPayload?.phase === "Phase 2: Describe Image") {
        mb.selectImageCreation(); // Go back to references choice
      } else {
        mb.setStep("welcome");
      }
    } else {
      mb.setStep("welcome");
    }
  };

  /* ── 3. MCQ VIEW ── */
  if (mb.step === "builder-mcq-few") {
    return (
      <div className="relative">
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-50 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-all active:scale-95 border border-slate-100"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <AgentBuilderMCQ
          question={mb.uiPayload?.question || ""}
          description={mb.uiPayload?.description || ""}
          options={mb.uiPayload?.options || []}
          onClose={onClose}
          onNext={(val) => mb.advanceStep(val)}
          phase={mb.uiPayload?.phase}
        />
      </div>
    );
  }

  /* ── 4. TEXT INPUT VIEW (UPLOAD SUPPORTED) ── */
  if (mb.step === "builder-text") {
    // Determine if uploading should be enabled (e.g. Phase 1: Reference Guidance)
    const uploadEnabled = mb.uiPayload?.enable_upload || false;

    return (
      <div className="relative">
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-50 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition-all active:scale-95 border border-slate-100"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <AgentBuilderTextInput
          question={mb.uiPayload?.question || ""}
          description={mb.uiPayload?.description || ""}
          onClose={onClose}
          onNext={(val) => mb.advanceStep(val)}
          phase={mb.uiPayload?.phase}
          showSkip={!uploadEnabled} // Don't show skip button on upload screen
          
          // Reference upload props
          enableUpload={uploadEnabled}
          references={mb.references}
          onUpload={mb.uploadReference}
          onRemove={mb.removeReference}
          isUploading={mb.isUploading}
          error={mb.error}
        />
      </div>
    );
  }

  /* ── 5. GRID IMAGE OUTPUT VIEW ── */
  if (mb.step === "builder-image-output") {
    return (
      <AgentBuilderImageOutput
        title={mb.uiPayload?.question}
        description={mb.uiPayload?.description}
        images={mb.uiPayload?.images || []}
        onClose={onClose}
        onNext={(val) => mb.advanceStep(val)}
        phase={mb.uiPayload?.phase}
        generating={mb.generating}
      />
    );
  }

  return null;
}
