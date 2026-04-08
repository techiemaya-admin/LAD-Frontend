'use client';

import { useState, useEffect, useRef } from 'react';
import {
  useMultibandTrackVolume,
  type AgentState,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react';
import type { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface LadsBarState {
  h: number;   // height in SVG units
  dy: number;   // vertical offset (negative = up)
  dx: number;   // horizontal offset
  opacity: number;   // 0–1
}

export interface LadsLiquidState {
  level: number;   // 0–1 fill fraction
  amp: number;   // wave amplitude in SVG units
  t: number;   // elapsed time (drives wave phase)
}

export interface UseAgentAudioVisualizerLadsResult {
  /** Animated state for each of the three dots/bars. Index 0 = left, 2 = right. */
  bars: [LadsBarState, LadsBarState, LadsBarState];
  /** Liquid fill animation values — only meaningful during connecting/initializing. */
  liquid: LadsLiquidState;
  /**
   * Cross-fade value (0–1).
   * 0 = dot/bar layer fully visible.
   * 1 = liquid layer fully visible.
   * Smoothly interpolates between the two modes.
   */
  crossfade: number;
}

// ─── SVG coordinate constants (must match the component's viewBox transform) ──

/** Center-X of each dot in the component's SVG coordinate space. */
export const LADS_DOT_CX = [324.4, 344.5, 364.8] as const;
/** Center-Y of the dot row. */
export const LADS_DOT_BY = 227.2;
/** Dot width (and resting height) in SVG units. */
export const LADS_DOT_W = 11;
/** Resting dot height. */
export const LADS_DOT_H = 11;
/** Maximum bar height during speaking (full volume). */
export const LADS_DOT_MAX_H = 50;

/** Left edge of the wave in SVG units. */
export const LADS_WAVE_XL = 238;
/** Right edge of the wave in SVG units. */
export const LADS_WAVE_XR = 436;
/** Top of the logo bounding box (wave upper limit). */
export const LADS_WAVE_YT = 90;
/** Bottom of the logo bounding box (wave base). */
export const LADS_WAVE_YB = 300;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function isLiquidState(s: AgentState | undefined) {
  return s === 'connecting' || s === 'initializing';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Animation hook for `AgentAudioVisualizerLads`.
 *
 * State → animation mapping:
 *
 * | State               | Animation                                             |
 * |---------------------|-------------------------------------------------------|
 * | idle                | Dots sway gently left/right — calm float              |
 * | disconnected        | Slow glitch: drift + occasional snap + opacity flicker|
 * | connecting          | Liquid fills logo vessel, moderate churn              |
 * | initializing        | Liquid fills logo vessel, slightly more turbulent     |
 * | listening           | Sequential left→right vertical bounce                 |
 * | thinking            | Newton's cradle — outer dots alternate, middle rests  |
 * | speaking            | Three bars driven by low/mid/high audio frequency bands |
 */
export function useAgentAudioVisualizerLads(
  state: AgentState | undefined,
  audioTrack?: LocalAudioTrack | RemoteAudioTrack | TrackReferenceOrPlaceholder,
): UseAgentAudioVisualizerLadsResult {

  // ── Output state (triggers re-render) ───────────────────────────────────────
  const [bars, setBars] = useState<[LadsBarState, LadsBarState, LadsBarState]>([
    { h: LADS_DOT_H, dy: 0, dx: 0, opacity: 1 },
    { h: LADS_DOT_H, dy: 0, dx: 0, opacity: 1 },
    { h: LADS_DOT_H, dy: 0, dx: 0, opacity: 1 },
  ]);
  const [liquid, setLiquid] = useState<LadsLiquidState>({ level: 0, amp: 3, t: 0 });
  const [crossfade, setCrossfade] = useState(isLiquidState(state) ? 1 : 0);

  // ── Internal mutable refs (mutated every frame, no re-render cost) ──────────
  const hRef = useRef([LADS_DOT_H, LADS_DOT_H, LADS_DOT_H]);
  const dyRef = useRef([0, 0, 0]);
  const dxRef = useRef([0, 0, 0]);
  const opRef = useRef([1, 1, 1]);
  const lvlRef = useRef(isLiquidState(state) ? 0.62 : 0);
  const ampRef = useRef(3);
  const cfRef = useRef(isLiquidState(state) ? 1 : 0);
  const tRef = useRef(0);
  const lastTs = useRef(0);
  const stRef = useRef(state);
  stRef.current = state;

  // ── 3-band audio volume from the agent's audio track ────────────────────────
  // Bands map to: [0] low 20–300 Hz, [1] mid 300–3 kHz, [2] high 3–16 kHz
  const bandVolumes = useMultibandTrackVolume(
    audioTrack as LocalAudioTrack | RemoteAudioTrack | undefined,
    { bands: 3 },
  );

  // ── rAF animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    let raf: number;

    function frame(ts: number) {
      const dt = lastTs.current
        ? Math.min((ts - lastTs.current) / 1000, 0.05)
        : 0.016;
      lastTs.current = ts;
      tRef.current += dt;

      const t = tRef.current;
      const st = stRef.current;

      // ── Cross-fade between liquid and dot layers ──────────────────────────
      cfRef.current = lerp(cfRef.current, isLiquidState(st) ? 1 : 0, 0.07);

      // ── Liquid level and wave amplitude ───────────────────────────────────
      lvlRef.current = lerp(
        lvlRef.current,
        isLiquidState(st) ? 0.62 : 0,
        isLiquidState(st) ? 0.018 : 0.04,
      );
      ampRef.current = lerp(
        ampRef.current,
        isLiquidState(st) ? (st === 'initializing' ? 9 : 7) : 2,
        0.05,
      );

      // ── Per-dot animation ─────────────────────────────────────────────────
      const spd = 0.15;

      for (let i = 0; i < 3; i++) {
        let tgtH = LADS_DOT_H;
        let tgtDy = 0;
        let tgtDx = 0;
        let tgtOp = 1;

        switch (st) {
          case 'idle':
            // Slow horizontal sway with gentle vertical drift
            tgtDx = Math.sin(t * 1.8 + i * 0.18) * 5;
            tgtDy = Math.sin(t * 0.9 + i * 0.4) * 1.5;
            break;

          case 'connecting':
          case 'initializing':
            // Static — liquid layer handles the visual
            break;

          case 'disconnected':
            // Slow drift with rare position snaps + opacity fade
            tgtDx = Math.sin(t * 11 + i * 11.3) * 2 * (Math.random() > 0.94 ? 4 : 1);
            tgtOp = 0.45 + Math.abs(Math.sin(t * 2.8 + i * 2.1)) * 0.55;
            break;

          case 'thinking': {
            // Newton's cradle physics:
            // Left & right dots alternate swinging on invisible strings.
            // Middle dot is nearly stationary, nudges at each impact.
            const R = 20;   // effective string length (SVG units)
            const freq = 2.6;  // swing frequency (rad/s)
            const swingAmp = 9;    // max horizontal travel (SVG units)
            const s = Math.sin(t * freq);

            if (i === 0) {
              // Left dot: active on positive half-cycle, swings LEFT
              const swing = Math.max(0, s);
              tgtDx = -swingAmp * swing;
              tgtDy = -(tgtDx * tgtDx) / (2 * R); // arc: rises as it swings out
            } else if (i === 2) {
              // Right dot: active on negative half-cycle, swings RIGHT
              const swing = Math.max(0, -s);
              tgtDx = swingAmp * swing;
              tgtDy = -(tgtDx * tgtDx) / (2 * R);
            } else {
              // Middle dot: nearly still, tiny nudge at each impact (when s ≈ 0)
              const impact = Math.exp(-Math.pow(s * 8, 2));
              tgtDy = -impact * 1.2;
            }
            break;
          }

          case 'listening':
            // Sequential left→right vertical bounce
            tgtDy = -Math.max(0, Math.sin(t * 7.5 - i * 2.1)) * 8;
            break;

          case 'speaking': {
            // Bar height driven by frequency band volume (0–1)
            // Left dot (0) uses band 0 (low)
            // Middle dot (1) uses band 2 (high) - originally 1
            // Right dot (2) uses band 1 (mid) - originally 2
            const bandIndex = i === 1 ? 2 : (i === 2 ? 1 : i);
            let v = Math.max(0, Math.min(1, bandVolumes?.[bandIndex] ?? 0));

            // Make the middle dot 20% more sensitive
            if (i === 1) {
              v = Math.min(1, v * 1.2);
            }

            tgtH = LADS_DOT_H + v * (LADS_DOT_MAX_H - LADS_DOT_H);
            break;
          }

          default:
            break;
        }

        // Apply lerp — disconnected uses no lerp on dx for instant jitter feel;
        // thinking uses faster tracking so the cradle snap feels physical.
        if (st === 'disconnected') {
          dxRef.current[i] = tgtDx;
          opRef.current[i] = lerp(opRef.current[i], tgtOp, 0.15);
        } else if (st === 'thinking') {
          dxRef.current[i] = lerp(dxRef.current[i], tgtDx, 0.32);
          opRef.current[i] = 1;
        } else {
          dxRef.current[i] = lerp(dxRef.current[i], tgtDx, spd * 2);
          opRef.current[i] = lerp(opRef.current[i], 1, 0.1);
        }

        const hSpd = st === 'speaking' ? 0.22 : spd;
        hRef.current[i] = lerp(hRef.current[i], tgtH, hSpd);
        dyRef.current[i] = lerp(dyRef.current[i], tgtDy, st === 'thinking' ? 0.32 : spd * 2);
      }

      // ── Flush to React state ──────────────────────────────────────────────
      setBars([0, 1, 2].map(i => ({
        h: hRef.current[i],
        dy: dyRef.current[i],
        dx: dxRef.current[i],
        opacity: opRef.current[i],
      })) as [LadsBarState, LadsBarState, LadsBarState]);

      setLiquid({ level: lvlRef.current, amp: ampRef.current, t });
      setCrossfade(cfRef.current);

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [bandVolumes]);

  return { bars, liquid, crossfade };
}
