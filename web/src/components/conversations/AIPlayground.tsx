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
  ChevronLeft,
  FlaskConical,
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
  Info,
  SlidersHorizontal,
  BookOpen 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchWithTenant } from "@/lib/fetch-with-tenant";
import { cn } from "@/lib/utils";

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

interface PlaygroundAttachment {
  key?: string | null;
  filename: string;
  mime_type: string;
  media_type: "document" | "image";
  matched_keyword: string;
  url?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  would_attach?: PlaygroundAttachment[];
}

interface AIPlaygroundProps {
  onClose: () => void;
  variant?: "default" | "conversations" | "whatsapp";
}

// ── Channel config ─────────────────────────────────────────────────────────────

const CHANNELS = [
  { value: "all",       label: "All",       Icon: Hash,          color: "text-gray-500 dark:text-neutral-400",  bg: "bg-gray-100 dark:bg-neutral-800" },
  { value: "whatsapp",  label: "WhatsApp",  Icon: MessageCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/60" },
  { value: "linkedin",  label: "LinkedIn",  Icon: Linkedin,      color: "text-[#0B1957] dark:text-blue-400",       bg: "bg-[#0B1957]/10 dark:bg-blue-950/60" },
  { value: "instagram", label: "Instagram", Icon: Instagram,     color: "text-pink-600 dark:text-pink-400",     bg: "bg-pink-50 dark:bg-pink-950/60" },
  { value: "email",     label: "Email",     Icon: Mail,          color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-50 dark:bg-violet-950/60" },
  { value: "generic",   label: "Generic",   Icon: Cpu,           color: "text-orange-500 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/60" },
] as const;

type ChannelValue = typeof CHANNELS[number]["value"];

function getChannelStyle(channel: string, isSelected: boolean, isWhatsAppVariant: boolean) {
  if (isWhatsAppVariant) {
    if (isSelected) {
      return channel === "whatsapp"
        ? "bg-emerald-50 dark:bg-[#00a884]/10 text-emerald-700 dark:text-white border-emerald-600 dark:border-[#00a884] shadow-xs"
        : "bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white border-gray-300 dark:border-[#00a884] shadow-xs";
    }
    return "bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-400 border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700";
  }

  // Website Blue Theme (for non-WhatsApp variants)
  switch (channel) {
    case "whatsapp":
      return isSelected
        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500 dark:border-emerald-500 shadow-xs"
        : "bg-white dark:bg-[#091126] text-slate-600 dark:text-blue-200/80 border-slate-200 dark:border-blue-900/60 hover:border-blue-400 dark:hover:border-blue-500";
    case "linkedin":
      return isSelected
        ? "bg-[#0B1957]/10 dark:bg-blue-950/80 text-[#0B1957] dark:text-blue-300 border-[#0B1957] dark:border-blue-400 shadow-xs"
        : "bg-white dark:bg-[#091126] text-slate-600 dark:text-blue-200/80 border-slate-200 dark:border-blue-900/60 hover:border-[#0B1957] dark:hover:border-blue-500";
    case "instagram":
      return isSelected
        ? "bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-500 dark:border-pink-500 shadow-xs"
        : "bg-white dark:bg-[#091126] text-slate-600 dark:text-blue-200/80 border-slate-200 dark:border-blue-900/60 hover:border-pink-400 dark:hover:border-blue-500";
    case "email":
      return isSelected
        ? "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-500 dark:border-violet-500 shadow-xs"
        : "bg-white dark:bg-[#091126] text-slate-600 dark:text-blue-200/80 border-slate-200 dark:border-blue-900/60 hover:border-violet-400 dark:hover:border-blue-500";
    case "generic":
      return isSelected
        ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-500 dark:border-orange-500 shadow-xs"
        : "bg-white dark:bg-[#091126] text-slate-600 dark:text-blue-200/80 border-slate-200 dark:border-blue-900/60 hover:border-orange-400 dark:hover:border-blue-500";
    default: // all
      return isSelected
        ? "bg-[#0B1957] dark:bg-blue-600 text-white border-[#0B1957] dark:border-blue-500 shadow-xs"
        : "bg-white dark:bg-[#091126] text-slate-600 dark:text-blue-200/80 border-slate-200 dark:border-blue-900/60 hover:border-[#0B1957] dark:hover:border-blue-500";
  }
}

function getUserBubbleStyle(channel: string, isWhatsAppVariant: boolean) {
  if (isWhatsAppVariant) {
    return {
      avatar: "bg-[#00a884] text-white",
      bubble: "bg-emerald-600 dark:bg-emerald-700 text-white dark:text-neutral-100",
      button: "bg-[#00a884] hover:bg-[#008069] text-white shadow-xs",
    };
  }
  switch (channel) {
    case "whatsapp":
      return {
        avatar: "bg-[#00a884] text-white",
        bubble: "bg-emerald-600 dark:bg-emerald-600 text-white",
        button: "bg-[#00a884] hover:bg-[#008069] text-white shadow-xs",
      };
    case "linkedin":
      return {
        avatar: "bg-[#0B1957] dark:bg-blue-600 text-white",
        bubble: "bg-[#0B1957] dark:bg-blue-600 text-white",
        button: "bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-xs",
      };
    case "instagram":
      return {
        avatar: "bg-pink-600 text-white",
        bubble: "bg-pink-600 dark:bg-pink-600 text-white",
        button: "bg-pink-600 hover:bg-pink-700 text-white shadow-xs",
      };
    case "email":
      return {
        avatar: "bg-violet-600 text-white",
        bubble: "bg-violet-600 dark:bg-violet-600 text-white",
        button: "bg-violet-600 hover:bg-violet-700 text-white shadow-xs",
      };
    case "generic":
      return {
        avatar: "bg-orange-500 text-white",
        bubble: "bg-orange-600 dark:bg-orange-600 text-white",
        button: "bg-orange-500 hover:bg-orange-600 text-white shadow-xs",
      };
    default:
      return {
        avatar: "bg-[#0B1957] dark:bg-blue-600 text-white",
        bubble: "bg-[#0B1957] dark:bg-blue-600 text-white",
        button: "bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-xs",
      };
  }
}

// ── Conversation stages (WABA state machine) ───────────────────────────────────
// Lets a tester preview how a sectioned ("## STAGE:") prompt is scoped, and how
// the bot replies in each stage. Sent as `context_status` to the playground
// /chat endpoint; the live pipeline computes this per turn from the state
// machine. Stateless preview - does NOT run the real transitions or booking
// handlers (those only exist in process_inbound_message on the live pipeline).
const STAGES: { value: string; label: string }[] = [
  { value: "greeting",            label: "Greeting" },
  { value: "info_gathering",      label: "Info gathering" },
  { value: "booking_in_progress", label: "Booking in progress" },
  { value: "booking_completed",   label: "Booking completed" },
  { value: "cancelled",           label: "Cancelled" },
];

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
  // More robust than regex-stripping code fences - works regardless of
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
          // agent_reply is null / empty - surface full JSON as debug info
          return { text: "(No reply - see debug info)", metadata: obj };
        }
        // Valid JSON but no agent_reply key
        return { text: "[Structured response - expand debug info]", metadata: obj };
      }
    } catch {
      // Truncated / malformed JSON - fall through to regex
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
    return { text: "(No reply - see debug info)", metadata: null };
  }

  // ── 4. Plain text - render as-is ─────────────────────────────────────────
  return { text: raw, metadata: null };
}

