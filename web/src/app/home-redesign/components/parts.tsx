"use client";

import React, { useEffect, useRef, useState } from "react";
import { Icon, type IconComponent } from "./icons";
import type { RailEntry, RecentItem } from "../data";

/* ---------------- style atoms ---------------- */
export const cIconBtn: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  color: "#374151",
  background: "#fff",
  border: "1.5px solid var(--lh-line)",
  transition: "all .15s",
  flexShrink: 0,
  cursor: "pointer",
};

const cMenuLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--lh-muted-2)",
  padding: "8px 10px 5px",
};

/* ---------------- RailItem ---------------- */
export function RailItem({ item }: { item: RailEntry }) {
  const [h, setH] = useState(false);
  const I = item.icon;
  return (
    <button
      type="button"
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      aria-current={item.active ? "page" : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        width: 64,
        padding: "10px 0",
        borderRadius: 14,
        color: item.active ? "var(--lh-brand)" : h ? "var(--lh-ink)" : "var(--lh-muted)",
        background: item.active ? "var(--lh-brand-soft)" : h ? "#f0f1f8" : "transparent",
        transition: "all .15s",
      }}
    >
      <I s={21} w={item.active ? 1.9 : 1.7} />
      <span style={{ fontSize: 11, fontWeight: item.active ? 700 : 600, letterSpacing: 0.1 }}>
        {item.label}
      </span>
    </button>
  );
}

/* ---------------- Dropdown ---------------- */
export function Dropdown({
  trigger,
  children,
  align = "left",
  width = 300,
  open,
  setOpen,
  label,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  width?: number;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", onKey);
    };
  }, [setOpen]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {trigger}
      {open && (
        <div
          role="menu"
          aria-label={label}
          style={{
            position: "absolute",
            bottom: "calc(100% + 10px)",
            [align]: 0,
            width,
            zIndex: 50,
            background: "#fff",
            border: "1px solid var(--lh-line)",
            borderRadius: 16,
            boxShadow: "var(--lh-shadow-lg)",
            padding: 6,
            animation: "lh-popin .16s ease both",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------------- MenuItem ---------------- */
export function MenuItem({
  icon: I,
  tint = "#0b1957",
  label,
  sub,
  active,
  onClick,
}: {
  icon: IconComponent;
  tint?: string;
  label: string;
  sub?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={!!active}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex",
        gap: 11,
        alignItems: "center",
        width: "100%",
        padding: "9px 10px",
        borderRadius: 11,
        textAlign: "left",
        background: h ? "#f5f7fb" : "transparent",
        transition: "all .12s",
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          display: "grid",
          placeItems: "center",
          background: tint + "15",
          color: tint,
          flexShrink: 0,
        }}
      >
        <I s={17} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--lh-ink-strong)" }}>
          {label}
        </span>
        {sub && (
          <span
            style={{ display: "block", fontSize: 11.5, color: "var(--lh-muted)", marginTop: 1, lineHeight: 1.3 }}
          >
            {sub}
          </span>
        )}
      </span>
      {active && <Icon.check s={16} style={{ color: "var(--lh-brand)", flexShrink: 0 }} />}
    </button>
  );
}

/* ---------------- Chip ---------------- */
export function Chip({
  icon: I,
  t,
  onClick,
}: {
  icon: IconComponent;
  t: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lh-grad-border"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        borderRadius: 24,
        whiteSpace: "nowrap",
        background: "#fff",
        color: "#374151",
        fontSize: 13.5,
        fontWeight: 600,
        transition: "all .15s",
      }}
    >
      <span style={{ color: "var(--lh-brand)", display: "flex" }}>
        <I s={15} />
      </span>
      {t}
    </button>
  );
}

/* ---------------- RecentCard ---------------- */
export function RecentCard({ r, onClick }: { r: RecentItem; onClick?: () => void }) {
  const [h, setH] = useState(false);
  const I = r.icon;
  const cta = r.kind === "draft" ? "Resume" : r.kind === "ICP" ? "Open" : "Reopen";
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        textAlign: "left",
        padding: 16,
        borderRadius: 16,
        border: "1px solid",
        borderColor: h ? "#c2d6eb" : "var(--lh-line)",
        background: h ? "#f8faff" : "var(--lh-card)",
        boxShadow: h ? "var(--lh-shadow-md)" : "var(--lh-shadow-sm)",
        transform: h ? "translateY(-2px)" : "none",
        transition: "all .18s",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            display: "grid",
            placeItems: "center",
            background: r.accent + "15",
            color: r.accent,
          }}
        >
          <I s={16} />
        </span>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            color: r.accent,
          }}
        >
          {r.badge}
        </span>
        {r.kind === "ICP" && (
          <span
            style={{
              marginLeft: "auto",
              width: 7,
              height: 7,
              borderRadius: 99,
              background: "var(--lh-green)",
              boxShadow: "0 0 0 3px #10b98122",
            }}
          />
        )}
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: -0.2 }}>{r.title}</div>
      <div style={{ display: "flex", gap: 18, marginTop: 1 }}>
        {r.meta.map(([n, l], i) => (
          <div key={i}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: -0.3,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {n}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--lh-muted-2)", fontWeight: 600 }}>{l}</div>
          </div>
        ))}
        <span
          style={{
            marginLeft: "auto",
            alignSelf: "flex-end",
            color: h ? r.accent : "#c2c8e0",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 3,
            transition: "all .18s",
          }}
        >
          {cta}
          <Icon.chevron s={14} />
        </span>
      </div>
    </button>
  );
}

export { cMenuLabel };
