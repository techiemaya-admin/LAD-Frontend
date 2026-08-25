"use client";

import React, { useEffect, useState } from "react";
import { Icon, LadAvatar } from "./icons";
import { MODELS, TOOLS, type ModelId, type ToolId } from "../data";

export interface ThreadProps {
  query: string;
  primary: ToolId | null;
  model: ModelId;
  tools: ToolId[];
  onBack: () => void;
}

const REPLIES: Record<string, string> = {
  find: "On it. I'm scanning multiple data sources for accounts that match - enriching firmographics, finding decision-makers, and verifying emails. I'll surface a ranked list you can push straight into a campaign.",
  meet: "Got it. I'll identify warm contacts, draft personalized openers, and propose send times based on each contact's timezone and past engagement.",
  research:
    "Researching now across the web and professional networks - mapping the buying committee, recent signals, and the best entry points. I'll cite every source.",
  relationships:
    "Let me review account health and engagement. I'll flag who's gone quiet, surface a reason to reach out, and draft a tailored check-in for each.",
  media:
    "Drafting now. I'll generate three on-brand variations with subject lines and a suggested follow-up, ready for you to edit.",
  null: "Let me pull that together from your live pipeline and account activity…",
};

/**
 * A believable send → reply thread view. After the user submits, LAD shows a
 * typing indicator, then a contextual reply tagged with the model + tools used.
 */
export function Thread({ query, primary, model, tools, onBack }: ThreadProps) {
  const [typing, setTyping] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTyping(false), 1600);
    return () => clearTimeout(t);
  }, []);

  const reply = REPLIES[primary ?? "null"];
  const M = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const MI = M.icon;

  return (
    <div className="lh-fade-in" style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: "8px 0 40px" }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--lh-muted)",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 26,
        }}
      >
        <span style={{ transform: "rotate(180deg)", display: "flex" }}>
          <Icon.arrowRight s={16} />
        </span>
        Back to home
      </button>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginBottom: 22 }}>
        <div
          style={{
            maxWidth: "78%",
            padding: "12px 18px",
            borderRadius: "20px 20px 4px 20px",
            background: "var(--lh-brand)",
            color: "#fff",
            fontSize: 14.5,
            fontWeight: 450,
            lineHeight: 1.65,
            boxShadow: "0 2px 14px rgba(11,25,87,.2)",
          }}
        >
          {query}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--lh-muted)",
              whiteSpace: "nowrap",
              background: "#f5f7fb",
              border: "1px solid var(--lh-line)",
              borderRadius: 99,
              padding: "3px 9px",
            }}
          >
            <MI s={12} style={{ color: "var(--lh-brand)" }} />
            {M.name}
          </span>
          {tools.map((id) => {
            const T = TOOLS[id];
            const TI = T.icon;
            return (
              <span
                key={id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11.5,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  color: T.tint,
                  background: T.tint + "12",
                  borderRadius: 99,
                  padding: "3px 9px",
                }}
              >
                <TI s={12} />
                {T.label}
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <LadAvatar s={36} />
        <div style={{ flex: 1, maxWidth: "90%" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--lh-brand)",
              letterSpacing: ".06em",
              textTransform: "uppercase",
              marginBottom: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            LAD
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: "#10b981",
                boxShadow: "0 0 0 2px rgba(16,185,129,.2)",
              }}
            />
          </div>
          <div
            style={{
              padding: "14px 19px",
              borderRadius: "4px 18px 18px 18px",
              background: "#fff",
              border: "1px solid var(--lh-line)",
              boxShadow: "var(--lh-shadow-sm)",
              fontSize: 14.5,
              lineHeight: 1.6,
              color: "#374151",
              minHeight: 24,
            }}
          >
            {typing ? (
              <span style={{ display: "inline-flex", gap: 5, padding: "3px 0" }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 99,
                      background: "#c2d6eb",
                      animation: `lh-typing .6s ${i * 0.15}s infinite alternate`,
                    }}
                  />
                ))}
              </span>
            ) : (
              <span className="lh-fade-in">{reply}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