// ── AssistantBubble - AI reply with optional collapsible metadata ─────────────

function AssistantBubble({ content, isWhatsApp }: { content: string; isWhatsApp?: boolean }) {
  const { text, metadata } = parseAIResponse(content);
  const isNoReply = text.startsWith("(No reply") || text.startsWith("[Structured response");
  const [showMeta, setShowMeta] = useState(isNoReply);

  return (
    <div className="max-w-[80%] space-y-1">
      <div className={cn(
        "rounded-2xl rounded-tl-sm px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap shadow-xs transition-colors",
        isWhatsApp
          ? "bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 border border-gray-200/40 dark:border-neutral-700/40"
          : "bg-slate-100 dark:bg-[#132044] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-blue-900/50"
      )}>
        {text}
      </div>
      {metadata && (
        <div>
          <button
            onClick={() => setShowMeta((v) => !v)}
            className={cn(
              "flex items-center gap-1 text-[10px] transition-colors px-1 py-0.5",
              isWhatsApp
                ? "text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100"
                : "text-slate-500 dark:text-blue-300/80 hover:text-[#0B1957] dark:hover:text-blue-100"
            )}
          >
            {showMeta ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showMeta ? "Hide" : "Show"} debug info
          </button>
          {showMeta && (
            <pre className={cn(
              "mt-1 rounded-md px-2.5 py-2 text-[10px] overflow-x-auto leading-relaxed border transition-colors font-mono",
              isWhatsApp
                ? "bg-gray-900 dark:bg-neutral-950 border-gray-800 dark:border-neutral-800 text-gray-300 dark:text-neutral-400"
                : "bg-slate-900 dark:bg-[#070d1e] border-slate-800 dark:border-blue-950 text-slate-300 dark:text-blue-200/80"
            )}>
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

export function AIPlayground({ onClose, variant = "default" }: AIPlaygroundProps) {
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
  const [showStageDropdown, setShowStageDropdown]   = useState(false);
  // Conversation-stage selector (WABA) - previews stage-scoped prompts.
  const [selectedStage, setSelectedStage] = useState<string>("greeting");
  // Echo of what the backend actually scoped to (stage + assembled prompt size).
  const [stageInfo, setStageInfo] = useState<{ stage: string; chars: number } | null>(null);

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

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const dropdownRef     = useRef<HTMLDivElement>(null);
  const stageDropdownRef = useRef<HTMLDivElement>(null);

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
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(e.target as Node)) {
        setShowStageDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Channel selection ─────────────────────────────────────────────────────────

  const handleSelectChannel = useCallback((ch: ChannelValue) => {
    setSelectedChannel(ch);
    setShowPromptDropdown(false);
    setShowStageDropdown(false);
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
          context_status:       selectedStage,
        }),
      });
      const data = await res.json();

      if (data.success && data.response) {
        // Surface what the backend scoped the prompt to (stage + char count),
        // so the tester can confirm e.g. booking_completed dropped the
        // greeting/slot prose.
        if (data.stage_used) {
          setStageInfo({ stage: data.stage_used, chars: data.system_prompt_chars ?? 0 });
        }
        setMessages([
          ...history,
          {
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
            would_attach: Array.isArray(data.would_attach) ? data.would_attach : undefined,
          },
        ]);
      } else {
        setSendError(data.detail || data.error || "AI did not return a response.");
        setMessages(messages);
      }
    } catch {
      setSendError("Network error - could not reach the AI service.");
      setMessages(messages);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [inputValue, isSending, messages, systemPrompt, selectedPromptId, knowledgeBase, settings, selectedStage]);

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
  const isConversations  = variant === "conversations" || variant === "whatsapp";
  const isWhatsApp       = variant === "whatsapp";

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "fixed right-0 top-0 h-full w-full sm:w-[480px] z-[110] flex flex-col border-l shadow-2xl transition-colors",
        isWhatsApp
          ? "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-900 dark:text-neutral-100"
          : "bg-white dark:bg-[#0b132b] border-slate-200 dark:border-blue-900/60 text-slate-900 dark:text-slate-100"
      )}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center gap-2 border-b shrink-0 transition-colors",
          isWhatsApp
            ? "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800"
            : "bg-white dark:bg-[#0d1735] border-slate-200 dark:border-blue-900/60",
          isConversations ? "px-4 py-3 sm:py-0 sm:h-10 sm:px-3" : "px-4 py-3"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 sm:hidden -ml-2 transition-colors",
            isWhatsApp
              ? "text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 hover:bg-gray-100 dark:hover:bg-neutral-800"
              : "text-slate-500 dark:text-blue-300 hover:text-[#0B1957] dark:hover:text-white hover:bg-[#0B1957]/10 dark:hover:bg-blue-950/60"
          )}
          onClick={onClose}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FlaskConical
            className={cn(
              "shrink-0 transition-colors",
              isWhatsApp ? "text-[#0B1957] dark:text-neutral-400" : "text-[#0B1957] dark:text-blue-400",
              isConversations ? "h-5 w-5 sm:h-4 sm:w-4" : "h-5 w-5"
            )}
          />
          <h2 className="font-semibold text-sm truncate">AI Playground</h2>
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full hidden xs:inline-block transition-colors border",
              isWhatsApp
                ? "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 border-transparent"
                : "bg-[#0B1957]/10 dark:bg-blue-950/60 text-[#0B1957] dark:text-blue-300 border-[#0B1957]/20 dark:border-blue-800/60"
            )}
          >
            {settings?.ai_model || "claude-sonnet"}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              isConversations ? "h-8 w-8 sm:h-7 sm:w-7" : "h-8 w-8",
              isWhatsApp
                ? "text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 hover:bg-gray-100 dark:hover:bg-neutral-800"
                : "text-slate-500 dark:text-blue-300 hover:text-[#0B1957] dark:hover:text-white hover:bg-[#0B1957]/10 dark:hover:bg-blue-950/60"
            )}
            onClick={loadConfig}
            title="Reload config"
          >
            <RefreshCw className={isConversations ? "h-3.5 w-3.5 sm:h-3 sm:w-3" : "h-3.5 w-3.5"} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "hidden sm:inline-flex",
              isConversations ? "h-8 w-8 sm:h-7 sm:w-7" : "h-8 w-8",
              isWhatsApp
                ? "text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 hover:bg-gray-100 dark:hover:bg-neutral-800"
                : "text-slate-500 dark:text-blue-300 hover:text-[#0B1957] dark:hover:text-white hover:bg-[#0B1957]/10 dark:hover:bg-blue-950/60"
            )}
            onClick={onClose}
          >
            <X className={isConversations ? "h-4 w-4 sm:h-3.5 sm:w-3.5" : "h-4 w-4"} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className={cn("h-6 w-6 animate-spin", isWhatsApp ? "text-gray-400 dark:text-neutral-500" : "text-[#0B1957] dark:text-blue-400")} />
        </div>
      ) : (
        <>
          {/* ── Config Panel ──────────────────────────────────────────── */}
          <div
            className={cn(
              "shrink-0 border-b px-4 py-3 space-y-3 transition-colors",
              isWhatsApp
                ? "bg-gray-50/50 dark:bg-neutral-900 border-gray-200 dark:border-neutral-800"
                : "bg-[#0B1957]/[0.02] dark:bg-[#0d1735]/80 border-slate-200 dark:border-blue-900/60"
            )}
          >
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <label
                  className={cn(
                    "text-xs font-medium block",
                    isWhatsApp ? "text-gray-700 dark:text-neutral-400" : "text-slate-700 dark:text-blue-200/90"
                  )}
                >
                  System Prompt
                </label>
                <Info className={cn("h-3.5 w-3.5", isWhatsApp ? "text-gray-400 dark:text-neutral-400" : "text-[#0B1957]/70 dark:text-blue-400")} />
              </div>

              {/* ── Channel selector pills ──────────────────────────── */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CHANNELS.map(({ value, label, Icon, color }) => {
                  const isSelected = selectedChannel === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleSelectChannel(value as ChannelValue)}
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all",
                        getChannelStyle(value, isSelected, isWhatsApp)
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-3 w-3",
                          isSelected
                            ? value === "all"
                              ? isWhatsApp
                                ? "text-gray-900 dark:text-neutral-100"
                                : "text-white"
                              : color
                            : isWhatsApp
                            ? "text-gray-400 dark:text-neutral-500"
                            : "text-slate-400 dark:text-blue-300/60"
                        )}
                      />
                      {label}
                      {value !== "all" && (
                        <span
                          className={cn(
                            "text-[10px] ml-0.5",
                            isSelected ? "font-semibold" : "opacity-60"
                          )}
                        >
                          {prompts.filter((p) => p.channel === value).length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Conversation stage (preview stage-scoped prompt) ─── */}
              {(selectedChannel === "whatsapp" || selectedChannel === "all") && (
                <div className="flex items-center gap-2 mb-2">
                  <label
                    className={cn(
                      "text-[11px] font-medium shrink-0",
                      isWhatsApp ? "text-gray-700 dark:text-neutral-400" : "text-slate-700 dark:text-blue-200/90"
                    )}
                  >
                    Stage
                  </label>
                  <div className="relative flex-1" ref={stageDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowStageDropdown((v) => !v)}
                      title="Preview how a sectioned (## STAGE:) prompt scopes + how the bot replies in this stage. Stateless - does not run real transitions or bookings."
                      className={cn(
                        "w-full flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 focus:outline-none transition-colors cursor-pointer text-left",
                        isWhatsApp
                          ? "bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-900 dark:text-neutral-100 focus:ring-1 focus:ring-[#00a884]"
                          : "bg-white dark:bg-[#080e22] border border-slate-200 dark:border-blue-900/60 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-[#0B1957] dark:focus:ring-blue-400"
                      )}
                    >
                      <span className="truncate">
                        {STAGES.find((s) => s.value === selectedStage)?.label || "Select stage..."}
                      </span>
                      <ChevronDown className={cn("h-3 w-3 ml-1.5 shrink-0 opacity-60", isWhatsApp ? "text-gray-400 dark:text-neutral-400" : "text-slate-400 dark:text-blue-300/60")} />
                    </button>

                    <AnimatePresence>
                      {showStageDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.1 }}
                          className={cn(
                            "absolute z-20 top-full left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden py-1",
                            isWhatsApp
                              ? "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800"
                              : "bg-white dark:bg-[#0d1735] border-slate-200 dark:border-blue-900/80"
                          )}
                        >
                          {STAGES.map((s) => {
                            const isSelected = s.value === selectedStage;
                            return (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() => {
                                  setSelectedStage(s.value);
                                  setShowStageDropdown(false);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between",
                                  isSelected
                                    ? isWhatsApp
                                      ? "bg-[#00a884] text-white font-medium"
                                      : "bg-[#0B1957] dark:bg-blue-600 text-white font-medium"
                                    : isWhatsApp
                                    ? "hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                                    : "hover:bg-[#0B1957]/5 dark:hover:bg-blue-900/40 text-slate-900 dark:text-slate-100"
                                )}
                              >
                                <span>{s.label}</span>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {stageInfo && (
                    <span className={cn("text-[10px] shrink-0 whitespace-nowrap", isWhatsApp ? "text-gray-500 dark:text-neutral-400" : "text-slate-500 dark:text-blue-300/60")}>
                      scoped: {stageInfo.stage} · {stageInfo.chars} chars
                    </span>
                  )}
                </div>
              )}

              {/* ── Prompt dropdown (filtered by channel) ──────────── */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowPromptDropdown((v) => !v)}
                  className={cn(
                    "w-full flex items-center justify-between text-xs rounded-xl px-3 py-2 transition-colors",
                    isWhatsApp
                      ? "bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-700 text-gray-900 dark:text-neutral-100"
                      : "bg-white dark:bg-[#080e22] border border-slate-200 dark:border-blue-900/60 hover:border-[#0B1957] dark:hover:border-blue-500 text-slate-900 dark:text-slate-100"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {selectedPromptName ? (
                      <>
                        {(() => {
                          const p = prompts.find((pr) => pr.name === selectedPromptName);
                          const cfg = getChannelConfig(p?.channel || "");
                          const { Icon: SelIcon } = cfg;
                          return <SelIcon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />;
                        })()}
                        <span className="truncate">{selectedPromptName}</span>
                      </>
                    ) : (
                      <span className={isWhatsApp ? "text-gray-400 dark:text-neutral-400" : "text-slate-400 dark:text-blue-300/50"}>
                        {filteredPrompts.length === 0
                          ? `No ${selectedChannel === "all" ? "" : selectedChannel + " "}prompts yet`
                          : `Select a ${selectedChannel === "all" ? "" : selectedChannel + " "}prompt…`}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={cn("h-3.5 w-3.5 ml-2 shrink-0", isWhatsApp ? "text-gray-400 dark:text-neutral-400" : "text-slate-400 dark:text-blue-300/60")} />
                </button>

                <AnimatePresence>
                  {showPromptDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.1 }}
                      className={cn(
                        "absolute z-10 top-full left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden max-h-52 overflow-y-auto",
                        isWhatsApp
                          ? "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800"
                          : "bg-white dark:bg-[#0d1735] border-slate-200 dark:border-blue-900/80"
                      )}
                    >
                      {filteredPrompts.length === 0 ? (
                        <div className={cn("px-3 py-3 text-xs text-center", isWhatsApp ? "text-gray-500 dark:text-neutral-400" : "text-slate-500 dark:text-blue-300/70")}>
                          No prompts for this channel yet.
                        </div>
                      ) : (
                        filteredPrompts.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleSelectPrompt(p)}
                            className={cn(
                              "w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2",
                              isWhatsApp
                                ? p.name === selectedPromptName
                                  ? "bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-medium"
                                  : "hover:bg-gray-50 dark:hover:bg-neutral-800/80 text-gray-900 dark:text-neutral-100"
                                : p.name === selectedPromptName
                                ? "bg-[#0B1957]/10 dark:bg-blue-950/80 text-[#0B1957] dark:text-blue-100 font-medium border-l-2 border-[#0B1957] dark:border-blue-400"
                                : "hover:bg-[#0B1957]/5 dark:hover:bg-blue-900/40 text-slate-900 dark:text-slate-100"
                            )}
                          >
                            {(() => {
                              const cfg = getChannelConfig(p.channel);
                              const { Icon: PIcon } = cfg;
                              return <PIcon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />;
                            })()}

                            <span className="flex-1 truncate">{p.name}</span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {selectedChannel === "all" && <ChannelBadge channel={p.channel} />}
                              <span className={cn("text-[10px]", isWhatsApp ? "text-gray-400 dark:text-neutral-500" : "text-slate-400 dark:text-blue-300/50")}>v{p.version}</span>
                              {p.is_active && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Active" />
                              )}
                            </div>
                          </button>
                        ))
                      )}
                      <button
                        onClick={handleClearPrompt}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs border-t transition-colors",
                          isWhatsApp
                            ? "text-gray-500 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 border-gray-200 dark:border-neutral-800"
                            : "text-[#0B1957] dark:text-blue-400 hover:bg-[#0B1957]/10 dark:hover:bg-blue-950/60 border-slate-200 dark:border-blue-900/60"
                        )}
                      >
                        Clear selection
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── System prompt textarea ──────────────────────────── */}
              <div className="relative mt-2">
                <textarea
                  value={systemPrompt}
                  onChange={(e) => {
                    setSystemPrompt(e.target.value);
                    setSaveStatus("idle");
                  }}
                  placeholder={`Enter a ${selectedChannel === "all" ? "" : selectedChannel + " "}system prompt, or select one above…`}
                  rows={4}
                  maxLength={2000}
                  className={cn(
                    "w-full text-xs rounded-xl px-3 py-2.5 resize-none focus:outline-none font-mono transition-colors",
                    isWhatsApp
                      ? "bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 focus:ring-1 focus:ring-[#00a884]"
                      : "bg-white dark:bg-[#080e22] border border-slate-200 dark:border-blue-900/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-blue-300/40 focus:ring-1 focus:ring-[#0B1957] dark:focus:ring-blue-400"
                  )}
                />
                <span className={cn("absolute bottom-2.5 right-3 text-[10px] pointer-events-none select-none", isWhatsApp ? "text-gray-400 dark:text-neutral-500" : "text-slate-400 dark:text-blue-300/50")}>
                  {systemPrompt.length} / 2000
                </span>
              </div>

              {/* ── Save + Chat Settings row ────────────────────────── */}
              <div className="flex items-center gap-2 mt-2">
                {selectedPromptName && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "h-7 text-xs gap-1.5 transition-colors",
                      isWhatsApp
                        ? "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-800"
                        : "bg-white dark:bg-[#080e22] border-[#0B1957]/30 dark:border-blue-800/80 text-[#0B1957] dark:text-blue-300 hover:bg-[#0B1957]/10 dark:hover:bg-blue-950/60"
                    )}
                    onClick={handleSavePrompt}
                    disabled={isSaving || !systemPrompt.trim()}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : saveStatus === "success" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : saveStatus === "error" ? (
                      <AlertCircle className="h-3 w-3 text-red-500" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    {saveStatus === "success" ? "Saved!" : saveStatus === "error" ? "Error" : "Save Prompt"}
                  </Button>
                )}
                <a
                  href="/settings?tab=chat"
                  className={cn(
                    "flex items-center gap-1.5 text-xs transition-colors ml-auto font-medium",
                    isWhatsApp || selectedChannel === "whatsapp"
                      ? "text-[#00a884] hover:text-[#008069] dark:text-[#00a884] dark:hover:text-[#00c89c]"
                      : "text-[#0B1957] hover:text-[#0B1957]/80 dark:text-blue-400 dark:hover:text-blue-300"
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Chat Settings
                </a>
              </div>
            </div>

            {/* ── Knowledge Base toggle ───────────────────────────────── */}
            <div>
              <button
                onClick={() => setShowKnowledgeBase((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors font-medium",
                  isWhatsApp
                    ? "text-gray-700 dark:text-neutral-200 hover:text-gray-900 dark:hover:text-white"
                    : "text-slate-700 dark:text-blue-200 hover:text-[#0B1957] dark:hover:text-blue-300"
                )}
              >
                {showKnowledgeBase ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                Knowledge Base
                {knowledgeBase && <span className={cn("h-1.5 w-1.5 rounded-full ml-1", isWhatsApp ? "bg-emerald-500 dark:bg-emerald-400" : "bg-[#0B1957] dark:bg-blue-400")} />}
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
                      className={cn(
                        "mt-2 w-full text-xs rounded-xl px-3 py-2 resize-none focus:outline-none transition-colors",
                        isWhatsApp
                          ? "bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 focus:ring-1 focus:ring-[#00a884]"
                          : "bg-white dark:bg-[#080e22] border border-slate-200 dark:border-blue-900/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-blue-300/40 focus:ring-1 focus:ring-[#0B1957] dark:focus:ring-blue-400"
                      )}
                    />
                    <p className={cn("text-[10px] mt-1", isWhatsApp ? "text-gray-500 dark:text-neutral-400" : "text-slate-500 dark:text-blue-300/60")}>
                      Overrides the knowledge base from Chat Settings for this session only.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Chat Area ─────────────────────────────────────────────── */}
          <div
            className={cn(
              "flex-1 overflow-y-auto px-4 py-3 space-y-3 transition-colors",
              isWhatsApp ? "bg-gray-50/40 dark:bg-neutral-950/40" : "bg-slate-50/50 dark:bg-[#060b19]"
            )}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                {isWhatsApp ? (
                  <FlaskConical className="h-16 w-16 text-gray-300 dark:text-neutral-700 mb-4 stroke-[1.25]" />
                ) : (
                  (() => {
                    const { Icon: ChIcon, color } = activeChannelCfg;
                    return selectedChannel === "all" ? (
                      <FlaskConical className="h-12 w-12 text-[#0B1957]/30 dark:text-blue-900/60 mb-3 stroke-[1.25]" />
                    ) : (
                      <ChIcon className={`h-12 w-12 mb-3 ${color} opacity-70`} />
                    );
                  })()
                )}
                <p className={cn("text-sm font-semibold", isWhatsApp ? "text-gray-900 dark:text-neutral-100" : "text-slate-900 dark:text-slate-100")}>
                  Send a message to test your{" "}
                  {selectedChannel !== "all" && (
                    <span className={`font-semibold ${activeChannelCfg.color}`}>
                      {activeChannelCfg.label}{" "}
                    </span>
                  )}
                  AI prompt.
                </p>
                <p className={cn("text-xs mt-1", isWhatsApp ? "text-gray-500 dark:text-neutral-400" : "text-slate-500 dark:text-blue-300/60")}>
                  Responses are not saved to any conversation.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => {
              const channelUserStyle = getUserBubbleStyle(selectedChannel, isWhatsApp);
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={cn(
                      "shrink-0 h-7 w-7 rounded-full flex items-center justify-center font-medium text-xs shadow-xs",
                      msg.role === "user"
                        ? channelUserStyle.avatar
                        : isWhatsApp
                        ? "bg-gray-200 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400"
                        : "bg-[#0B1957]/10 dark:bg-blue-950/80 text-[#0B1957] dark:text-blue-300 border border-[#0B1957]/20 dark:border-blue-800/60"
                    )}
                  >
                    {msg.role === "user" ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <>
                        <img src="/logo.svg" alt="Mr LAD" className="h-3.5 w-3.5 object-contain dark:hidden" />
                        <img src="/logo-white.svg" alt="Mr LAD" className="h-3.5 w-3.5 object-contain hidden dark:block" />
                      </>
                    )}
                  </div>
                  {msg.role === "user" ? (
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap shadow-xs font-normal",
                        channelUserStyle.bubble
                      )}
                    >
                      {msg.content}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-w-[80%]">
                      <AssistantBubble content={msg.content} isWhatsApp={isWhatsApp} />
                      {msg.would_attach && msg.would_attach.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {msg.would_attach.map((att, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 rounded-lg border border-violet-300 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1.5 text-xs"
                              title={`Live WhatsApp would attach this file. Matched on keyword: "${att.matched_keyword}"`}
                            >
                              <BookOpen className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                              <span className="font-mono text-violet-700 dark:text-violet-300 truncate flex-1">
                                📎 {att.filename}
                              </span>
                              <span className="text-violet-500 dark:text-violet-400 text-[10px] uppercase tracking-wide">
                                would attach
                              </span>
                              <span className="text-gray-400 dark:text-neutral-400 text-[10px] truncate max-w-[120px]">
                                triggered: &quot;{att.matched_keyword}&quot;
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing indicator */}
            {isSending && (
              <div className="flex items-start gap-2">
                <div className={cn("shrink-0 h-7 w-7 rounded-full flex items-center justify-center", isWhatsApp ? "bg-gray-200 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400" : "bg-[#0B1957]/10 dark:bg-blue-950/80 text-[#0B1957] dark:text-blue-300")}>
                  <img src="/logo.svg" alt="Mr LAD" className="h-3.5 w-3.5 object-contain dark:hidden" />
                  <img src="/logo-white.svg" alt="Mr LAD" className="h-3.5 w-3.5 object-contain hidden dark:block" />
                </div>
                <div className={cn("rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1", isWhatsApp ? "bg-gray-100 dark:bg-neutral-800" : "bg-slate-100 dark:bg-[#132044]")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:0ms]", isWhatsApp ? "bg-gray-400 dark:bg-neutral-400" : "bg-[#0B1957]/60 dark:bg-blue-300")} />
                  <span className={cn("h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:150ms]", isWhatsApp ? "bg-gray-400 dark:bg-neutral-400" : "bg-[#0B1957]/60 dark:bg-blue-300")} />
                  <span className={cn("h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:300ms]", isWhatsApp ? "bg-gray-400 dark:bg-neutral-400" : "bg-[#0B1957]/60 dark:bg-blue-300")} />
                </div>
              </div>
            )}

            {sendError && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {sendError}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Area ────────────────────────────────────────────── */}
          <div
            className={cn(
              "shrink-0 border-t px-3 py-2.5 transition-colors",
              isWhatsApp
                ? "bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800"
                : "bg-white dark:bg-[#0d1735] border-slate-200 dark:border-blue-900/60"
            )}
          >
            {/* Active channel indicator */}
            {selectedChannel !== "all" && (
              <div className={`flex items-center gap-1 text-[10px] mb-1.5 font-medium ${activeChannelCfg.color}`}>
                {(() => {
                  const { Icon: IndIcon } = activeChannelCfg;
                  return <IndIcon className="h-3 w-3" />;
                })()}
                <span>Testing {activeChannelCfg.label} prompt</span>
              </div>
            )}
            <div className="flex items-end gap-2">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 shrink-0 transition-colors",
                    isWhatsApp
                      ? "text-gray-400 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
                      : "text-slate-400 dark:text-blue-300/60 hover:text-red-600 dark:hover:text-red-400 hover:bg-[#0B1957]/10 dark:hover:bg-blue-950/60"
                  )}
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
                className={cn(
                  "flex-1 text-sm rounded-xl px-3.5 py-2 resize-none focus:outline-none disabled:opacity-50 min-h-[38px] max-h-[120px] transition-colors",
                  isWhatsApp
                    ? "bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 text-gray-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 focus:ring-1 focus:ring-[#00a884]"
                    : "bg-slate-50 dark:bg-[#080e22] border border-slate-200 dark:border-blue-900/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-blue-300/40 focus:ring-1 focus:ring-[#0B1957] dark:focus:ring-blue-400"
                )}
                style={{ height: "auto" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                }}
              />
              <Button
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-xl shrink-0 transition-colors flex items-center justify-center p-0",
                  getUserBubbleStyle(selectedChannel, isWhatsApp).button
                )}
                onClick={handleSend}
                disabled={!inputValue.trim() || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Send className="h-4 w-4 text-white" />
                )}
              </Button>
            </div>
            <p className={cn("text-[10px] mt-2 text-center", isWhatsApp ? "text-gray-500 dark:text-neutral-400" : "text-slate-500 dark:text-blue-300/60")}>
              Shift+Enter for new line · Responses are not saved
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}
