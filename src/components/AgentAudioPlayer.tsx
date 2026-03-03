"use client";
import { Play, Pause, Volume2 } from "lucide-react";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
interface AgentAudioPlayerProps {
  src?: string;
  height?: number;
  /**
   * Optional: if you want to force a width.
   * By default the component uses its container width.
   */
  width?: number;
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
}: AgentAudioPlayerProps) => {
  const [playing, setPlaying] = useState(false);
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
    if (!audio.paused && !audio.ended) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (audio.ended) setPlaying(false);
    }
  }, []);
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
          <span className="tabular-nums text-muted-foreground">
            {timeFmt(currentTime)} / {timeFmt(duration)}
          </span>
        </div>
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