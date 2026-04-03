'use client';
/**
 * AgentVisualizer — animated LAD logo visualizer
 * Ported from lads-visualizer-demo.html
 *
 * States:
 *   idle        — dots sway gently side to side
 *   thinking    — dots bounce left→right (searching / processing)
 *   listening   — Newton's-cradle dots
 *   speaking    — bars pulse to audio
 *   connecting  — liquid rises and churns
 *   initializing— liquid fills
 *   disconnected— dots jitter/glitch
 */
import React, { useRef, useState, useEffect, useId } from 'react';

export type VisualizerState =
  | 'idle'
  | 'thinking'
  | 'listening'
  | 'speaking'
  | 'connecting'
  | 'initializing'
  | 'disconnected';

// ── Brand constants ──────────────────────────────────────────────────────────
const BRAND = '#0b1958';
const DOT_X = [324.4, 344.5, 364.8];

// Clip-path shape (full logo outline with 3 eye-dots, used for liquid mask)
const CLIP_PATH =
  'M 90.605469 187.71875 C 76.769531 183.199219 62.945312 195.695312 66.507812 210.113281' +
  ' C 71.101562 227.882812 90.164062 236.230469 108.925781 235.582031' +
  ' L 108.925781 222.753906 C 77.5625 223.003906 66.898438 189.585938 90.605469 187.71875' +
  ' M 95.804688 197.097656 C 94.132812 197.097656 92.777344 198.457031 92.777344 200.128906' +
  ' C 92.777344 201.800781 94.132812 203.15625 95.804688 203.15625' +
  ' C 97.480469 203.15625 98.835938 201.800781 98.835938 200.128906' +
  ' C 98.835938 198.457031 97.480469 197.097656 95.804688 197.097656 Z' +
  ' M 106.539062 197.097656 C 104.863281 197.097656 103.507812 198.457031 103.507812 200.128906' +
  ' C 103.507812 201.800781 104.863281 203.15625 106.539062 203.15625' +
  ' C 108.210938 203.15625 109.566406 201.800781 109.566406 200.128906' +
  ' C 109.566406 198.457031 108.210938 197.097656 106.539062 197.097656 Z' +
  ' M 117.269531 197.097656 C 115.597656 197.097656 114.242188 198.457031 114.242188 200.128906' +
  ' C 114.242188 201.800781 115.597656 203.15625 117.269531 203.15625' +
  ' C 118.945312 203.15625 120.300781 201.800781 120.300781 200.128906' +
  ' C 120.300781 198.457031 118.945312 197.097656 117.269531 197.097656 Z' +
  ' M 98.324219 160.398438 C 83.8125 156.144531 64.421875 147.125 59.191406 131.710938' +
  ' C 57.5625 136.855469 57.074219 142.109375 57.597656 147.191406' +
  ' C 57.980469 150.925781 58.617188 154.179688 59.46875 157.023438' +
  ' C 62.039062 163.703125 66.59375 169.644531 72.824219 173.90625' +
  ' C 72.195312 170.304688 72.652344 166.597656 74.132812 163.257812' +
  ' C 82.605469 174.226562 111.257812 177.710938 124.609375 186.664062' +
  ' C 130.058594 190.320312 133.394531 196.480469 133.394531 203.140625' +
  ' C 133.394531 215.199219 116.972656 226.980469 109.226562 235.574219' +
  ' C 126.644531 234.882812 143.734375 226.433594 148.6875 210.5625' +
  ' C 162.410156 166.558594 94.703125 161.332031 71.832031 129.640625' +
  ' C 72.855469 145.585938 84.34375 154.5 98.324219 160.398438 Z';

