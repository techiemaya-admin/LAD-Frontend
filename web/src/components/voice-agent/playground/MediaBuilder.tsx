"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Image as ImageIcon, Video, ArrowLeft } from "lucide-react";
import { useMediaBuilder } from "@/hooks/voice-agent/useMediaBuilder";
import { AgentBuilderTextInput } from "./builder-steps/AgentBuilderTextInput";
import { AgentBuilderMCQ } from "./builder-steps/AgentBuilderMCQ";
import { AgentBuilderImageOutput } from "./builder-steps/AgentBuilderImageOutput";
import { AgentBuilderVideoConfirm } from "./builder-steps/AgentBuilderVideoConfirm";
import { AgentBuilderVideoOutput } from "./builder-steps/AgentBuilderVideoOutput";
import { AgentBuilderGallery } from "./builder-steps/AgentBuilderGallery";
import { AgentBuilderScriptConfirm } from "./builder-steps/AgentBuilderScriptConfirm";
import { AgentBuilderWorkflowChoice } from "./builder-steps/AgentBuilderWorkflowChoice";
import { AgentBuilderVideoProgress } from "./builder-steps/AgentBuilderVideoProgress";
import { AgentBuilderKeyframesConfirm } from "./builder-steps/AgentBuilderKeyframesConfirm";
import { AgentBuilderBrandDNA } from "./builder-steps/AgentBuilderBrandDNA";
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
          className="absolute inset-0 bg-[#0b1957]/10 dark:bg-blue-400/10 rounded-full"
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
          className="size-16 border-2 border-dashed border-[#0b1957]/20  dark:border-blue-400/20 rounded-full flex items-center justify-center"
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
            className="text-sm font-medium text-[#0b1957]/70 dark:text-blue-200/70"
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
    mb.selectVideoGeneration();
  };

  const handleBack = () => {
    mb.undoStep();
  };

  let content = null;

  /* ── 1. LOADING SCREEN ── */
  if (mb.step === "loading" || mb.generating) {
    content = (
      <div className="relative flex flex-col items-center w-[448px] max-w-full p-10 bg-white dark:bg-[#000724] rounded-3xl border border-slate-200 dark:border-[#1e3a8a] shadow-xl overflow-hidden h-[450px] justify-center text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-1.5 bg-slate-50 dark:bg-[#060b21] hover:bg-slate-100 dark:hover:bg-[#111827] rounded-full text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-gray-300 transition-all border border-slate-100 dark:border-[#1e3a8a]"
          >
            <X className="size-4" />
          </button>
        )}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-[#0b1957] dark:text-white">
            {mb.generating ? "Generating Concepts" : "AI Media Journey"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            {mb.generating ? "Creating your visuals in real-time" : "Creating your workspace in real-time"}
          </p>
        </div>
        <ThinkingIndicator generating={mb.generating} />
      </div>
    );
  }

  /* ── 2. WELCOME / CHOICE SCREEN ── */
  else if (mb.step === "welcome") {
    content = (
      <div className="relative flex flex-col items-center w-[448px] max-w-full p-8 bg-white dark:bg-[#000724] rounded-3xl border border-slate-200 dark:border-[#1e3a8a] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 h-[550px]">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-1.5 bg-slate-50  dark:bg-[#060b21]  hover:bg-slate-100 dark:hover:bg-[#111827] rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-all border border-slate-100  dark:border-[#1e3a8a]"
          >
            <X className="size-4" />
          </button>
        )}

        <div className="mb-6 mt-4 relative w-48 h-12 flex items-center justify-center">
          <img src="/MrLAD-logo.svg" alt="LAD Logo" className="dark:hidden object-contain max-h-10 dark:brightness-200" />
          <img src="/MrLAD-logo-white.svg" alt="LAD Logo" className="hidden  dark:block object-contain max-h-10 dark:brightness-200" />
        </div>

        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl font-bold text-[#0b1957] dark:text-white tracking-tight">AI Media Generation</h2>
          <p className="text-xs text-slate-500 dark:text-slate-300 max-w-[280px] leading-relaxed font-medium">
            Generate high-converting image concepts or premium videos for your outreach campaigns.
          </p>
        </div>

        {mb.error && (
          <div className="w-full p-3 mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl text-center animate-in fade-in duration-200">
            {mb.error}
          </div>
        )}

        <div className="w-full space-y-4">
          <button
            onClick={mb.selectImageCreation}
            className="w-full group relative flex items-center gap-4 p-5 bg-gradient-to-br from-[#0b1957] to-[#1e293b]  dark:from-[#2563eb] dark:to-[#2563eb] hover:to-[#0b1957] text-white rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer"
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
            className="w-full group relative flex items-center gap-4 p-5 bg-white dark:bg-[#060b21] border-2 border-slate-100 dark:border-[#1e3a8a] hover:border-slate-200 hover:bg-slate-50   dark:hover:bg-[#111827]  rounded-2xl transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="size-12 bg-slate-100 dark:bg-[#111827]  rounded-xl flex items-center justify-center text-slate-400 group-hover:text-slate-600 dark:text-slate-300">
              <Video className="size-6" />
            </div>
            <div className="text-left">
              <div className="text-base font-bold text-slate-400 group-hover:text-slate-600 dark:text-slate-300">Video Generation</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-300">
                Generate personalized video ads for outbound leads.
              </div>
            </div>
          </button>
        </div>

        {comingSoonMessage && (
          <div className="absolute bottom-20 bg-[#0b1957] dark:bg-blue-600  text-white text-xs px-4 py-2 rounded-full font-semibold shadow-md animate-bounce">
            Video Generation is coming soon!
          </div>
        )}

        <button
          onClick={mb.fetchGallery}
          disabled={mb.loadingGallery}
          className="mt-auto text-xs font-bold text-[#0b1957] hover:underline cursor-pointer flex items-center gap-1 active:scale-95 transition-all mb-2 dark:text-slate-300"
        >
          {mb.loadingGallery ? "Loading Vault..." : "View Asset Vault / Gallery"}
        </button>

        <p className="text-[10px] text-slate-400 text-center font-medium dark:text-slate-300">
          Media generations are saved to your asset vault.
        </p>
      </div>
    );
  }

  /* ── 3. MCQ VIEW ── */
  else if (mb.step === "builder-mcq-few") {
    content = (
      <div className="relative">
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-50 p-1.5 bg-slate-50  dark:bg-[#060b21]  hover:bg-slate-100  dark:hover:bg-[#111827] rounded-full text-slate-400  dark:text-slate-300 transition-all active:scale-95 border border-slate-100 dark:border-[#1e3a8a]"
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
  else if (mb.step === "builder-text") {
    const uploadEnabled = mb.uiPayload?.enable_upload || false;
    content = (
      <div className="relative">
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-50 p-1.5 bg-slate-50  dark:bg-[#060b21] hover:bg-slate-100 dark:hover:bg-[#111827]  rounded-full text-slate-400  dark:text-slate-300 transition-all active:scale-95 border border-slate-100  dark:border-[#1e3a8a]"
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
          showSkip={!uploadEnabled}
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
  else if (mb.step === "builder-image-output") {
    content = (
      <AgentBuilderImageOutput
        title={mb.uiPayload?.question}
        description={mb.uiPayload?.description}
        images={mb.uiPayload?.images || []}
        video={mb.uiPayload?.video}
        onClose={onClose}
        onNext={(val) => mb.advanceStep(val)}
        phase={mb.uiPayload?.phase}
        generating={mb.generating}
        references={mb.references}
        onUpload={mb.uploadReference}
        onRemove={mb.removeReference}
        isUploading={mb.isUploading}
        error={mb.error}
        onBack={handleBack}
      />
    );
  }

  /* ── 6. VIDEO CONFIRM VIEW ── */
  else if (mb.step === "builder-video-confirm") {
    content = (
      <AgentBuilderVideoConfirm
        title={mb.uiPayload?.question}
        description={mb.uiPayload?.description}
        image={mb.uiPayload?.images?.[0]}
        onClose={onClose}
        onNext={(val) => mb.advanceStep(val)}
        phase={mb.uiPayload?.phase}
        references={mb.references}
        onUpload={mb.uploadReference}
        onRemove={mb.removeReference}
        isUploading={mb.isUploading}
        error={mb.error}
        onBack={handleBack}
      />
    );
  }

  /* ── 7. VIDEO OUTPUT VIEW ── */
  else if (mb.step === "builder-video-output") {
    content = (
      <AgentBuilderVideoOutput
        title={mb.uiPayload?.question}
        description={mb.uiPayload?.description}
        videoUrl={mb.uiPayload?.video}
        onClose={onClose}
        onNext={(val) => mb.advanceStep(val)}
        phase={mb.uiPayload?.phase}
        onBack={handleBack}
      />
    );
  }

  /* ── 7a. SCRIPT CONFIRM VIEW ── */
  else if (mb.step === "builder-script-confirm") {
    content = (
      <AgentBuilderScriptConfirm
        title={mb.uiPayload?.question}
        description={mb.uiPayload?.description}
        options={mb.uiPayload?.options as any || []}
        onClose={onClose}
        onNext={(val) => mb.advanceStep(val)}
        phase={mb.uiPayload?.phase}
        onBack={handleBack}
      />
    );
  }

  /* ── 7a-1. WORKFLOW CHOICE VIEW ── */
  else if (mb.step === "builder-workflow-choice") {
    content = (
      <AgentBuilderWorkflowChoice
        title={mb.uiPayload?.question}
        description={mb.uiPayload?.description}
        options={mb.uiPayload?.options as any || []}
        onClose={onClose}
        onNext={(val) => mb.advanceStep(val)}
        phase={mb.uiPayload?.phase}
        onBack={handleBack}
      />
    );
  }

  /* ── 7c. KEYFRAMES CONFIRM VIEW ── */
  else if (mb.step === "builder-keyframes-confirm") {
    content = (
      <AgentBuilderKeyframesConfirm
        title={mb.uiPayload?.question}
        description={mb.uiPayload?.description}
        keyframes={mb.uiPayload?.images || []}
        onClose={onClose}
        onNext={(val) => mb.advanceStep(val)}
        phase={mb.uiPayload?.phase}
        references={mb.references}
        onUpload={mb.uploadReference}
        onRemove={mb.removeReference}
        isUploading={mb.isUploading}
        error={mb.error}
        onBack={handleBack}
      />
    );
  }

  /* ── 7b. VIDEO PRODUCTION PROGRESS VIEW ── */
  else if (mb.step === "builder-video-progress") {
    content = (
      <AgentBuilderVideoProgress
        title={mb.uiPayload?.question}
        description={mb.uiPayload?.description}
        blocks={mb.uiPayload?.blocks as any || []}
        onClose={onClose}
        phase={mb.uiPayload?.phase}
        videoUrl={mb.uiPayload?.video}
        status={mb.uiPayload?.status as any}
        progress={mb.uiPayload?.progress}
        onBack={handleBack}
        onNext={(val) => {
          if (val === "[SHOW_GALLERY]") {
            mb.fetchGallery();
          } else {
            mb.advanceStep(val);
          }
        }}
      />
    );
  }

  /* ── 7d. BRAND DNA VIEW ── */
  else if (mb.step === "builder-brand-dna") {
    content = (
      <AgentBuilderBrandDNA
        brandDna={mb.uiPayload?.brand_dna}
        onClose={onClose}
        onNext={(val) => mb.advanceStep(val)}
        phase={mb.uiPayload?.phase}
        onBack={handleBack}
      />
    );
  }

  /* ── 8. GALLERY VIEW ── */
  else if (mb.step === "gallery") {
    content = (
      <AgentBuilderGallery
        images={mb.galleryImages}
        videos={mb.galleryVideos}
        loading={mb.loadingGallery}
        onBack={() => mb.setStep("welcome")}
        onClose={onClose}
        onGenerateImages={mb.generateImagesFromGallery}
        onAnimateImage={mb.animateImageFromGallery}
        onExtendVideo={mb.extendVideoFromGallery}
        onAddDialogues={mb.addDialoguesFromGallery}
        onDeleteAssets={mb.deleteAssets}
        isFullHistory={mb.isGalleryFullHistory}
        onLoadFullHistory={() => mb.fetchGallery(true)}
      />
    );
  }

  const showCost = process.env.NEXT_PUBLIC_SHOW_COST_INDICATOR === "true";
  const cost = mb.uiPayload?.total_cost || 0;
  const breakdown = mb.uiPayload?.cost_breakdown || [];

  return (
    <div className="relative">
      {content}

      {showCost && cost > 0 && (
        <div className="absolute top-[18px] right-[56px] z-50 group/cost select-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full text-[11px] font-bold text-emerald-700 shadow-sm cursor-pointer transition-all active:scale-95">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>${cost.toFixed(4)}</span>
          </div>

          {/* Tooltip */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl p-4 transition-all duration-200 opacity-0 scale-95 origin-top-right group-hover/cost:opacity-100 group-hover/cost:scale-100 pointer-events-none z-[9999] text-left">
            <h3 className="text-xs font-bold text-[#0b1957] mb-2 flex items-center justify-between">
              <span>Session Cost</span>
              <span className="text-emerald-600">${cost.toFixed(4)}</span>
            </h3>

            {breakdown.length === 0 ? (
              <p className="text-[10px] text-slate-400">No cost recorded yet.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {breakdown.map((step: any, idx: number) => {
                  const stepCost = step.cost || 0;
                  const details = step.details || {};
                  let detailText = "";
                  if (step.component === "llm") {
                    detailText = `${((details.prompt_tokens || 0)/1000).toFixed(1)}k prompt, ${((details.completion_tokens || 0)/1000).toFixed(1)}k completion`;
                  } else if (step.component === "image_gen") {
                    detailText = `${details.count || 1} image(s)`;
                  } else if (step.component === "video_gen") {
                    detailText = `${details.duration_seconds || 0}s video`;
                  } else if (step.component === "tts") {
                    detailText = `${details.character_count || 0} char(s)`;
                  }

                  return (
                    <div key={idx} className="flex flex-col border-b border-slate-50 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                        <span className="truncate max-w-[170px]">{step.step_name}</span>
                        <span className="text-emerald-600 font-bold">${stepCost.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-400">
                        <span className="truncate max-w-[170px]">{step.model}</span>
                        <span>{detailText}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
