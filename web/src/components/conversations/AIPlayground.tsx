"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Bot,
  User,
  Loader2,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Linkedin,
  Instagram,
  Mail,
  Cpu,
  Hash,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithTenant } from "@/lib/fetch-with-tenant";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlaygroundPrompt {
  id: string;
  name: string;
  prompt_text: string;
  channel: string;
  is_active: boolean;
  version: number;
}

interface PlaygroundSettings {
  ai_model: string;
  knowledge_base: string | null;
  tone: string;
  language: string;
}

interface WebScrapingStatus {
  enabled: boolean;
  chars: number;
  urls: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIPlaygroundProps {
  onClose: () => void;
}

// ── Channel config ─────────────────────────────────────────────────────────────

const CHANNELS = [
  { value: "all",       label: "All",       Icon: Hash,          color: "text-muted-foreground",  bg: "" },
  { value: "whatsapp",  label: "WhatsApp",  Icon: MessageCircle, color: "text-emerald-600",        bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  { value: "linkedin",  label: "LinkedIn",  Icon: Linkedin,      color: "text-blue-600",           bg: "bg-blue-50 dark:bg-blue-950/40" },
  { value: "instagram", label: "Instagram", Icon: Instagram,     color: "text-pink-600",           bg: "bg-pink-50 dark:bg-pink-950/40" },
  { value: "email",     label: "Email",     Icon: Mail,          color: "text-violet-600",         bg: "bg-violet-50 dark:bg-violet-950/40" },
  { value: "generic",   label: "Generic",   Icon: Cpu,           color: "text-orange-500",         bg: "bg-orange-50 dark:bg-orange-950/40" },
] as const;

type ChannelValue = typeof CHANNELS[number]["value"];

function getChannelConfig(channel: string) {
  return CHANNELS.find((c) => c.value === channel) ?? CHANNELS[0];
}

// ── Structured response parser ────────────────────────────────────────────────
//
// TPF system prompts instruct the model to return JSON like:
//   { "agent_reply": "Hello!", "info_gathering_fields": { ... } }
// Sometimes wrapped in a ```json ... ``` markdown fence.
// We extract agent_reply as the display text and surface the rest as debug info.

interface ParsedAIResponse {
  text: string;
  metadata: Record<string, unknown> | null;
}

function parseAIResponse(raw: string): ParsedAIResponse {
  if (!raw) return { text: raw, metadata: null };

  // ── 1. Extract JSON by locating the outermost { } ────────────────────────
  // More robust than regex-stripping code fences — works regardless of
  // surrounding text, markdown fences, leading/trailing whitespace, etc.
  const firstBrace = raw.indexOf("{");
  const lastBrace  = raw.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = raw.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const obj = parsed as Record<string, unknown>;
        if ("agent_reply" in obj) {
          const { agent_reply, ...rest } = obj;
          const meta = Object.keys(rest).length > 0 ? rest : null;
          if (agent_reply != null && agent_reply !== "") {
            return { text: String(agent_reply), metadata: meta };
          }
          // agent_reply is null / empty — surface full JSON as debug info
          return { text: "(No reply — see debug info)", metadata: obj };
        }
        // Valid JSON but no agent_reply key
        return { text: "[Structured response — expand debug info]", metadata: obj };
      }
    } catch {
      // Truncated / malformed JSON — fall through to regex
    }
  }

  // ── 2. Regex fallback for truncated JSON with a string agent_reply ────────
  const strMatch = raw.match(/"agent_reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (strMatch) {
    try {
      return { text: JSON.parse(`"${strMatch[1]}"`), metadata: null };
    } catch {
      return {
        text: strMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\"),
        metadata: null,
      };
    }
  }

  // ── 3. Truncated JSON where agent_reply is null ───────────────────────────
  if (/"agent_reply"\s*:\s*null/.test(raw)) {
    return { text: "(No reply — see debug info)", metadata: null };
  }

  // ── 4. Plain text — render as-is ─────────────────────────────────────────
  return { text: raw, metadata: null };
}