// Solid logo path (no eye-dots — used as the static filled shape)
const SOLID_PATH =
  'M 90.605469 187.71875 C 76.769531 183.199219 62.945312 195.695312 66.507812 210.113281' +
  ' C 71.101562 227.882812 90.164062 236.230469 108.925781 235.582031' +
  ' L 108.925781 222.753906 C 77.5625 223.003906 66.898438 189.585938 90.605469 187.71875 Z' +
  ' M 98.324219 160.398438 C 83.8125 156.144531 64.421875 147.125 59.191406 131.710938' +
  ' C 57.5625 136.855469 57.074219 142.109375 57.597656 147.191406' +
  ' C 57.980469 150.925781 58.617188 154.179688 59.46875 157.023438' +
  ' C 62.039062 163.703125 66.59375 169.644531 72.824219 173.90625' +
  ' C 72.195312 170.304688 72.652344 166.597656 74.132812 163.257812' +
  ' C 82.605469 174.226562 111.257812 177.710938 124.609375 186.664062' +
  ' C 130.058594 190.320312 133.394531 196.480469 133.394531 203.140625' +
  ' C 133.394531 215.199219 116.972656 226.980469 109.226562 235.574219' +
  ' C 126.644531 234.882812 143.734375 226.433594 148.6875 210.5625' +
  ' C 162.410156 166.558594 94.703125 161.332031 71.832031 129.640625' +
  ' C 72.855469 145.585938 84.34375 154.5 98.324219 160.398438 Z';

// ── Liquid wave path ─────────────────────────────────────────────────────────
function wavePath(t: number, amp: number, fill: number): string {
  const baseY = 300 - 210 * fill;
  let d = `M 238 300 L 238 ${baseY + Math.sin(t) * amp * 0.6}`;
  for (let i = 1; i <= 96; i++) {
    const pct = i / 96;
    const x = 238 + 198 * pct;
    const y =
      baseY +
      Math.sin(pct * Math.PI * 3.2 + t) * amp +
      Math.sin(pct * Math.PI * 6.1 + 1.55 * t) * amp * 0.38 +
      Math.sin(pct * Math.PI * 9.3 + 0.73 * t) * amp * 0.16;
    d += ` L ${x} ${y}`;
  }
  return d + ' L 436 300 Z';
}

function isLiquidState(s: VisualizerState) {
  return s === 'connecting' || s === 'initializing';
}

// ── Dot state ────────────────────────────────────────────────────────────────
interface DotState { h: number; dy: number; dx: number; opacity: number }

// ── Component ────────────────────────────────────────────────────────────────
interface Props {
  state?: VisualizerState;
  size?: number;
}

