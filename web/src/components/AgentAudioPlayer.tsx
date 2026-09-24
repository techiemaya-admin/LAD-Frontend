"use client";
import { Play, Pause, Volume2, Scissors, Download, X } from "lucide-react";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  sliceAudioBuffer,
  audioBufferToWav,
  saveBlob,
  clockToSeconds,
  secondsToClock,
  clipFilename,
} from "@/utils/audioTrim";
import { getRecordingMp3Url } from "@lad/frontend-features/call-logs";
import { downloadRecording } from "@/utils/recordingDownload";
interface AgentAudioPlayerProps {
  src?: string;
  height?: number;
  /**
   * Optional: if you want to force a width.
   * By default the component uses its container width.
   */
  width?: number;
  /** Base name for a trimmed clip download (the full recording's filename works). */
  downloadBaseName?: string;
  /**
   * Call id. Given one, a trimmed clip is fetched as MP3 from the server rather
   * than encoded here as WAV — WhatsApp refuses a .wav attachment as audio the
   * same way it refuses .ogg, so the browser-made clip could not be forwarded.
   * Without it the WAV path still works.
   */
  callId?: string | null;
}
type Peaks = number[];
interface WaveformProps {
  peaks: Peaks;
  height: number;
  width: number;
  barWidth: number;
  gap: number;
  playedColor: string;
  unplayedColor: string;
  playheadColor: string;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
}
const Waveform = ({
  peaks,
  height,
  width,
  barWidth,
  gap,
  playedColor,
  unplayedColor,
  playheadColor,
  currentTime,
  duration,
  onSeek,
}: WaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const totalBars = peaks.length;
  // HiDPI scaling
  const dpr =
    typeof window !== "undefined"
      ? Math.max(1, window.devicePixelRatio || 1)
      : 1;
  const drawWidth = Math.max(1, Math.floor(width * dpr));
  const drawHeight = Math.max(1, Math.floor(height * dpr));
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = drawWidth;
    canvas.height = drawHeight;
    canvas.style.width = "100%";
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const playheadBar =
      duration > 0
        ? Math.min(
            totalBars - 1,
            Math.floor((currentTime / duration) * totalBars)
          )
        : -1;
    // bars
    for (let i = 0; i < totalBars; i++) {
      const peak = peaks[i]; // 0..1
      const barH = Math.max(1, Math.floor(peak * height));
      const x = i * (barWidth + gap);
      const y = Math.floor((height - barH) / 2);
      ctx.fillStyle = i <= playheadBar ? playedColor : unplayedColor;
      ctx.fillRect(x, y, barWidth, barH);
    }
    // playhead line
    if (playheadBar >= 0) {
      const playheadX = playheadBar * (barWidth + gap) + barWidth / 2;
      ctx.strokeStyle = playheadColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [
    peaks,
    height,
    width,
    barWidth,
    gap,
    playedColor,
    unplayedColor,
    playheadColor,
    currentTime,
    duration,
    dpr,
    drawWidth,
    drawHeight,
    totalBars,
  ]);
  useEffect(() => {
    draw();
  }, [draw]);
  // Seek on click/drag
  const handlePointer = (clientX: number) => {
    if (!onSeek || duration <= 0) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, x / rect.width));
    onSeek(ratio * duration);
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dragging = false;
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      handlePointer(e.clientX);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (dragging) handlePointer(e.clientX);
    };
    const onPointerUp = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onSeek, duration]);
  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-[50px]"
    />
  );
};
export const AgentAudioPlayer = ({
  src,
  height = 50,
  width = 0,
  downloadBaseName = "call-recording",
  callId,
}: AgentAudioPlayerProps) => {
  const [playing, setPlaying] = useState(false);
  // Trim: a [start, end] window on the recording, dragged on the waveform or
  // typed as m:ss, played on its own, and saved as a WAV cut client-side from
  // the AudioBuffer already decoded for the waveform.
  const [trimOn, setTrimOn] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimStartText, setTrimStartText] = useState("0:00");
  const [trimEndText, setTrimEndText] = useState("0:00");
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [exporting, setExporting] = useState(false);
  const playingSelectionRef = useRef(false);
  const waveWrapRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [peaks, setPeaks] = useState<Peaks>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  // Proxy Google Cloud Storage URLs to avoid CORS issues
  const proxiedSrc = useMemo(() => {
    if (!src) return '';
    if (src.includes('storage.googleapis.com') || src.startsWith('gs://')) {
      return `/api/recording-proxy?url=${encodeURIComponent(src)}`;
    }
    return src;
  }, [src]);
  // measure container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      setContainerWidth(el.offsetWidth);
    };
    updateWidth();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
  }, []);
  const barWidth = 2;
  const gap = 1;
  const effectiveWidth = useMemo(() => {
    if (containerWidth > 0) return containerWidth;
    if (width && width > 0) return width;
    return 600; // fallback
  }, [containerWidth, width]);
  const barCount = useMemo(
    () =>
      Math.max(1, Math.floor(effectiveWidth / (barWidth + gap))),
    [effectiveWidth, barWidth, gap]
  );
  // load audioBuffer (once per src)
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (!src) {
        setAudioBuffer(null);
        setPeaks([]);
        setCurrentTime(0);
        setDuration(0);
        return;
      }
      setLoading(true);
      setError(null);
      setPeaks([]);
      setCurrentTime(0);
      setDuration(0);
      try {
        // Use proxy for Google Cloud Storage URLs to avoid CORS issues
        const res = await fetch(proxiedSrc, { signal: controller.signal });
        if (!res.ok)
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const ab = await res.arrayBuffer();
        const AudioCtx =
          window.AudioContext ||
          (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const decoded = await ctx.decodeAudioData(ab);
        setAudioBuffer(decoded);
        if (decoded.duration && !Number.isNaN(decoded.duration)) {
          setDuration(decoded.duration);
        }
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Failed to load audio");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      controller.abort();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [src]);
  // compute peaks whenever we have audioBuffer + barCount
  useEffect(() => {
    if (!audioBuffer || barCount <= 0) {
      setPeaks([]);
      return;
    }
    const data = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.max(
      1,
      Math.floor(data.length / barCount)
    );
    const nextPeaks: number[] = new Array(barCount).fill(0);
    for (let i = 0; i < barCount; i++) {
      const start = i * samplesPerBar;
      const end = Math.min(start + samplesPerBar, data.length);
      let peak = 0;
      for (let j = start; j < end; j++) {
        const v = Math.abs(data[j]);
        if (v > peak) peak = v;
      }
      nextPeaks[i] = peak;
    }
    setPeaks(nextPeaks);
  }, [audioBuffer, barCount]);
  // rAF time sync
  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (playingSelectionRef.current && trimOn && audio.currentTime >= trimEnd) {
      audio.pause();
      audio.currentTime = trimStart;
      setCurrentTime(trimStart);
      playingSelectionRef.current = false;
      setPlaying(false);
      return;
    }
    if (!audio.paused && !audio.ended) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (audio.ended) setPlaying(false);
    }
  }, [trimOn, trimEnd, trimStart]);
  useEffect(() => {
    if (playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, tick]);
  // sync play/pause to element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio
        .play()
        .catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing]);
  const handleSeek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(time)) return;
      const clamped = Math.min(duration, Math.max(0, time));
      audio.currentTime = clamped;
      setCurrentTime(clamped);
      if (playing && !audio.paused) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [duration, playing, tick]
  );
  // --- trim -----------------------------------------------------------------
  const clampT = useCallback((t: number) => Math.min(duration, Math.max(0, t)), [duration]);
  const setStart = useCallback((t: number) => {
    const v = clampT(t);
    setTrimStart(v);
    setTrimStartText(secondsToClock(v, true));
    if (v > trimEnd) { setTrimEnd(v); setTrimEndText(secondsToClock(v, true)); }
  }, [clampT, trimEnd]);
  const setEnd = useCallback((t: number) => {
    const v = clampT(t);
    setTrimEnd(v);
    setTrimEndText(secondsToClock(v, true));
    if (v < trimStart) { setTrimStart(v); setTrimStartText(secondsToClock(v, true)); }
  }, [clampT, trimStart]);
  const openTrim = useCallback(() => {
    // Default window: the whole recording, so the first drag is "shorten this".
    setTrimStart(0); setTrimStartText("0:00.0");
    setTrimEnd(duration); setTrimEndText(secondsToClock(duration, true));
    setTrimOn(true);
  }, [duration]);
  const closeTrim = useCallback(() => {
    setTrimOn(false);
    setDragging(null);
    playingSelectionRef.current = false;
  }, []);
  const commitClock = useCallback((which: "start" | "end", text: string) => {
    const t = clockToSeconds(text);
    if (t === null) {
      if (which === "start") setTrimStartText(secondsToClock(trimStart, true));
      else setTrimEndText(secondsToClock(trimEnd, true));
      return;
    }
    if (which === "start") setStart(t); else setEnd(t);
  }, [setStart, setEnd, trimStart, trimEnd]);
  const playSelection = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || trimEnd <= trimStart) return;
    audio.currentTime = trimStart;
    setCurrentTime(trimStart);
    playingSelectionRef.current = true;
    setPlaying(true);
  }, [trimStart, trimEnd]);
  const downloadClip = useCallback(async () => {
    if (trimEnd <= trimStart) return;
    setExporting(true);
    try {
      // Prefer an MP3 of the window from the server: a WAV made here is refused
      // by WhatsApp as an audio attachment ("file format is not supported").
      if (callId) {
        try {
          const mp3 = await getRecordingMp3Url({ callId: String(callId), start: trimStart, end: trimEnd });
          const url = mp3?.signed_url || (mp3 as unknown as { data?: { signed_url?: string } })?.data?.signed_url;
          if (url) {
            await downloadRecording(url, clipFilename(downloadBaseName, trimStart, trimEnd, "mp3"));
            return;
          }
        } catch {
          // fall through to the local WAV
        }
      }
      if (!audioBuffer) return;
      const clip = sliceAudioBuffer(audioBuffer, trimStart, trimEnd);
      saveBlob(audioBufferToWav(clip), clipFilename(downloadBaseName, trimStart, trimEnd, "wav"));
    } finally {
      setExporting(false);
    }
  }, [audioBuffer, trimStart, trimEnd, downloadBaseName, callId]);
  const timeAtClientX = useCallback((clientX: number) => {
    const rect = waveWrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || duration <= 0) return null;
    return clampT(((clientX - rect.left) / rect.width) * duration);
  }, [duration, clampT]);
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const t = timeAtClientX(e.clientX);
      if (t === null) return;
      if (dragging === "start") setStart(Math.min(t, trimEnd)); else setEnd(Math.max(t, trimStart));
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, timeAtClientX, setStart, setEnd, trimStart, trimEnd]);
  const selLeftPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const selRightPct = duration > 0 ? (trimEnd / duration) * 100 : 100;
  const clipLen = Math.max(0, trimEnd - trimStart);

  const timeFmt = (t: number) => {
    if (!Number.isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };
  // Empty state
  if (!src) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 border border-border/50 font-[Segoe UI]">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
          <Volume2 className="w-5 h-5 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">
          loading...
        </span>
      </div>
    );
  }
  // Loading / error states
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 font-[Segoe UI]">
        <button
          disabled
          className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/50 text-primary-foreground cursor-not-allowed"
        >
          <Play className="w-5 h-5 ml-0.5" />
        </button>
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground mb-2">
            Call Recording
          </div>
          <div className="h-[50px] animate-pulse bg-muted rounded" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 font-[Segoe UI]">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/20">
          <Volume2 className="w-5 h-5 text-destructive-foreground" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-foreground mb-1">
            Call Recording
          </div>
          <span className="text-sm text-destructive">
            {error}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 transition-all duration-300 hover:shadow-soft font-[Segoe UI]">
      {/* Play / Pause */}
      <button
        onClick={() => setPlaying((p) => !p)}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform duration-200 shadow-md mt-6.5"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>
      {/* Waveform + labels */}
      <div
        ref={containerRef}
        className="flex-1 min-w-0 w-full"
      >
        <div className="flex items-center justify-between text-sm font-medium text-foreground mb-2">
          <span>Call Recording</span>
          <span className="flex items-center gap-3">
            <span className="tabular-nums text-muted-foreground">
              {timeFmt(currentTime)} / {timeFmt(duration)}
            </span>
            {audioBuffer && duration > 0 && (
              <button
                type="button"
                onClick={trimOn ? closeTrim : openTrim}
                aria-pressed={trimOn}
                title={trimOn ? "Close trim" : "Trim a clip"}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors ${trimOn ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                {trimOn ? <X className="h-3.5 w-3.5" /> : <Scissors className="h-3.5 w-3.5" />}
                {trimOn ? "Done" : "Trim"}
              </button>
            )}
          </span>
        </div>
        <div ref={waveWrapRef} className="relative select-none">
          {peaks.length > 0 && effectiveWidth > 0 ? (
            <Waveform
              peaks={peaks}
              height={height}
              width={effectiveWidth}
              barWidth={barWidth}
              gap={gap}
              playedColor="#1E40AF" // dark blue
              unplayedColor="#93C5FD" // light blue
              playheadColor="#EF4444" // red
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
            />
          ) : (
            <div className="h-[50px] rounded bg-muted/60" />
          )}
          {trimOn && duration > 0 && (
            <>
              {/* dimmed outside the window; pointer-events off so seeking still works there */}
              <div className="absolute inset-y-0 left-0 bg-background/60 pointer-events-none" style={{ width: `${selLeftPct}%` }} />
              <div className="absolute inset-y-0 right-0 bg-background/60 pointer-events-none" style={{ width: `${100 - selRightPct}%` }} />
              <div className="absolute inset-y-0 border-y-2 border-amber-400/70 pointer-events-none" style={{ left: `${selLeftPct}%`, width: `${Math.max(0, selRightPct - selLeftPct)}%` }} />
              {(["start", "end"] as const).map((which) => (
                <div
                  key={which}
                  role="slider"
                  aria-label={which === "start" ? "Clip start" : "Clip end"}
                  aria-valuemin={0}
                  aria-valuemax={duration}
                  aria-valuenow={which === "start" ? trimStart : trimEnd}
                  tabIndex={0}
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(which); }}
                  onKeyDown={(e) => {
                    const step = e.shiftKey ? 1 : 0.1;
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                      e.preventDefault();
                      const d = e.key === "ArrowLeft" ? -step : step;
                      if (which === "start") setStart(trimStart + d); else setEnd(trimEnd + d);
                    }
                  }}
                  className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize touch-none flex items-center justify-center"
                  style={{ left: `${which === "start" ? selLeftPct : selRightPct}%` }}
                >
                  <div className="h-full w-1 rounded bg-amber-500 shadow" />
                </div>
              ))}
            </>
          )}
        </div>
        {trimOn && duration > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1 text-muted-foreground">
              From
              <input
                value={trimStartText}
                onChange={(e) => setTrimStartText(e.target.value)}
                onBlur={(e) => commitClock("start", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitClock("start", (e.target as HTMLInputElement).value); }}
                className="w-16 rounded border border-border bg-background px-1.5 py-0.5 font-mono tabular-nums text-foreground"
                aria-label="Clip start (m:ss)"
              />
            </label>
            <label className="flex items-center gap-1 text-muted-foreground">
              to
              <input
                value={trimEndText}
                onChange={(e) => setTrimEndText(e.target.value)}
                onBlur={(e) => commitClock("end", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitClock("end", (e.target as HTMLInputElement).value); }}
                className="w-16 rounded border border-border bg-background px-1.5 py-0.5 font-mono tabular-nums text-foreground"
                aria-label="Clip end (m:ss)"
              />
            </label>
            <button type="button" onClick={() => setStart(currentTime)} className="rounded border border-border px-2 py-0.5 hover:bg-muted" title="Use the playhead as the start">Start here</button>
            <button type="button" onClick={() => setEnd(currentTime)} className="rounded border border-border px-2 py-0.5 hover:bg-muted" title="Use the playhead as the end">End here</button>
            <button type="button" onClick={playSelection} disabled={clipLen <= 0} className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 hover:bg-muted disabled:opacity-50">
              <Play className="h-3 w-3" /> Play selection
            </button>
            <button
              type="button"
              onClick={downloadClip}
              disabled={exporting || clipLen <= 0}
              className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-0.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              title="Save the selected part as a WAV file"
            >
              <Download className="h-3 w-3" /> {exporting ? "Saving…" : `Download clip (${secondsToClock(clipLen)})`}
            </button>
          </div>
        )}
      </div>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={proxiedSrc}
        preload="metadata"
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={() => {
          if (audioRef.current?.duration) {
            setDuration(audioRef.current.duration);
          }
        }}
        onTimeUpdate={() => {
          if (!rafRef.current && audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
      />
    </div>
  );
};
// "use client";
// import { Play, Pause, Volume2 } from "lucide-react";
// import { useState, useRef, useEffect, useCallback, useMemo } from "react";
// interface AgentAudioPlayerProps {
//   src?: string;
//   height?: number;
//   width?: number;
// }
// type Peaks = number[];
// interface WaveformProps {
//   peaks: Peaks;
//   height: number;
//   width: number;
//   barWidth: number;
//   gap: number;
//   playedColor: string;
//   unplayedColor: string;
//   playheadColor: string;
//   currentTime: number;
//   duration: number;
//   onSeek?: (time: number) => void;
// }
// const Waveform = ({
//   peaks,
//   height,
//   width,
//   barWidth,
//   gap,
//   playedColor,
//   unplayedColor,
//   playheadColor,
//   currentTime,
//   duration,
//   onSeek,
// }: WaveformProps) => {
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const totalBars = peaks.length;
//   // DPI scaling so it looks crisp on HiDPI screens
//   const dpr = typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
//   const drawWidth = Math.floor(width * dpr);
//   const drawHeight = Math.floor(height * dpr);
//   const draw = useCallback(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;
//     // scale to DPR
//     canvas.width = drawWidth;
//     canvas.height = drawHeight;
//     canvas.style.width = `${width}px`;
//     canvas.style.height = `${height}px`;
//     ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
//     ctx.clearRect(0, 0, width, height);
//     const playheadBar =
//       duration > 0 ? Math.min(totalBars - 1, Math.floor((currentTime / duration) * totalBars)) : -1;
//     // draw bars
//     for (let i = 0; i < totalBars; i++) {
//       const peak = peaks[i]; // 0..1
//       const barH = Math.max(1, Math.floor(peak * height));
//       const x = i * (barWidth + gap);
//       const y = Math.floor((height - barH) / 2);
//       ctx.fillStyle = i <= playheadBar ? playedColor : unplayedColor;
//       ctx.fillRect(x, y, barWidth, barH);
//     }
//     // playhead
//     if (playheadBar >= 0) {
//       const playheadX = playheadBar * (barWidth + gap) + barWidth / 2;
//       ctx.strokeStyle = playheadColor;
//       ctx.lineWidth = 2;
//       ctx.beginPath();
//       ctx.moveTo(playheadX, 0);
//       ctx.lineTo(playheadX, height);
//       ctx.stroke();
//     }
//   }, [
//     peaks,
//     height,
//     width,
//     barWidth,
//     gap,
//     playedColor,
//     unplayedColor,
//     playheadColor,
//     currentTime,
//     duration,
//     dpr,
//     drawWidth,
//     drawHeight,
//     totalBars,
//   ]);
//   useEffect(() => {
//     draw();
//   }, [draw]);
//   // Seeking (click + drag)
//   const handlePointer = (clientX: number) => {
//     if (!onSeek || duration <= 0) return;
//     const rect = canvasRef.current?.getBoundingClientRect();
//     if (!rect) return;
//     const x = clientX - rect.left;
//     const ratio = Math.min(1, Math.max(0, x / rect.width));
//     onSeek(ratio * duration);
//   };
//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     let dragging = false;
//     const onPointerDown = (e: PointerEvent) => {
//       dragging = true;
//       handlePointer(e.clientX);
//     };
//     const onPointerMove = (e: PointerEvent) => {
//       if (dragging) handlePointer(e.clientX);
//     };
//     const onPointerUp = () => {
//       dragging = false;
//     };
//     canvas.addEventListener("pointerdown", onPointerDown);
//     window.addEventListener("pointermove", onPointerMove);
//     window.addEventListener("pointerup", onPointerUp);
//     return () => {
//       canvas.removeEventListener("pointerdown", onPointerDown);
//       window.removeEventListener("pointermove", onPointerMove);
//       window.removeEventListener("pointerup", onPointerUp);
//     };
//   }, [onSeek, duration]);
//   return <canvas ref={canvasRef} className="block w-full h-[50px]" />;
// };
// export const AgentAudioPlayer = ({
//   src,
//   height = 50,
//   width = 0, // wider so the waveform is “elaborate”
// }: AgentAudioPlayerProps) => {
//   const [playing, setPlaying] = useState(false);
//   const [currentTime, setCurrentTime] = useState(0);
//   const [duration, setDuration] = useState(0);
//   const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
//   const [peaks, setPeaks] = useState<Peaks>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const audioRef = useRef<HTMLAudioElement>(null);
//   const audioCtxRef = useRef<AudioContext | null>(null);
//   const rafRef = useRef<number | null>(null);
//   const containerRef = useRef<HTMLDivElement>(null);
// const [containerWidth, setContainerWidth] = useState(0);
// useEffect(() => {
//   if (!containerRef.current) return;
//   const observer = new ResizeObserver(() => {
//     setContainerWidth(containerRef.current!.offsetWidth);
//   });
//   observer.observe(containerRef.current);
//   return () => observer.disconnect();
// }, []);
//   // Precompute peaks for a fixed number of bars (based on pixel width)
//   const barWidth = 2;
//   const gap = 1;
//   // const totalBars = useMemo(() => Math.max(1, Math.floor(width / (barWidth + gap))), [width]);
//   const totalBars = useMemo(() => {
//   if (containerWidth > 0) {
//     return Math.max(1, Math.floor(containerWidth / (barWidth + gap)));
//   }
//   return 1;
// }, [containerWidth]);
//   useEffect(() => {
//     const controller = new AbortController();
//     const load = async () => {
//       if (!src) return;
//       setLoading(true);
//       setError(null);
//       try {
//         const res = await fetch(src, { signal: controller.signal });
//         if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
//         const ab = await res.arrayBuffer();
//         const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
//         audioCtxRef.current = ctx;
//         const decoded = await ctx.decodeAudioData(ab);
//         setAudioBuffer(decoded);
//         // compute peaks
//         const data = decoded.getChannelData(0);
//         const samplesPerBar = Math.max(1, Math.floor(data.length / totalBars));
//         const p: number[] = new Array(totalBars).fill(0);
//         for (let i = 0; i < totalBars; i++) {
//           const start = i * samplesPerBar;
//           const end = Math.min(start + samplesPerBar, data.length);
//           let peak = 0;
//           for (let j = start; j < end; j++) {
//             const v = Math.abs(data[j]);
//             if (v > peak) peak = v;
//           }
//           p[i] = peak; // already 0..1
//         }
//         setPeaks(p);
//       } catch (e: any) {
//         if (e?.name !== "AbortError") {
//           setError(e?.message || "Failed to load audio");
//         }
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//     return () => {
//       controller.abort();
//       if (audioCtxRef.current) {
//         audioCtxRef.current.close();
//         audioCtxRef.current = null;
//       }
//     };
//   }, [src, totalBars]);
//   // Keep duration from the <audio> element (so time is exact to what plays)
//   useEffect(() => {
//     const audio = audioRef.current;
//     if (!audio) return;
//     const onLoadedMeta = () => setDuration(audio.duration || 0);
//     audio.addEventListener("loadedmetadata", onLoadedMeta);
//     return () => audio.removeEventListener("loadedmetadata", onLoadedMeta);
//   }, []);
//   // Smooth time updates with rAF (instead of relying only on 'timeupdate')
//   const tick = useCallback(() => {
//     const audio = audioRef.current;
//     if (!audio) return;
//     setCurrentTime(audio.currentTime);
//     if (!audio.paused && !audio.ended) {
//       rafRef.current = requestAnimationFrame(tick);
//     } else {
//       rafRef.current && cancelAnimationFrame(rafRef.current);
//       rafRef.current = null;
//       if (audio.ended) setPlaying(false);
//     }
//   }, []);
//   useEffect(() => {
//     if (playing) {
//       rafRef.current && cancelAnimationFrame(rafRef.current);
//       rafRef.current = requestAnimationFrame(tick);
//     } else if (rafRef.current) {
//       cancelAnimationFrame(rafRef.current);
//       rafRef.current = null;
//     }
//     return () => {
//       if (rafRef.current) cancelAnimationFrame(rafRef.current);
//     };
//   }, [playing, tick]);
//   // Sync play/pause to element
//   useEffect(() => {
//     const audio = audioRef.current;
//     if (!audio) return;
//     if (playing) {
//       audio.play().catch(() => setPlaying(false));
//     } else {
//       audio.pause();
//     }
//   }, [playing]);
//   const handleSeek = useCallback((time: number) => {
//     const audio = audioRef.current;
//     if (!audio || !Number.isFinite(time)) return;
//     audio.currentTime = Math.min(duration, Math.max(0, time));
//     setCurrentTime(audio.currentTime);
//     // keep the playhead moving if already playing
//     if (playing && !audio.paused) {
//       rafRef.current && cancelAnimationFrame(rafRef.current);
//       rafRef.current = requestAnimationFrame(tick);
//     }
//   }, [duration, playing, tick]);
//   // Empty state
//   if (!src) {
//     return (
//       <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 border border-border/50 font-[Segoe UI]">
//         <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
//           <Volume2 className="w-5 h-5 text-muted-foreground" />
//         </div>
//         <span className="text-sm text-muted-foreground">loading...</span>
//       </div>
//     );
//   }
//   // Loading / error
//   if (loading) {
//     return (
//       <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 font-[Segoe UI]">
//         <button
//           disabled
//           className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/50 text-primary-foreground cursor-not-allowed"
//         >
//           <Play className="w-5 h-5 ml-0.5" />
//         </button>
//         <div className="flex-1">
//           <div className="text-sm font-medium text-foreground mb-2">Call Recording</div>
//           <div className="h-[50px] animate-pulse bg-muted rounded" />
//         </div>
//       </div>
//     );
//   }
//   if (error) {
//     return (
//       <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 font-[Segoe UI]">
//         <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/20">
//           <Volume2 className="w-5 h-5 text-destructive-foreground" />
//         </div>
//         <div className="flex-1">
//           <div className="text-sm font-medium text-foreground mb-1">Call Recording</div>
//           <span className="text-sm text-destructive">{error}</span>
//         </div>
//       </div>
//     );
//   }
//   const timeFmt = (t: number) => {
//     if (!Number.isFinite(t)) return "0:00";
//     const m = Math.floor(t / 60);
//     const s = Math.floor(t % 60).toString().padStart(2, "0");
//     return `${m}:${s}`;
//     };
//   return (
//     <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 transition-all duration-300 hover:shadow-soft font-[Segoe UI]">
//       {/* Play / Pause */}
//       <button
//         onClick={() => setPlaying((p) => !p)}
//         className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform duration-200 shadow-md"
//         aria-label={playing ? "Pause" : "Play"}
//       >
//         {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
//       </button>
//       {/* Waveform */}
//       <div className="flex-1 min-w-0">
//         <div className="flex items-center justify-between text-sm font-medium text-foreground mb-2">
//           <span>Call Recording</span>
//           <span className="tabular-nums text-muted-foreground">
//             {timeFmt(currentTime)} / {timeFmt(duration)}
//           </span>
//         </div>
//         {peaks.length > 0 && containerWidth > 0 ? (
//           <Waveform
//             peaks={peaks}
//             height={height}
//             width={containerWidth}
//             barWidth={2}
//             gap={1}
//             playedColor="#1E40AF"
//             unplayedColor="#93C5FD"
//             playheadColor="#EF4444"
//             currentTime={currentTime}
//             duration={duration}
//             onSeek={handleSeek}
//           />
//         ) : (
//           <div className="h-[50px] animate-pulse bg-muted rounded" />
//         )}
//       </div>
//       {/* Hidden audio element */}
//       <audio
//         ref={audioRef}
//         src={src}
//         preload="metadata"
//         onEnded={() => setPlaying(false)}
//         onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
//         // Keep 'timeupdate' as a fallback (mobile browsers throttling rAF in background)
//         onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
//       />
//     </div>
//   );
// };
