"use client";

import { useMemo, useState, useEffect, ReactElement } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useConnectionState,
  useLocalParticipant,
  useTrackTranscription,
  TrackReferenceOrPlaceholder,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import "./playground.css";
import { ConnectionState, Track } from "livekit-client";
import { AgentAudioVisualizerLads } from "./agents-ui/agent-audio-visualizer-lads";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { usePlayground } from "@/hooks/voice-agent/usePlayground";
import PlaygroundConfigView from "./PlaygroundConfigView";

/* ──────────────────────────────────────────────────────────────────
   PROPS
   ────────────────────────────────────────────────────────────────── */

interface PlaygroundProps {
  onClose?: () => void;
  initialAgentId?: string | number;
  userId?: string;
  tenantId?: string;
}

/* ──────────────────────────────────────────────────────────────────
   MAIN COMPONENT - View Router
   ────────────────────────────────────────────────────────────────── */

export default function Playground({
  onClose,
  initialAgentId,
  userId,
  tenantId,
}: PlaygroundProps) {
  const pg = usePlayground({ onClose, initialAgentId, userId, tenantId });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  /* ── IN-CALL VIEW ── */
  if (pg.sessionToken) {
    return (
      <div className="flex flex-col items-center w-full min-h-[400px] bg-transparent font-sans antialiased pb-8">
        <div className="relative flex flex-col items-center w-full max-w-xl bg-white dark:bg-[#000724] rounded-3xl border border-slate-200 dark:border-[#262831] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none focus:outline-none focus:ring-0">
          <LiveKitRoom
            token={pg.sessionToken}
            serverUrl={pg.livekitUrl}
            connect={true}
            audio={true}
            video={false}
            className="w-full flex flex-col items-center"
            onDisconnected={pg.handleDisconnect}
          >
            <div className="w-full p-6 pb-0 flex flex-col items-center">
              {onClose && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-50 p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-gray-400 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="size-4" />
                </button>
              )}
              {/* Status bar */}
              <div className="flex items-center justify-between w-full mb-4 px-10">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${pg.isHolding ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" : "bg-amber-500 animate-pulse"}`}
                  />
                  <span className="text-xs font-semibold text-[#0b1957] dark:text-blue-400 uppercase tracking-wider">
                    {pg.isHolding ? "Worker Active" : "Connecting…"}
                  </span>
                </div>
                {pg.isHolding && pg.timerDisplay && (
                  <span className="text-[10px] font-bold text-[#0b1957] dark:text-gray-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-gray-700">
                    {pg.timerDisplay}
                  </span>
                )}
              </div>
              {/* Notices */}
              <div className="w-full space-y-2 mb-4 px-2">
                {pg.reloading && (
                  <div className="text-xs text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-md p-2 text-center animate-in fade-in slide-in-from-top-1">
                    Session recycling to maintain worker hold…
                  </div>
                )}
                {pg.error && (
                  <div className="text-xs text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-md p-2 text-center animate-in fade-in slide-in-from-top-1">
                    {pg.error}
                  </div>
                )}
              </div>
              <AgentUI isDark={isDark} />
            </div>
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      </div>
    );
  }

  /* ── PRE-CALL VIEWS (Welcome / Config / Coming Soon) ── */
  return (
    <div className="flex flex-col items-center w-full min-h-[400px] bg-transparent font-sans antialiased pb-8">
      <PlaygroundConfigView
        step={pg.step}
        onClose={onClose}
        onBack={() => {
          if (pg.step === "create-selection" || pg.step === "config") {
            pg.setStep("welcome");
          } else if (pg.step === "guided-journey" || pg.step.startsWith("builder-")) {
            pg.setStep("create-selection");
          } else {
            pg.setStep("welcome");
          }
        }}
        onOpenCreateSelection={pg.openCreateSelection}
        onStartTesting={pg.startTesting}
        onStartDirectConfig={pg.startDirectConfig}
        onStartGuidedJourney={pg.startGuidedJourney}
        advanceBuilderStep={pg.advanceBuilderStep}
        builderData={pg.builderData}
        isHolding={pg.isHolding}
        reloading={pg.reloading}
        timerDisplay={pg.timerDisplay}
        error={pg.error}
        agents={pg.agents}
        selectedAgent={pg.selectedAgent}
        setSelectedAgent={pg.setSelectedAgent}
        loadingAgents={pg.loadingAgents}
        fetchAgents={pg.fetchAgents}
        skipAnalysis={pg.skipAnalysis}
        setSkipAnalysis={pg.setSkipAnalysis}
        enableRecording={pg.enableRecording}
        setEnableRecording={pg.setEnableRecording}
        enableCallLog={pg.enableCallLog}
        setEnableCallLog={pg.setEnableCallLog}
        connecting={pg.connecting}
        startCall={pg.startCall}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   INNER AGENT UI (uses LiveKitRoom context)
   ────────────────────────────────────────────────────────────────── */

function AgentUI({ isDark }: { isDark: boolean }): ReactElement {
  const connectionState = useConnectionState();
  const { state, audioTrack } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  // Agent transcription
  const agentTx = useTrackTranscription(
    audioTrack as TrackReferenceOrPlaceholder | undefined,
  );

  // Local user transcription
  const localMicRef = useMemo(() => {
    if (!localParticipant) return undefined;
    const pub = localParticipant.getTrackPublication(Track.Source.Microphone);
    if (!pub) return undefined;
    return {
      participant: localParticipant,
      publication: pub,
      source: Track.Source.Microphone,
    } as TrackReferenceOrPlaceholder;
  }, [localParticipant]);

  const localTx = useTrackTranscription(localMicRef);

  const latestAgentText =
    agentTx.segments.length > 0
      ? agentTx.segments[agentTx.segments.length - 1].text
      : "";
  const latestUserText =
    localTx.segments.length > 0
      ? localTx.segments[localTx.segments.length - 1].text
      : "";

  let activeTranscript = "";
  let transcriptSpeaker = "Agent";

  if (state === "speaking") {
    activeTranscript = latestAgentText;
    transcriptSpeaker = "Agent";
  } else if (state === "listening" || state === "thinking") {
    activeTranscript = latestUserText;
    transcriptSpeaker = "You";
  }

  // Truncate to the last 30 words to prevent pushing the hangup button off screen
  if (activeTranscript) {
    const words = activeTranscript.split(/\s+/);
    if (words.length > 30) {
      activeTranscript = "..." + words.slice(-30).join(" ");
    }
  }

  return (
    <div className="flex flex-col items-center w-full py-2 space-y-4">
      {/* Header info */}
      <div className="flex flex-col items-center space-y-1">
        <h2 className="text-xl font-black text-[#0b1957] dark:text-white tracking-tight font-heading">
          Voice Agent Live
        </h2>
        <div className="flex items-center gap-2 px-3 py-0.5 bg-slate-50 dark:bg-[#1a2a43]/40 border border-slate-100 dark:border-[#262831] rounded-full">
          <span
            className={`w-1.5 h-1.5 rounded-full ${connectionState === ConnectionState.Connected ? "bg-green-500 animate-pulse" : "bg-amber-500"}`}
          />
          <span className="text-[9px] font-bold text-[#0b1957] dark:text-blue-400 uppercase tracking-widest">
            {connectionState === ConnectionState.Connected
              ? state === "idle"
                ? "Connected"
                : state
              : connectionState}
          </span>
        </div>
      </div>

      {/* Visualizer */}
      <div className="relative w-full aspect-square max-w-[220px] flex items-center justify-center">
        <AgentAudioVisualizerLads
          size="lg"
          state={state}
          audioTrack={audioTrack}
          className="scale-90"
        />
      </div>

      {/* Transcript Area */}
      <div className="w-full max-w-lg min-h-[80px] flex flex-col items-center justify-center p-2">
        <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">
          {transcriptSpeaker}
        </div>
        <div className="text-sm text-[#0b1957] dark:text-slate-200 font-medium text-center italic leading-relaxed min-h-[1.2rem] px-4">
          {activeTranscript ||
            (connectionState === "connecting"
              ? "Establishing secure channel..."
              : "Listening...")}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full pt-4 pb-10 flex justify-center border-t border-slate-100 dark:border-[#262831]">
        <Button
          onClick={() => room?.disconnect()}
          className="rounded-full px-12 h-12 font-bold bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-xl shadow-red-200/40 dark:shadow-none transition-all active:scale-95 border-none outline-none ring-0 appearance-none cursor-pointer"
        >
          Hang Up
        </Button>
      </div>
    </div>
  );
}
