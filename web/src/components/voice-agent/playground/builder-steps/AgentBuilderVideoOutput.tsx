import React, { useRef, useState } from "react";
import { X, Volume2, VolumeX, Download, Play, Pause, RotateCcw, ArrowLeft, Video, Maximize2, Sparkles } from "lucide-react";

export function AgentBuilderVideoOutput({
  title = "Your Animated Concept",
  description = "Generated video using Veo 3.1 Lite.",
  videoUrl = "",
  onClose,
  onNext,
  phase,
  onBack,
  hideHeader = false,
  hideFooter = false,
}: {
  title?: string;
  description?: string;
  videoUrl?: string;
  onClose?: () => void;
  onNext?: (val?: string) => void;
  phase?: string;
  onBack?: () => void;
  hideHeader?: boolean;
  hideFooter?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false); // Default unmuted (sound on)

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch((err) => console.error("Play failed:", err));
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuteState = !isMuted;
    videoRef.current.muted = newMuteState;
    setIsMuted(newMuteState);
  };

  const restartVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch((err) => console.error("Play failed:", err));
    setIsPlaying(true);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen().catch((err) => console.error("Fullscreen failed:", err));
    } else if ((videoRef.current as any).webkitRequestFullscreen) {
      (videoRef.current as any).webkitRequestFullscreen();
    } else if ((videoRef.current as any).msRequestFullscreen) {
      (videoRef.current as any).msRequestFullscreen();
    }
  };

  const handleDownload = async () => {
    if (!videoUrl) return;
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "animated-concept.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Direct blob download failed, falling back to navigation:", err);
      const a = document.createElement("a");
      a.href = videoUrl;
      a.target = "_blank";
      a.click();
    }
  };

  return (
    <div className={`relative flex flex-col items-center w-[480px] max-w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none ${hideHeader ? 'shadow-none border-0 h-auto p-0 bg-transparent' : 'h-[620px]'}`}>
      {/* Header */}
      {!hideHeader && (
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
            <Video className="size-4 text-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
              {phase || "Animation Complete"}
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
      )}

      {/* Main Content Area */}
      <div className={`relative flex-1 min-h-0 w-full flex flex-col overflow-y-auto scrollbar-none ${hideHeader ? 'p-0 overflow-visible' : 'pt-4 px-6'}`}>
        {!hideHeader && (
          <>
            <h2 className="text-xl font-bold text-[#0b1957] text-center leading-snug mb-2">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-slate-500 text-center mb-4 font-medium italic">
                {description}
              </p>
            )}
          </>
        )}

        {/* Video Player Frame */}
        {videoUrl ? (
          <div className="w-full max-w-[360px] mx-auto mb-6 rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-slate-950 aspect-video flex flex-col relative group">
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              loop
              muted={isMuted}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
            />

            {/* Custom Control Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                </button>
                <button
                  type="button"
                  onClick={restartVideo}
                  className="p-1.5 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                  title="Restart"
                >
                  <RotateCcw className="size-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Sound toggle defaults to ON (muted = false) */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="size-4" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Off</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="size-4" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">On</span>
                    </>
                  )}
                </button>

                {/* Download button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-1.5 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                  title="Download Video"
                >
                  <Download className="size-4" />
                </button>

                {/* Expand / Fullscreen button */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:bg-white/20 text-white rounded-lg transition-colors cursor-pointer"
                  title="Fullscreen"
                >
                  <Maximize2 className="size-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[360px] mx-auto mb-6 aspect-video rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-semibold">
            No video URL provided.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!hideFooter && (
        <div className="w-full flex-shrink-0 flex flex-col gap-2 pb-8 px-4 pt-2 bg-gradient-to-t from-white via-white to-transparent relative z-20 border-t border-slate-50">
          {/* Row 1: Dialogue Overlay */}
          <button
            type="button"
            onClick={() => onNext?.("[ADD_DIALOGUES]")}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold text-[11px] rounded-full transition-all active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Volume2 className="size-4 animate-bounce" />
            Add Dialogues (AI Voiceover)
          </button>

          {/* Row 2: Secondary Actions */}
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => onNext?.("[SHOW_GALLERY]")}
              className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-[#0b1957] font-bold text-[10px] rounded-full transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1"
            >
              <ArrowLeft className="size-3.5" />
              Back to Gallery
            </button>
            <button
              type="button"
              onClick={() => onNext?.("[EXTEND_VIDEO]")}
              className="flex-1 py-3 border border-blue-200 hover:bg-blue-50/50 text-blue-700 bg-blue-50/25 font-bold text-[10px] rounded-full transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1 shadow-sm hover:shadow"
            >
              <Sparkles className="size-3.5 text-amber-500 animate-pulse" />
              Extend Video
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 py-3 bg-gradient-to-br from-[#0b1957] to-[#1e293b] hover:from-[#0b1957] hover:to-[#0b1957] text-white font-bold text-[10px] rounded-full transition-all active:scale-95 shadow-md hover:shadow-lg shadow-[#0b1957]/10 cursor-pointer text-center flex items-center justify-center gap-1"
            >
              <Download className="size-3.5" />
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
