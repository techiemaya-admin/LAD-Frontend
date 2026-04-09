'use client';
/**
 * MrLadAvatar — Animated LAD ring visualizer avatar for AI chat messages.
 *
 * Extracted from AgentAudioVisualizerLads demo.
 * Renders an SVG wave animation inside the LAD logo clip shape.
 * Runs in "idle" breathing state by default (no audio input needed).
 */
import { useEffect, useRef, useCallback } from 'react';

interface MrLadAvatarProps {
  size?: number;
  className?: string;
}

// ── Wave path generator (matches the demo's y() function) ─────────────────────
function buildWavePath(t: number, amp: number, level: number): string {
  const baseY = 300 - 210 * level;
  let d = `M 238 300 L 238 ${baseY + Math.sin(t) * amp * 0.6}`;
  for (let i = 1; i <= 96; i++) {
    const a = i / 96;
    const x = 238 + 198 * a;
    const y =
      baseY +
      Math.sin(a * Math.PI * 3.2 + t) * amp +
      Math.sin(a * Math.PI * 6.1 + 1.55 * t) * amp * 0.38 +
      Math.sin(a * Math.PI * 9.3 + 0.73 * t) * amp * 0.16;
    d += ` L ${x} ${y}`;
  }
  return d + ' L 436 300 Z';
}

// LAD logo outline path (used as clip + decorative shape)
const LAD_LOGO_PATH =
  'M 90.605469 187.71875 C 76.769531 183.199219 62.945312 195.695312 66.507812 210.113281 ' +
  'C 71.101562 227.882812 90.164062 236.230469 108.925781 235.582031 L 108.925781 222.753906 ' +
  'C 77.5625 223.003906 66.898438 189.585938 90.605469 187.71875 Z ' +
  'M 98.324219 160.398438 C 83.8125 156.144531 64.421875 147.125 59.191406 131.710938 ' +
  'C 57.5625 136.855469 57.074219 142.109375 57.597656 147.191406 ' +
  'C 57.980469 150.925781 58.617188 154.179688 59.46875 157.023438 ' +
  'C 62.039062 163.703125 66.59375 169.644531 72.824219 173.90625 ' +
  'C 72.195312 170.304688 72.652344 166.597656 74.132812 163.257812 ' +
  'C 82.605469 174.226562 111.257812 177.710938 124.609375 186.664062 ' +
  'C 130.058594 190.320312 133.394531 196.480469 133.394531 203.140625 ' +
  'C 133.394531 215.199219 116.972656 226.980469 109.226562 235.574219 ' +
  'C 126.644531 234.882812 143.734375 226.433594 148.6875 210.5625 ' +
  'C 162.410156 166.558594 94.703125 161.332031 71.832031 129.640625 ' +
  'C 72.855469 145.585938 84.34375 154.5 98.324219 160.398438 Z';

// Bar x-positions (3 animated bars in the logo area)
const BAR_X = [321, 340, 359];

export function MrLadAvatar({ size = 32, className = '' }: MrLadAvatarProps) {
  const clipId = useRef(`lad-clip-${Math.random().toString(36).slice(2, 8)}`);
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);
  const lastRef = useRef(0);

  // Spring state for bars
  const barH = useRef([11, 11, 11]);
  const barDy = useRef([0, 0, 0]);
  const barDx = useRef([0, 0, 0]);

  // Spring state for wave level / amp
  const levelRef = useRef(0);    // idle = 0 (wave at bottom)
  const ampRef = useRef(2);      // idle amp
  const activeRef = useRef(0);   // 0 = inactive overlay

  const animate = useCallback((now: number) => {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    tRef.current += dt;
    const t = tRef.current;

    // Idle state math — gentle breathing for bars
    for (let e = 0; e < 3; e++) {
      const targetDx = 5 * Math.sin(1.8 * t + 0.18 * e);
      const targetDy = 1.5 * Math.sin(0.9 * t + 0.4 * e);
      barDx.current[e] += (targetDx - barDx.current[e]) * 0.3;
      barDy.current[e] += (targetDy - barDy.current[e]) * 0.3;
      barH.current[e] += (11 - barH.current[e]) * 0.15;
    }

    // Wave: idle level ≈ 0.3 gives a nice visible wave near bottom
    levelRef.current += (0.28 - levelRef.current) * 0.04;
    ampRef.current += (2.5 - ampRef.current) * 0.05;
    activeRef.current += (0 - activeRef.current) * 0.07;

    const svg = svgRef.current;
    if (!svg) { rafRef.current = requestAnimationFrame(animate); return; }

    // Update wave paths
    const waveR = svg.querySelector<SVGPathElement>('#lad-wave-r');
    const waveA = svg.querySelector<SVGPathElement>('#lad-wave-a');
    if (waveR) waveR.setAttribute('d', buildWavePath(t, ampRef.current, levelRef.current));
    if (waveA) waveA.setAttribute('d', buildWavePath(0.69 * t - 1.5, 1.4 * ampRef.current, levelRef.current + 0.04));

    // Update bars
    for (let e = 0; e < 3; e++) {
      const bar = svg.querySelector<SVGRectElement>(`#lad-bar-${e}`);
      if (!bar) continue;
      const h = Math.max(11, barH.current[e]);
      const u = Math.min(5.5, h / 2);
      bar.setAttribute('x', String(BAR_X[e] - 5.5 + barDx.current[e]));
      bar.setAttribute('y', String(227.2 - h / 2 + barDy.current[e]));
      bar.setAttribute('height', String(h));
      bar.setAttribute('rx', String(u));
      bar.setAttribute('ry', String(u));
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  const color = '#5b7fe8';
  const clip = clipId.current;
  // Scale+translate to center the logo in the SVG viewBox
  const transform = 'translate(144.48,-148.655) scale(1.88)';

  return (
    <div
      className={`flex-shrink-0 rounded-full overflow-hidden bg-[#0b1958] flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        ref={svgRef}
        viewBox="225 75 230 248"
        width={size}
        height={size}
        style={{ display: 'block' }}
      >
        <defs>
          <clipPath id={clip}>
            <path clipRule="evenodd" transform={transform} d={LAD_LOGO_PATH} />
          </clipPath>
        </defs>

        {/* Filled logo shape (background) */}
        <path
          fill={color}
          fillOpacity={0.08}
          stroke={color}
          strokeWidth={1.4}
          strokeOpacity={0.3}
          fillRule="evenodd"
          transform={transform}
          d={LAD_LOGO_PATH}
        />

        {/* Wave fills clipped to logo shape */}
        <g clipPath={`url(#${clip})`}>
          <path id="lad-wave-a" fill={color} opacity={0.3} d="" />
          <path id="lad-wave-r" fill={color} opacity={0.9} d="" />
        </g>

        {/* Animated bars (idle breathing) */}
        {BAR_X.map((_, e) => (
          <rect
            key={e}
            id={`lad-bar-${e}`}
            fill={color}
            opacity={1}
            x={BAR_X[e] - 5.5}
            y={227.2 - 5.5}
            width={11}
            height={11}
            rx={5.5}
            ry={5.5}
          />
        ))}
      </svg>
    </div>
  );
}
