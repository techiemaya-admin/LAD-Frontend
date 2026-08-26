"use client";

import React, { useState } from "react";
import { Icon, LadMark } from "./components/icons";
import { RailItem, Chip, RecentCard } from "./components/parts";
import { Composer } from "./components/Composer";
import { Thread } from "./components/Thread";
import { RAIL, RECENTS, SUGG, type ModelId, type Suggestion, type ToolId } from "./data";

interface SentState {
  q: string;
  primary: ToolId | null;
  tools: ToolId[];
  model: ModelId;
}

/**
 * LAD home - the conversational "ask anything" entry point.
 * Self-contained full-screen experience: brand rail, workspace chrome,
 * personalized greeting, smart composer with combinable tools + model picker,
 * grouped starting-point chips, and a "pick up where you left off" row.
 */
export default function HomeRedesign() {
  const [value, setValue] = useState("");
  const [activeTools, setActiveTools] = useState<ToolId[]>(["find"]);
  const [model, setModel] = useState<ModelId>("agent");
  const [listening, setListening] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const [view, setView] = useState<"home" | "thread">("home");
  const [sent, setSent] = useState<SentState | null>(null);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const primary: ToolId | null = activeTools[activeTools.length - 1] ?? null;

  const toggleTool = (id: ToolId) =>
    setActiveTools((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const addTool = (id: ToolId) => setActiveTools((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const fill = (s: Suggestion) => {
    setValue(s.t);
    if (s.tool) addTool(s.tool);
    setFocusKey((k) => k + 1);
  };

  const send = () => {
    setSent({ q: value.trim(), primary, tools: [...activeTools], model });
    setView("thread");
    setListening(false);
  };

  const back = () => {
    setView("home");
    setValue("");
  };

  const suggSet = primary && SUGG[primary] ? SUGG[primary] : SUGG.default;

  return (
    <div className="lad-home">
      <div className="lh-aurora" aria-hidden>
        <i />
      </div>

      <div className="lh-root" style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* ---- brand rail ---- */}
        <aside
          aria-label="Primary navigation"
          style={{
            width: 84,
            flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,.5)",
            background: "linear-gradient(180deg,rgba(255,255,255,.72),rgba(244,246,255,.62))",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "16px 0 14px",
            gap: 4,
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <LadMark s={34} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
            {RAIL.map((r, i) => (
              <RailItem key={i} item={r} />
            ))}
          </div>
          <button
            type="button"
            aria-label="Settings"
            style={{
              width: 64,
              padding: "9px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              borderRadius: 14,
              color: "var(--lh-muted)",
            }}
          >
            <Icon.settings s={20} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Settings</span>
          </button>
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: 99,
              marginTop: 8,
              background: "linear-gradient(135deg,#4f46e5,#2563eb,#06b6d4)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(79,70,229,.4)",
            }}
          >
            M
          </div>
        </aside>

        {/* ---- workspace ---- */}
        <main
          className="lh-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            position: "relative",
            background: "linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.74))",
          }}
        >
          {/* sticky header */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              padding: "16px 32px",
              background: "rgba(255,255,255,.6)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14.5, fontWeight: 700 }}>
              <span style={{ color: "var(--lh-muted)" }}>Workspace</span>
              <Icon.chevron s={13} style={{ color: "var(--lh-muted-2)" }} />
              <span>TechieMaya</span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 14px",
                  borderRadius: 20,
                  whiteSpace: "nowrap",
                  background: "linear-gradient(135deg,#eef0ff,#e6f5fb)",
                  border: "1.5px solid #6366f1",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#4f46e5",
                  boxShadow: "0 4px 14px rgba(99,102,241,.18)",
                }}
              >
                <Icon.sparkle s={14} />
                ICP Discovery
                <span style={{ width: 7, height: 7, borderRadius: 99, background: "#10b981" }} />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 14px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                  background: "#fbf3df",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#9a6a12",
                }}
              >
                <Icon.bolt s={15} style={{ color: "var(--lh-gold)" }} />
                2,400 credits
              </div>
            </div>
          </div>

          {view === "thread" && sent ? (
            <div style={{ padding: "32px 32px 0" }}>
              <Thread query={sent.q} primary={sent.primary} model={sent.model} tools={sent.tools} onBack={back} />
            </div>
          ) : (
            <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 32px 56px" }}>
              <div
                className="lh-fade-in"
                style={{ textAlign: "center", paddingTop: "clamp(40px,9vh,104px)", marginBottom: 26 }}
              >
                <div
                  style={{ display: "inline-flex", marginBottom: 18, filter: "drop-shadow(0 12px 28px rgba(79,70,229,.4))" }}
                >
                  <LadMark s={46} />
                </div>
                <h1
                  className="lh-grotesk"
                  style={{
                    fontSize: "clamp(28px,3.3vw,38px)",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                  }}
                >
                  <span className="lh-grad-text">{greet}, Maya</span>
                  <Icon.sparkle
                    s={24}
                    style={{
                      color: "#a855f7",
                      marginLeft: 8,
                      verticalAlign: "middle",
                      filter: "drop-shadow(0 2px 6px rgba(168,85,247,.5))",
                    }}
                  />
                </h1>
                <p style={{ fontSize: 15, color: "var(--lh-muted)", marginTop: 9, fontWeight: 500 }}>
                  Pick your tools, choose a model, and tell LAD what to run.
                </p>
              </div>

              <Composer
                value={value}
                setValue={setValue}
                activeTools={activeTools}
                toggleTool={toggleTool}
                model={model}
                setModel={setModel}
                onSend={send}
                focusKey={focusKey}
                listening={listening}
                setListening={setListening}
              />

              <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                {suggSet.map((s, i) => (
                  <Chip key={(primary || "d") + i} icon={s.icon} t={s.t} onClick={() => fill(s)} />
                ))}
              </div>

              <section style={{ marginTop: 46 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 15 }}>
                  <Icon.clock s={18} style={{ color: "var(--lh-muted)" }} />
                  <h2 style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: -0.2, whiteSpace: "nowrap" }}>
                    Pick up where you left off
                  </h2>
                  <button
                    type="button"
                    style={{
                      marginLeft: "auto",
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: "var(--lh-brand)",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    View all activity
                    <Icon.chevron s={14} />
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                  {RECENTS.map((r, i) => (
                    <RecentCard
                      key={i}
                      r={r}
                      onClick={() => {
                        if (r.kind === "ICP") {
                          addTool("find");
                          setValue("Get leads from my active ICP: VP of Sales · UK SaaS");
                        } else if (r.kind === "search") {
                          addTool("find");
                          setValue(r.title);
                        } else {
                          addTool("media");
                          setValue("Continue: " + r.title);
                        }
                        setFocusKey((k) => k + 1);
                        document.querySelector(".lad-home main")?.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  ))}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