// ── AssistantBubble — AI reply with optional collapsible metadata ─────────────

function AssistantBubble({ content }: { content: string }) {
  const { text, metadata } = parseAIResponse(content);
  const isNoReply = text.startsWith("(No reply") || text.startsWith("[Structured response");
  const [showMeta, setShowMeta] = useState(isNoReply);

  return (
    <div className="max-w-[80%] space-y-1">
      <div className="bg-muted text-foreground rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
      {metadata && (
        <div>
          <button
            onClick={() => setShowMeta((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5"
          >
            {showMeta ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showMeta ? "Hide" : "Show"} debug info
          </button>
          {showMeta && (
            <pre className="mt-1 bg-muted/40 border border-border rounded-md px-2.5 py-2 text-[10px] text-muted-foreground overflow-x-auto leading-relaxed">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ── API helpers ───────────────────────────────────────────────────────────────

const PLAYGROUND_API = "/api/whatsapp-conversations/playground";
const PROMPTS_API    = "/api/whatsapp-conversations/prompts";

// ── Component ─────────────────────────────────────────────────────────────────

export function AIPlayground({ onClose }: AIPlaygroundProps) {
  // Config state
  const [settings, setSettings]               = useState<PlaygroundSettings | null>(null);
  const [prompts, setPrompts]                 = useState<PlaygroundPrompt[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelValue>("all");
  const [selectedPromptName, setSelectedPromptName] = useState<string>("");
  const [systemPrompt, setSystemPrompt]       = useState<string>("");
  const [selectedPromptId, setSelectedPromptId]   = useState<string>("");
  const [knowledgeBase, setKnowledgeBase]     = useState<string>("");
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);
  const [webScraping, setWebScraping] = useState<WebScrapingStatus | null>(null);
  const [showWebScraping, setShowWebScraping] = useState(false);

  // Chat state
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Save state
  const [isSaving, setIsSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const dropdownRef    = useRef<HTMLDivElement>(null);

  // ── Derived: prompts filtered by selected channel ─────────────────────────────

  const filteredPrompts = useMemo(
    () =>
      selectedChannel === "all"
        ? prompts
        : prompts.filter((p) => p.channel === selectedChannel),
    [prompts, selectedChannel]
  );

  // ── Load config on mount ─────────────────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res  = await fetchWithTenant(`${PLAYGROUND_API}/config`);
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setPrompts(data.prompts || []);
        setKnowledgeBase(data.settings?.knowledge_base || "");
        setWebScraping(
          data.web_scraping
            ? {
                enabled: !!data.web_scraping.enabled,
                chars: Number(data.web_scraping.chars) || 0,
                urls: Array.isArray(data.web_scraping.urls) ? data.web_scraping.urls : [],
              }
            : { enabled: false, chars: 0, urls: [] }
        );

        // Auto-select first active whatsapp prompt
        const activePrompt = (data.prompts || []).find(
          (p: PlaygroundPrompt) => p.is_active && p.channel === "whatsapp"
        );
        if (activePrompt) {
          setSelectedPromptName(activePrompt.name);
          setSelectedPromptId(activePrompt.id);
          setSystemPrompt(activePrompt.prompt_text);
        }
      }
    } catch (err) {
      console.error("[AIPlayground] Failed to load config:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // ── Auto-scroll on new messages ───────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Close dropdown when clicking outside ─────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPromptDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Channel selection ─────────────────────────────────────────────────────────

  const handleSelectChannel = useCallback((ch: ChannelValue) => {
    setSelectedChannel(ch);
    setShowPromptDropdown(false);
    // If the currently selected prompt's channel doesn't match the new filter,
    // clear the selection so the user picks a matching one
    if (ch !== "all") {
      setPrompts((prev) => {
        const current = prev.find((p) => p.name === selectedPromptName);
        if (current && current.channel !== ch) {
          setSelectedPromptName("");
          setSelectedPromptId("");
          setSystemPrompt("");
          setSaveStatus("idle");
        }
        return prev;
      });
    }
  }, [selectedPromptName]);

  // ── Prompt selection ─────────────────────────────────────────────────────────

  const handleSelectPrompt = useCallback((prompt: PlaygroundPrompt) => {
    setSelectedPromptName(prompt.name);
    setSelectedPromptId(prompt.id);
    setSystemPrompt(prompt.prompt_text);
    setShowPromptDropdown(false);
    setSaveStatus("idle");
  }, []);

  const handleClearPrompt = useCallback(() => {
    setSelectedPromptName("");
    setSelectedPromptId("");
    setSystemPrompt("");
    setSaveStatus("idle");
  }, []);

  // ── Save prompt ──────────────────────────────────────────────────────────────

  const handleSavePrompt = useCallback(async () => {
    if (!selectedPromptName || !systemPrompt.trim()) return;
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const res  = await fetchWithTenant(
        `${PROMPTS_API}/${encodeURIComponent(selectedPromptName)}`,
        { method: "PUT", body: JSON.stringify({ prompt_text: systemPrompt }) }
      );
      const data = await res.json();
      if (data.success) {
        setSaveStatus("success");
        setPrompts((prev) =>
          prev.map((p) =>
            p.name === selectedPromptName
              ? { ...p, prompt_text: systemPrompt, version: data.data?.version || p.version }
              : p
          )
        );
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }, [selectedPromptName, systemPrompt]);

  // ── Send message ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isSending) return;

    setSendError(null);
    const userMessage: ChatMessage = { role: "user", content: text, timestamp: new Date() };
    const history = [...messages, userMessage];

    setMessages(history);
    setInputValue("");
    setIsSending(true);

    try {
      const res  = await fetchWithTenant(`${PLAYGROUND_API}/chat`, {
        method: "POST",
        body: JSON.stringify({
          message:              text,
          system_prompt:        systemPrompt || undefined,
          prompt_id:            selectedPromptId || undefined,
          conversation_history: messages.map((m) => ({ role: m.role, content: m.content })),
          knowledge_base:       knowledgeBase || undefined,
          ai_model:             settings?.ai_model,
        }),
      });
      const data = await res.json();

      if (data.success && data.response) {
        setMessages([
          ...history,
          { role: "assistant", content: data.response, timestamp: new Date() },
        ]);
      } else {
        setSendError(data.detail || data.error || "AI did not return a response.");
        setMessages(messages);
      }
    } catch {
      setSendError("Network error — could not reach the AI service.");
      setMessages(messages);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [inputValue, isSending, messages, systemPrompt, selectedPromptId, knowledgeBase, settings]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    },
    [handleSend]
  );

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setSendError(null);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  // Channel badge shown next to each prompt in the dropdown
  function ChannelBadge({ channel }: { channel: string }) {
    const cfg = getChannelConfig(channel);
    const { Icon } = cfg;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} shrink-0`}>
        <Icon className="h-2.5 w-2.5" />
        {cfg.label}
      </span>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const activeChannelCfg = getChannelConfig(selectedChannel);

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed right-0 top-0 h-full w-full sm:w-[480px] z-50 flex flex-col bg-background border-l border-border shadow-2xl"
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">AI Playground</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {settings?.ai_model || "claude-sonnet-4-6"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadConfig} title="Reload config">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ── Config Panel ──────────────────────────────────────────── */}
          <div className="shrink-0 border-b border-border bg-muted/30 px-4 py-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                System Prompt
              </label>

              {/* ── Channel selector pills ──────────────────────────── */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CHANNELS.map(({ value, label, Icon, color, bg }) => {
                  const isSelected = selectedChannel === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleSelectChannel(value as ChannelValue)}
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all ${
                        isSelected
                          ? `${bg} ${color} border-current shadow-sm`
                          : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      <Icon className={`h-3 w-3 ${isSelected ? color : ""}`} />
                      {label}
                      {value !== "all" && (
                        <span className={`text-[10px] ml-0.5 ${isSelected ? "opacity-70" : "opacity-50"}`}>
                          {prompts.filter((p) => p.channel === value).length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Prompt dropdown (filtered by channel) ──────────── */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowPromptDropdown((v) => !v)}
                  className="w-full flex items-center justify-between text-xs bg-background border border-border rounded-md px-3 py-2 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {selectedPromptName ? (
                      <>
                        {/* Show channel badge of the selected prompt */}
                        {(() => {
                          const p = prompts.find((pr) => pr.name === selectedPromptName);
                          const cfg = getChannelConfig(p?.channel || "");
                          const { Icon: SelIcon } = cfg;
                          return <SelIcon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />;
                        })()}
                        <span className="text-foreground truncate">{selectedPromptName}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        {filteredPrompts.length === 0
                          ? `No ${selectedChannel === "all" ? "" : selectedChannel + " "}prompts yet`
                          : `Select a ${selectedChannel === "all" ? "" : selectedChannel + " "}prompt…`}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-2 shrink-0" />
                </button>

                <AnimatePresence>
                  {showPromptDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.1 }}
                      className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden max-h-52 overflow-y-auto"
                    >
                      {filteredPrompts.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                          No prompts for this channel yet.
                        </div>
                      ) : (
                        filteredPrompts.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleSelectPrompt(p)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2 ${
                              p.name === selectedPromptName ? "bg-accent" : ""
                            }`}
                          >
                            {/* Channel icon */}
                            {(() => {
                              const cfg = getChannelConfig(p.channel);
                              const { Icon: PIcon } = cfg;
                              return <PIcon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />;
                            })()}

                            <span className="flex-1 truncate">{p.name}</span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Show channel badge when viewing "all" */}
                              {selectedChannel === "all" && <ChannelBadge channel={p.channel} />}
                              <span className="text-muted-foreground text-[10px]">v{p.version}</span>
                              {p.is_active && (
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" title="Active" />
                              )}
                            </div>
                          </button>
                        ))
                      )}
                      <button
                        onClick={handleClearPrompt}
                        className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent border-t border-border"
                      >
                        Clear selection
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── System prompt textarea ──────────────────────────── */}
              <textarea
                value={systemPrompt}
                onChange={(e) => { setSystemPrompt(e.target.value); setSaveStatus("idle"); }}
                placeholder={`Enter a ${selectedChannel === "all" ? "" : selectedChannel + " "}system prompt, or select one above…`}
                rows={4}
                className="mt-2 w-full text-xs bg-background border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground font-mono"
              />

              {/* ── Save + Chat Settings row ────────────────────────── */}
              <div className="flex items-center gap-2 mt-2">
                {selectedPromptName && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    onClick={handleSavePrompt}
                    disabled={isSaving || !systemPrompt.trim()}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : saveStatus === "success" ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : saveStatus === "error" ? (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    {saveStatus === "success" ? "Saved!" : saveStatus === "error" ? "Error" : "Save Prompt"}
                  </Button>
                )}
                <a
                  href="/settings?tab=chat"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                  <Settings className="h-3 w-3" />
                  Chat Settings
                </a>
              </div>
            </div>

            {/* ── Knowledge Base toggle ───────────────────────────────── */}
            <div>
              <button
                onClick={() => setShowKnowledgeBase((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKnowledgeBase ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Knowledge Base
                {knowledgeBase && <span className="h-1.5 w-1.5 rounded-full bg-primary ml-1" />}
              </button>
              <AnimatePresence>
                {showKnowledgeBase && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      value={knowledgeBase}
                      onChange={(e) => setKnowledgeBase(e.target.value)}
                      placeholder="Paste business context, FAQs, or product details here…"
                      rows={3}
                      className="mt-2 w-full text-xs bg-background border border-border rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Overrides the knowledge base from Chat Settings for this session only.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Website Context status ──────────────────────────────── */}
            {/* Mirrors what the WhatsApp pipeline injects so playground replies
                use the same scraped company-website grounding. Read-only here —
                edit URLs in Chat Settings → Company Website Context. */}
            <div>
              <button
                onClick={() => setShowWebScraping((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showWebScraping ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                <Globe className="h-3.5 w-3.5" />
                Website Context
                {webScraping?.enabled && webScraping.chars > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    ON · {webScraping.chars.toLocaleString()} chars
                  </span>
                ) : webScraping?.enabled ? (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    ON · no cached content
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/70">OFF</span>
                )}
              </button>
              <AnimatePresence>
                {showWebScraping && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 text-[11px] text-muted-foreground bg-background border border-border rounded-md px-3 py-2 space-y-1.5">
                      {webScraping?.enabled && webScraping.chars > 0 && (
                        <p className="text-foreground">
                          Cached website text is automatically appended to the system prompt for every test reply — same as WhatsApp.
                        </p>
                      )}
                      {webScraping?.enabled && webScraping.chars === 0 && (
                        <p className="text-amber-700 dark:text-amber-400">
                          Website Context is ON but no content was captured. Re-save in Chat Settings to refresh.
                        </p>
                      )}
                      {!webScraping?.enabled && (
                        <p>
                          Disabled. Enable & add URLs in <a href="/settings?tab=chat" className="text-primary hover:underline">Chat Settings → Company Website Context</a> to ground replies on your website content.
                        </p>
                      )}
                      {webScraping && webScraping.urls.length > 0 && (
                        <div>
                          <span className="block text-muted-foreground/70 mb-0.5">Sources ({webScraping.urls.length}):</span>
                          <ul className="space-y-0.5">
                            {webScraping.urls.map((u) => (
                              <li key={u} className="truncate">
                                <a href={u} target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary hover:underline">
                                  {u}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Chat Area ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                {(() => {
                  const { Icon: ChIcon, color } = activeChannelCfg;
                  return selectedChannel === "all"
                    ? <FlaskConical className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    : <ChIcon className={`h-10 w-10 mb-3 opacity-20 ${color}`} />;
                })()}
                <p className="text-sm text-muted-foreground">
                  Send a message to test your{" "}
                  {selectedChannel !== "all" && (
                    <span className={`font-medium ${activeChannelCfg.color}`}>
                      {activeChannelCfg.label}{" "}
                    </span>
                  )}
                  AI prompt.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Responses are not saved to any conversation.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                {msg.role === "user" ? (
                  <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                ) : (
                  <AssistantBubble content={msg.content} />
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isSending && (
              <div className="flex items-start gap-2">
                <div className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center bg-muted">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {sendError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {sendError}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Area ────────────────────────────────────────────── */}
          <div className="shrink-0 border-t border-border bg-card px-3 py-2.5">
            {/* Active channel indicator */}
            {selectedChannel !== "all" && (
              <div className={`flex items-center gap-1 text-[10px] mb-1.5 ${activeChannelCfg.color}`}>
                {(() => { const { Icon: IndIcon } = activeChannelCfg; return <IndIcon className="h-3 w-3" />; })()}
                <span>Testing {activeChannelCfg.label} prompt</span>
              </div>
            )}
            <div className="flex items-end gap-2">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={handleClearChat}
                  title="Clear chat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a test message… (Enter to send)"
                rows={1}
                disabled={isSending}
                className="flex-1 text-sm bg-background border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground disabled:opacity-50 min-h-[36px] max-h-[120px]"
                style={{ height: "auto" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                }}
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleSend}
                disabled={!inputValue.trim() || isSending}
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              Shift+Enter for new line · Responses are not saved
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}