export default function AgentVisualizer({ state = 'idle', size = 36 }: Props) {
  const uid = useId().replace(/:/g, '_');
  const clipId = `lclip_${uid}`;

  const [dots, setDots] = useState<DotState[]>([
    { h: 11, dy: 0, dx: 0, opacity: 1 },
    { h: 11, dy: 0, dx: 0, opacity: 1 },
    { h: 11, dy: 0, dx: 0, opacity: 1 },
  ]);
  const [liquid, setLiquid] = useState({ level: 0, amp: 3, t: 0 });
  const [liquidOpacity, setLiquidOpacity] = useState(isLiquidState(state) ? 1 : 0);

  // Smooth-lerp refs (avoid stale closures)
  const dotH    = useRef([11, 11, 11]);
  const dotDy   = useRef([0, 0, 0]);
  const dotDx   = useRef([0, 0, 0]);
  const dotAlph = useRef([1, 1, 1]);
  const fillRef = useRef(isLiquidState(state) ? 0.62 : 0);
  const ampRef  = useRef(3);
  const liqAlph = useRef(isLiquidState(state) ? 1 : 0);
  const tRef    = useRef(0);
  const prevT   = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let raf: number;
    const loop = (now: number) => {
      const dt = prevT.current ? Math.min((now - prevT.current) / 1000, 0.05) : 0.016;
      prevT.current = now;
      tRef.current += dt;
      const t = tRef.current;
      const s = stateRef.current;

      // ── Liquid ──
      const targetLiqAlph = isLiquidState(s) ? 1 : 0;
      liqAlph.current += (targetLiqAlph - liqAlph.current) * 0.07;

      const targetFill = isLiquidState(s) ? 0.62 : 0;
      const targetAmp  = isLiquidState(s) ? (s === 'initializing' ? 9 : 7) : 2;
      fillRef.current += (targetFill - fillRef.current) * (isLiquidState(s) ? 0.018 : 0.04);
      ampRef.current  += (targetAmp  - ampRef.current)  * 0.05;

      // ── Dots ──
      for (let i = 0; i < 3; i++) {
        let targetH = 11, targetDy = 0, targetDx = 0, targetAlph = 1;

        switch (s) {
          case 'idle':
            targetDx = 5   * Math.sin(1.8 * t + 0.18 * i);
            targetDy = 1.5 * Math.sin(0.9 * t + 0.40 * i);
            break;
          case 'connecting':
          case 'initializing':
            break; // no dot movement
          case 'disconnected':
            targetDx = 2 * Math.sin(11 * t + 11.3 * i) * (Math.random() > 0.94 ? 4 : 1);
            targetAlph = 0.45 + 0.55 * Math.abs(Math.sin(2.8 * t + 2.1 * i));
            break;
          case 'listening': {
            const sv = Math.sin(2.6 * t);
            if (i === 0)      { targetDx = -9 * Math.max(0,  sv); targetDy = -(targetDx * targetDx) / 40; }
            else if (i === 2) { targetDx =  9 * Math.max(0, -sv); targetDy = -(targetDx * targetDx) / 40; }
            else              { targetDy = -(1.2 * Math.exp(-Math.pow(8 * sv, 2))); targetDx = 0; }
            break;
          }
          case 'thinking':
            targetDy = -(8 * Math.max(0, Math.sin(7.5 * t - 2.1 * i)));
            break;
          case 'speaking':
            targetH = 11 + 10 * Math.abs(Math.sin(7 * t + 2.1 * i)); // simple pulse without mic
            break;
        }

        if (s === 'disconnected') {
          dotDx.current[i] = targetDx;
          dotAlph.current[i] += (targetAlph - dotAlph.current[i]) * 0.15;
        } else if (s === 'listening') {
          dotDx.current[i] += (targetDx - dotDx.current[i]) * 0.32;
          dotAlph.current[i] = 1;
        } else {
          dotDx.current[i] += (targetDx - dotDx.current[i]) * 0.3;
          dotAlph.current[i] += (1 - dotAlph.current[i]) * 0.1;
        }

        const lerpH = s === 'speaking' ? 0.22 : 0.15;
        dotH.current[i]  += (targetH  - dotH.current[i])  * lerpH;
        dotDy.current[i] += (targetDy - dotDy.current[i]) * (s === 'listening' ? 0.32 : 0.3);
      }

      setDots([0, 1, 2].map(i => ({
        h:       dotH.current[i],
        dy:      dotDy.current[i],
        dx:      dotDx.current[i],
        opacity: dotAlph.current[i],
      })));
      setLiquid({ level: fillRef.current, amp: ampRef.current, t });
      setLiquidOpacity(liqAlph.current);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // runs once; stateRef keeps current state

  const wave1 = wavePath(liquid.t, liquid.amp, liquid.level);
  const wave2 = wavePath(0.69 * liquid.t - 1.5, 1.4 * liquid.amp, liquid.level + 0.04);
  const XFORM = 'translate(144.48,-148.655) scale(1.88)';

  return (
    <svg viewBox="225 75 230 248" width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <clipPath id={clipId}>
          <path clipRule="evenodd" transform={XFORM} d={CLIP_PATH} />
        </clipPath>
      </defs>

      {/* ── Static logo + animated dots ── */}
      <g opacity={1 - liquidOpacity}>
        <path fill={BRAND} transform={XFORM} d={SOLID_PATH} />
        {DOT_X.map((cx, i) => {
          const { h, dy, dx, opacity } = dots[i];
          const w = Math.max(11, h);
          const r = Math.min(5.5, w / 2);
          return (
            <rect
              key={i}
              fill={BRAND}
              opacity={opacity}
              x={cx - 5.5 + dx}
              y={227.2 - w / 2 + dy}
              width={11}
              height={w}
              rx={r}
              ry={r}
            />
          );
        })}
      </g>

      {/* ── Liquid logo ── */}
      <g opacity={liquidOpacity}>
        <path
          fill={BRAND} fillOpacity={0.06}
          stroke={BRAND} strokeWidth={1.4} strokeOpacity={0.22}
          fillRule="evenodd" transform={XFORM} d={CLIP_PATH}
        />
        <g clipPath={`url(#${clipId})`}>
          <path d={wave2} fill={BRAND} opacity={0.24} />
          <path d={wave1} fill={BRAND} opacity={0.86} />
        </g>
      </g>
    </svg>
  );
}
