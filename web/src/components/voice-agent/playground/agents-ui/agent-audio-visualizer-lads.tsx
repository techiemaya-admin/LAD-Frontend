'use client';

import { forwardRef, useId, type ComponentProps, type ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { AgentState, TrackReferenceOrPlaceholder } from '@livekit/components-react';
import type { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';
import {
  useAgentAudioVisualizerLads,
  LADS_DOT_CX,
  LADS_DOT_BY,
  LADS_DOT_W,
  LADS_DOT_H,
  LADS_WAVE_XL,
  LADS_WAVE_XR,
  LADS_WAVE_YT,
  LADS_WAVE_YB,
} from '@/hooks/agents-ui/use-agent-audio-visualizer-lads';

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * Props are intentionally identical to `AgentAudioVisualizerBar` so the two
 * components can be swapped with a single import change.
 */
export interface AgentAudioVisualizerLadsProps {
  /**
   * Current agent state — drives which animation mode is active.
   * @defaultValue 'connecting'
   */
  state?: AgentState;
  /**
   * Agent audio track to visualize.
   * Accepts a LiveKit track object or a `TrackReferenceOrPlaceholder`.
   */
  audioTrack?: LocalAudioTrack | RemoteAudioTrack | TrackReferenceOrPlaceholder;
  /**
   * Component size.
   * @defaultValue 'lg'
   */
  size?: 'icon' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Primary color in hex — applied to the full logo and animated elements.
   * @defaultValue '#0b1958'
   */
  color?: `#${string}`;
  className?: string;
  children?: ReactNode;
}

// ─── Size variants — identical to AgentAudioVisualizerBar ─────────────────────

export const AgentAudioVisualizerLadsVariants = cva(['aspect-square'], {
  variants: {
    size: {
      icon: 'h-[24px]',
      sm:   'h-[56px]',
      md:   'h-[112px]',
      lg:   'h-[224px]',
      xl:   'h-[448px]',
    },
  },
  defaultVariants: { size: 'lg' },
});

// ─── Logo paths ───────────────────────────────────────────────────────────────

/**
 * Logo body with the three dot sub-paths removed.
 * Renders as a fully solid shape — no holes.
 * The animated <rect> elements sit on top and cover where the dots were.
 */
const LOGO_PATH_SOLID =
  'M 90.605469 187.71875 ' +
  'C 76.769531 183.199219 62.945312 195.695312 66.507812 210.113281 ' +
  'C 71.101562 227.882812 90.164062 236.230469 108.925781 235.582031 ' +
  'L 108.925781 222.753906 ' +
  'C 77.5625 223.003906 66.898438 189.585938 90.605469 187.71875 Z ' +
  'M 98.324219 160.398438 ' +
  'C 83.8125 156.144531 64.421875 147.125 59.191406 131.710938 ' +
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

/**
 * Original logo path including the three dot holes (uses evenodd fill rule).
 * Used as the clip path for the liquid fill so the wave is masked to the logo
 * shape, including the holes.
 */
const LOGO_PATH_WITH_DOTS =
  'M 90.605469 187.71875 ' +
  'C 76.769531 183.199219 62.945312 195.695312 66.507812 210.113281 ' +
  'C 71.101562 227.882812 90.164062 236.230469 108.925781 235.582031 ' +
  'L 108.925781 222.753906 ' +
  'C 77.5625 223.003906 66.898438 189.585938 90.605469 187.71875 ' +
  'M 95.804688 197.097656 ' +
  'C 94.132812 197.097656 92.777344 198.457031 92.777344 200.128906 ' +
  'C 92.777344 201.800781 94.132812 203.15625 95.804688 203.15625 ' +
  'C 97.480469 203.15625 98.835938 201.800781 98.835938 200.128906 ' +
  'C 98.835938 198.457031 97.480469 197.097656 95.804688 197.097656 Z ' +
  'M 106.539062 197.097656 ' +
  'C 104.863281 197.097656 103.507812 198.457031 103.507812 200.128906 ' +
  'C 103.507812 201.800781 104.863281 203.15625 106.539062 203.15625 ' +
  'C 108.210938 203.15625 109.566406 201.800781 109.566406 200.128906 ' +
  'C 109.566406 198.457031 108.210938 197.097656 106.539062 197.097656 Z ' +
  'M 117.269531 197.097656 ' +
  'C 115.597656 197.097656 114.242188 198.457031 114.242188 200.128906 ' +
  'C 114.242188 201.800781 115.597656 203.15625 117.269531 203.15625 ' +
  'C 118.945312 203.15625 120.300781 201.800781 120.300781 200.128906 ' +
  'C 120.300781 198.457031 118.945312 197.097656 117.269531 197.097656 Z ' +
  'M 98.324219 160.398438 ' +
  'C 83.8125 156.144531 64.421875 147.125 59.191406 131.710938 ' +
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

// ─── Wave path builder ────────────────────────────────────────────────────────

function buildWavePath(tOff: number, amp: number, level: number): string {
  const wy = LADS_WAVE_YB - (LADS_WAVE_YB - LADS_WAVE_YT) * level;
  let d    = `M ${LADS_WAVE_XL} ${LADS_WAVE_YB} L ${LADS_WAVE_XL} ${wy + Math.sin(tOff) * amp * 0.6}`;

  for (let i = 1; i <= 96; i++) {
    const p = i / 96;
    const x = LADS_WAVE_XL + (LADS_WAVE_XR - LADS_WAVE_XL) * p;
    const y = wy
      + Math.sin(p * Math.PI * 3.2 + tOff)          * amp
      + Math.sin(p * Math.PI * 6.1 + tOff * 1.55)   * amp * 0.38
      + Math.sin(p * Math.PI * 9.3 + tOff * 0.73)   * amp * 0.16;
    d += ` L ${x} ${y}`;
  }

  return d + ` L ${LADS_WAVE_XR} ${LADS_WAVE_YB} Z`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AgentAudioVisualizerLads = forwardRef<
  HTMLDivElement,
  AgentAudioVisualizerLadsProps & ComponentProps<'div'>
>((
  {
    state      = 'connecting',
    audioTrack,
    size       = 'lg',
    color      = '#0b1958',
    className,
    children,
    ...props
  },
  ref,
) => {
  const { bars, liquid, crossfade } = useAgentAudioVisualizerLads(state, audioTrack);

  // Stable clip-path ID — avoids collisions when multiple instances render
  const uid    = useId();
  const clipId = `lads-clip-${uid.replace(/:/g, '')}`;

  const wave1 = buildWavePath(liquid.t,               liquid.amp,       liquid.level);
  const wave2 = buildWavePath(liquid.t * 0.69 - 1.5,  liquid.amp * 1.4, liquid.level + 0.04);

  return (
    <div
      ref={ref}
      className={cn(AgentAudioVisualizerLadsVariants({ size }), className)}
      data-lk-agent-state={state}
      {...props}
    >
      <svg
        viewBox="225 75 230 248"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/*
           * Clip path uses the full logo path (with dot holes, evenodd rule).
           * This masks the liquid wave to the logo shape, letting the dot
           * holes show through as "windows" the liquid rises past.
           */}
          <clipPath id={clipId}>
            <path
              clipRule="evenodd"
              transform="translate(144.48,-148.655) scale(1.88)"
              d={LOGO_PATH_WITH_DOTS}
            />
          </clipPath>
        </defs>

        {/* ── Layer 1: Dot / bar mode ── */}
        <g opacity={1 - crossfade}>
          {/* Solid logo body (no holes — dots animated separately on top) */}
          <path
            fill={color}
            transform="translate(144.48,-148.655) scale(1.88)"
            d={LOGO_PATH_SOLID}
          />
          {/* Animated dots / bars */}
          {LADS_DOT_CX.map((cx, i) => {
            const { h, dy, dx, opacity } = bars[i];
            const clampedH = Math.max(LADS_DOT_W, h);
            const r        = Math.min(LADS_DOT_W / 2, clampedH / 2);
            return (
              <rect
                key={i}
                fill={color}
                opacity={opacity}
                x={cx - LADS_DOT_W / 2 + dx}
                y={LADS_DOT_BY - clampedH / 2 + dy}
                width={LADS_DOT_W}
                height={clampedH}
                rx={r}
                ry={r}
              />
            );
          })}
        </g>

        {/* ── Layer 2: Liquid fill mode ── */}
        <g opacity={crossfade}>
          {/* Ghost outline so the brand shape reads while liquid is draining/filling */}
          <path
            fillRule="evenodd"
            fill={color}
            fillOpacity={0.06}
            stroke={color}
            strokeWidth={1.4}
            strokeOpacity={0.22}
            transform="translate(144.48,-148.655) scale(1.88)"
            d={LOGO_PATH_WITH_DOTS}
          />
          {/* Liquid waves masked to logo outline */}
          <g clipPath={`url(#${clipId})`}>
            <path d={wave2} fill={color} opacity={0.24} />
            <path d={wave1} fill={color} opacity={0.86} />
          </g>
        </g>
      </svg>

      {children}
    </div>
  );
});

AgentAudioVisualizerLads.displayName = 'AgentAudioVisualizerLads';
