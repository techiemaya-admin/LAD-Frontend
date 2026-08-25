import React from "react";
import Image from "next/image";

/**
 * Inline stroke icons for the LAD home redesign.
 * Translated from the Claude Design handoff (icons.jsx) into typed React.
 * Each icon takes an optional size (`s`) and stroke width (`w`).
 */
export interface IconProps {
  /** Square size in px (width === height). Default 20. */
  s?: number;
  /** Stroke width. Default 1.7. */
  w?: number;
  style?: React.CSSProperties;
  className?: string;
  "aria-hidden"?: boolean;
}

export type IconComponent = ((props: IconProps) => React.JSX.Element) & {
  displayName?: string;
};

const makeIcon = (paths: React.ReactNode, vb = 24): IconComponent => {
  const Glyph: IconComponent = ({ s = 20, w = 1.7, style, className, ...rest }) => (
    <svg
      viewBox={`0 0 ${vb} ${vb}`}
      width={s}
      height={s}
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden={rest["aria-hidden"] ?? true}
      focusable="false"
    >
      {paths}
    </svg>
  );
  Glyph.displayName = "Icon";
  return Glyph;
};

export const Icon = {
  search: makeIcon(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </>,
  ),
  target: makeIcon(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r=".6" fill="currentColor" />
    </>,
  ),
  users: makeIcon(
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1M17.5 19a5.5 5.5 0 0 0-2.2-4.4" />
    </>,
  ),
  calendar: makeIcon(
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.2v3.4M16 3.2v3.4" />
      <path d="M7.5 13.5h3v3h-3z" fill="currentColor" stroke="none" />
    </>,
  ),
  heart: makeIcon(
    <path d="M12 20.2C5.5 16.2 3 12.6 3 9.4 3 6.9 4.9 5 7.3 5c1.7 0 3.1.9 3.9 2.3h1.6C14.6 5.9 16 5 17.7 5 20.1 5 22 6.9 22 9.4c0 3.2-2.5 6.8-9 10.8h-1z" />,
  ),
  image: makeIcon(
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4.5 17 4.4-4.3a2 2 0 0 1 2.7-.1L20 19.5" />
    </>,
  ),
  plus: makeIcon(<path d="M12 5v14M5 12h14" />),
  arrowUp: makeIcon(<path d="M12 19V6M6 12l6-6 6 6" />),
  arrowRight: makeIcon(<path d="M5 12h14M13 6l6 6-6 6" />),
  star: makeIcon(
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />,
  ),
  sparkle: makeIcon(
    <path d="M12 3l1.6 5.2L19 9.8l-5.4 1.6L12 17l-1.6-5.6L5 9.8l5.4-1.6L12 3zM18.5 14l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1z" />,
  ),
  bolt: makeIcon(<path d="M13 3 5 13h5l-1 8 8-10h-5l1-8z" />),
  clock: makeIcon(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>,
  ),
  doc: makeIcon(
    <>
      <path d="M6 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V5A1.5 1.5 0 0 1 6 3.5z" />
      <path d="M13 3.5V8.5h5M8 13h8M8 16.5h5" />
    </>,
  ),
  layers: makeIcon(
    <>
      <path d="M12 3.5 21 8l-9 4.5L3 8l9-4.5z" />
      <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
    </>,
  ),
  chevron: makeIcon(<path d="m9 6 6 6-6 6" />),
  chevronDown: makeIcon(<path d="m6 9 6 6 6-6" />),
  home: makeIcon(
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 9.6V20h12V9.6" />
      <path d="M10 20v-5h4v5" />
    </>,
  ),
  compass: makeIcon(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2z" fill="currentColor" stroke="none" />
    </>,
  ),
  inbox: makeIcon(
    <>
      <path d="M4 13.5 6 5.5a2 2 0 0 1 2-1.5h8a2 2 0 0 1 2 1.5l2 8" />
      <path d="M4 13.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4.5h-5l-1.4 2.2H10.4L9 13.5H4z" />
    </>,
  ),
  grid: makeIcon(
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.6" />
      <rect x="13" y="4" width="7" height="7" rx="1.6" />
      <rect x="4" y="13" width="7" height="7" rx="1.6" />
      <rect x="13" y="13" width="7" height="7" rx="1.6" />
    </>,
  ),
  settings: makeIcon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" />
    </>,
  ),
  check: makeIcon(<path d="m5 12.5 4.5 4.5L19 6.5" />),
  filter: makeIcon(<path d="M4 5.5h16l-6.2 7.4V20l-3.6-2v-5.1L4 5.5z" />),
  globe: makeIcon(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.3 3.7 5.4 3.7 8.5S14.4 18.2 12 20.5C9.6 18.2 8.3 15.1 8.3 12S9.6 5.8 12 3.5z" />
    </>,
  ),
  mail: makeIcon(
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="m4.5 7 7.5 5.5L19.5 7" />
    </>,
  ),
  trend: makeIcon(<path d="M4 16.5 9.5 11l3.5 3.5L20 7M20 7h-4.5M20 7v4.5" />),
  building: makeIcon(
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M9 7.5h2M13 7.5h2M9 11h2M13 11h2M9 14.5h2M13 14.5h2M10 20.5v-3h4v3" />
    </>,
  ),
  mic: makeIcon(
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </>,
  ),
  x: makeIcon(<path d="M6 6l12 12M18 6 6 18" />),
  tools: makeIcon(
    <path d="M14.5 5.5a3.5 3.5 0 0 1-4.6 4.6L5 15v4h4l4.9-4.9a3.5 3.5 0 0 1 4.6-4.6l-2.7 2.7-2-2 2.7-2.7z" />,
  ),
  agent: makeIcon(
    <>
      <circle cx="12" cy="12" r="3.2" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2" />
    </>,
  ),
  tune: makeIcon(
    <>
      <path d="M5 8h9M18 8h1M5 16h1M10 16h9" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="8" cy="16" r="2" />
    </>,
  ),
  wand: makeIcon(
    <path d="M5 19 16 8M14 6l2-2 4 4-2 2M19 11l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM6 3l.7 1.6L8 5.3l-1.3.7L6 7.6 5.3 6 4 5.3l1.3-.7L6 3z" />,
  ),
  stop: makeIcon(<rect x="7" y="7" width="10" height="10" rx="2.5" />),
  paperclip: makeIcon(
    <path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-7.7 7.7a1.6 1.6 0 0 1-2.3-2.3l7.2-7.2" />,
  ),
  bookmark: makeIcon(<path d="M6 4.5h12v15l-6-4-6 4z" />),
} satisfies Record<string, IconComponent>;

export type IconName = keyof typeof Icon;

/** Brand mark - the square Mr LAD chat-bubble logo. */
export function LadMark({ s = 40 }: { s?: number }) {
  return (
    <Image
      src="/mrlad-home/lad-mark.svg"
      alt="Mr LAD"
      width={s}
      height={s}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}

/** AI avatar - navy→cyan gradient circle with the white mark, as used in chat. */
export function LadAvatar({ s = 36 }: { s?: number }) {
  const inner = Math.round(s * 0.56);
  return (
    <span
      style={{
        width: s,
        height: s,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        background: "linear-gradient(135deg,#4f46e5 0%,#2563eb 50%,#06b6d4 100%)",
        boxShadow: "0 4px 14px rgba(79,70,229,.4)",
      }}
    >
      <Image
        src="/mrlad-home/lad-mark-white.svg"
        alt=""
        aria-hidden
        width={inner}
        height={inner}
        style={{ display: "block", objectFit: "contain" }}
      />
    </span>
  );
}
