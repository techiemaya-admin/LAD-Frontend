"use client";

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { Dropdown, MenuItem, cIconBtn, cMenuLabel } from "./parts";
import { MODELS, TOOLS, TOOL_ORDER, type ModelId, type ToolId } from "../data";

export interface ComposerProps {
  value: string;
  setValue: (v: string) => void;
  activeTools: ToolId[];
  toggleTool: (id: ToolId) => void;
  model: ModelId;
  setModel: (id: ModelId) => void;
  onSend: () => void;
  /** Bump to programmatically focus the textarea. */
  focusKey: number;
  listening: boolean;
  setListening: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Smart composer - the product's conversational entry point.
 * In-input combinable Tools, a model picker, voice input, and send.
 */
export function Composer({
  value,
  setValue,
  activeTools,
  toggleTool,
  model,
  setModel,
  onSend,
  focusKey,
  listening,
  setListening,
}: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focus, setFocus] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  // auto-grow the textarea
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 180) + "px";
    }
  }, [value]);

  useEffect(() => {
    if (focusKey > 0 && ref.current) ref.current.focus();
  }, [focusKey]);

  const primary = activeTools[activeTools.length - 1];
  const ph = listening
    ? "Listening…"
    : primary
      ? TOOLS[primary].ph
      : "Ask anything, or describe a task for LAD to run…";
  const can = value.trim().length > 0;
  const M = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const MI = M.icon;

  return (
    <div
      className={"lh-grad-border" + (focus ? " lh-gb-fast lh-gb-on" : "")}
      style={{ borderRadius: 26, background: "#fff", boxShadow: "var(--lh-shadow-md)", transition: "all .2s" }}
    >
      {activeTools.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "14px 18px 0" }}>
          {activeTools.map((id) => {
            const T = TOOLS[id];
            const TI = T.icon;
            return (
              <span
                key={id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 7px 5px 11px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  background: T.tint + "14",
                  color: T.tint,
                }}
              >
                <TI s={14} />
                {T.label}
                <button
                  type="button"
                  onClick={() => toggleTool(id)}
                  title={`Remove ${T.label}`}
                  aria-label={`Remove ${T.label}`}
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 17,
                    height: 17,
                    borderRadius: 99,
                    color: T.tint,
                    background: T.tint + "1a",
                    cursor: "pointer",
                  }}
                >
                  <Icon.x s={11} w={2.4} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (can) onSend();
          }
        }}
        placeholder={ph}
        aria-label="Ask LAD anything, or describe a task to run"
        className="lh-scroll"
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          resize: "none",
          background: "transparent",
          font: "inherit",
          fontSize: 17,
          lineHeight: 1.5,
          color: "var(--lh-ink-strong)",
          padding: "18px 20px 8px",
          maxHeight: 180,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px 12px" }}>
        <button type="button" title="Attach files" aria-label="Attach files" style={cIconBtn}>
          <Icon.plus s={18} />
        </button>

        <Dropdown
          open={toolsOpen}
          setOpen={setToolsOpen}
          width={300}
          label="Tools"
          trigger={
            <button
              type="button"
              onClick={() => setToolsOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={toolsOpen}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 13.5,
                fontWeight: 600,
                transition: "all .15s",
                cursor: "pointer",
                border: "1.5px solid",
                borderColor: toolsOpen || activeTools.length ? "var(--lh-brand)" : "var(--lh-line)",
                background: toolsOpen || activeTools.length ? "var(--lh-brand-soft)" : "#fff",
                color: toolsOpen || activeTools.length ? "var(--lh-brand)" : "#374151",
              }}
            >
              <Icon.tools s={16} />
              Tools
              {activeTools.length > 0 && (
                <span
                  style={{
                    minWidth: 18,
                    height: 18,
                    padding: "0 5px",
                    borderRadius: 99,
                    background: "var(--lh-brand)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {activeTools.length}
                </span>
              )}
            </button>
          }
        >
          <div style={cMenuLabel}>Tools · combine any</div>
          {TOOL_ORDER.map((id) => {
            const T = TOOLS[id];
            return (
              <MenuItem
                key={id}
                icon={T.icon}
                tint={T.tint}
                label={T.label}
                sub={T.desc}
                active={activeTools.includes(id)}
                onClick={() => toggleTool(id)}
              />
            );
          })}
        </Dropdown>

        <span style={{ marginLeft: "auto" }} />

        <Dropdown
          align="right"
          open={modelOpen}
          setOpen={setModelOpen}
          width={284}
          label="Model"
          trigger={
            <button
              type="button"
              onClick={() => setModelOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={modelOpen}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                background: modelOpen ? "var(--lh-brand-soft)" : "#f5f7fb",
                color: "var(--lh-ink)",
                border: "1px solid transparent",
                transition: "all .15s",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <MI s={15} style={{ color: "var(--lh-brand)" }} />
              {M.name}
              <Icon.chevronDown s={14} style={{ color: "var(--lh-muted-2)" }} />
            </button>
          }
        >
          <div style={cMenuLabel}>Model</div>
          {MODELS.map((m) => (
            <MenuItem
              key={m.id}
              icon={m.icon}
              tint="#0b1957"
              label={m.name}
              sub={m.sub}
              active={model === m.id}
              onClick={() => {
                setModel(m.id);
                setModelOpen(false);
              }}
            />
          ))}
        </Dropdown>

        <button
          type="button"
          onClick={() => setListening((l) => !l)}
          title="Voice input"
          aria-label={listening ? "Stop voice input" : "Start voice input"}
          aria-pressed={listening}
          className={listening ? "lh-ring-pulse" : ""}
          style={{
            ...cIconBtn,
            color: listening ? "#dc2626" : "#374151",
            borderColor: listening ? "#dc2626" : "var(--lh-line)",
            background: listening ? "#fff1f1" : "#fff",
          }}
        >
          {listening ? <Icon.stop s={14} /> : <Icon.mic s={17} />}
        </button>

        <button
          type="button"
          onClick={() => can && onSend()}
          disabled={!can}
          title="Send"
          aria-label="Send"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            transition: "all .2s",
            color: "#fff",
            background: can ? "var(--lh-grad-bright)" : "#e5e7eb",
            boxShadow: can ? "var(--lh-glow)" : "none",
            transform: can ? "scale(1)" : "scale(.96)",
            cursor: can ? "pointer" : "default",
            flexShrink: 0,
          }}
        >
          <Icon.arrowUp s={18} w={2.3} />
        </button>
      </div>
    </div>
  );
}
