"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { safeStorage } from "@lad/shared/storage";

/* ──────────────────────────────────────────────────────────────────
   CONSTANTS
   ────────────────────────────────────────────────────────────────── */

const HOLD_TIMEOUT_MS = 45 * 60 * 1000; // 45 min session limit

/** Minutes remaining from a starting timestamp */
function minsLeft(startMs: number): number {
  const elapsed = Date.now() - startMs;
  return Math.max(0, Math.ceil((HOLD_TIMEOUT_MS - elapsed) / 60000));
}

/** Read the auth JWT from cookie (primary) or localStorage (fallback). */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");
    if (rawName?.trim() === "token") {
      return decodeURIComponent(rawValueParts.join("=") || "");
    }
  }
  try {
    const stored = localStorage.getItem("token");
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return null;
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ──────────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────────── */

export interface AgentOption {
  id: number;
  name: string;
  description: string;
}

export interface BuilderData {
  question?: string;
  description?: string;
  options?: any[];
  htmlContent?: string;
  blocks?: any[];
  buttonLabel?: string;
  agentId?: number;
  draft?: {
    agent_prompt?: string;
    outbound_greeting?: string;
    inbound_greeting?: string;
  };
  phase?: string;
}


export type PlaygroundStep = 
  | "welcome" 
  | "config" 
  | "create-selection" 
  | "guided-journey"
  | "builder-text"
  | "builder-mcq"
  | "builder-mcq-few"
  | "builder-mcq-many"
  | "builder-mcq-multi"
  | "builder-multi-select"
  | "builder-summary"
  | "builder-blank"
  | "builder-master-draft"
  | "builder-dropdown"
  | "builder-configs";


export interface UsePlaygroundOptions {
  onClose?: () => void;
  initialAgentId?: string | number;
  userId?: string;
  tenantId?: string;
}

export interface UsePlaygroundReturn {
  step: PlaygroundStep;
  setStep: (step: PlaygroundStep) => void;
  startTesting: () => void;
  sessionToken: string;
  livekitUrl: string;
  workerUrl: string;
  isHolding: boolean;
  reloading: boolean;
  error: string;
  connecting: boolean;
  setError: (msg: string) => void;
  agents: AgentOption[];
  selectedAgent: number | null;
  setSelectedAgent: (id: number | null) => void;
  loadingAgents: boolean;
  fetchAgents: () => Promise<void>;
  skipAnalysis: boolean;
  setSkipAnalysis: (val: boolean) => void;
  enableRecording: boolean;
  setEnableRecording: (val: boolean) => void;
  enableCallLog: boolean;
  setEnableCallLog: (val: boolean) => void;
  timerDisplay: string;
  startCall: () => Promise<void>;
  handleDisconnect: () => void;
  openCreateSelection: () => void;
  startDirectConfig: () => void;
  startGuidedJourney: () => void;
  advanceBuilderStep: (userInput?: string | string[], action?: string) => void;
  builderData: BuilderData | null;
}

/* ──────────────────────────────────────────────────────────────────
   HOOK
   ────────────────────────────────────────────────────────────────── */

export function usePlayground({
  onClose,
  initialAgentId,
  userId,
  tenantId,
}: UsePlaygroundOptions): UsePlaygroundReturn {
  const router = useRouter();
  /* Step tracking */
  const [step, setStep] = useState<PlaygroundStep>("welcome");
  const [builderData, setBuilderData] = useState<BuilderData | null>(null);
  const [builderSessionId, setBuilderSessionId] = useState<string>("");

  /* Connection state */
  const [sessionToken, setSessionToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const workerUrl =
    process.env.NEXT_PUBLIC_PLAYGROUND_WORKER_URL || "http://localhost:8080";
  const [callId, setCallId] = useState("");
  const callIdRef = useRef("");

  // Keep ref in sync with state
  useEffect(() => {
    callIdRef.current = callId;
  }, [callId]);

  const [isHolding, setIsHolding] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  const getAuthHeaders = () => {
    const token = safeStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const getAuthHeaderOnly = () => {
    const token = safeStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  /* Agent listing */
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(() => {
    if (
      initialAgentId === undefined ||
      initialAgentId === null ||
      initialAgentId === ""
    )
      return null;
    const n = Number(initialAgentId);
    return isNaN(n) ? null : n;
  });
  const [loadingAgents, setLoadingAgents] = useState(false);

  /* Toggle controls */
  const [skipAnalysis, setSkipAnalysis] = useState(true);
  const [enableRecording, setEnableRecording] = useState(false);
  const [enableCallLog, setEnableCallLog] = useState(false);

  /* 45-min hold timer display */
  const [, setHoldStartMs] = useState(0);
  const [timerDisplay, setTimerDisplay] = useState("00:00");

  /* Refs for timers */
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const forceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const holdAbortRef = useRef<AbortController | null>(null);
  const demoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const generateCallId = () =>
    `play-${Math.random().toString(36).substring(2, 9)}`;

  /* ────────────────── HOLD LIFECYCLE ────────────────── */

  const clearAllTimers = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (forceTimerRef.current) clearTimeout(forceTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
  }, []);

  const releaseHold = useCallback(
    async (id: string) => {
      if (!id) return;
      try {
        await fetch(`${workerUrl}/release-call`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ call_id: id }),
        });
        console.warn(`[Playground] Released hold for ${id}`);
      } catch (e) {
        console.error("Failed to release worker:", e);
      }
    },
    [workerUrl],
  );

  const startTimers = useCallback(
    (currentId: string, startMs: number) => {
      clearAllTimers();

      /* Tick every 30 s to update the remaining-time badge */
      tickRef.current = setInterval(() => {
        setTimerDisplay(`${minsLeft(startMs)} min left`);
      }, 30000);
      setTimerDisplay(`${minsLeft(startMs)} min left`);

      /* 44-min warning (1 min before close) */
      const warningTime = HOLD_TIMEOUT_MS - 60000;
      holdTimerRef.current = setTimeout(() => {
        setError(
          "Session will expire in 1 minute to free up worker resources.",
        );
      }, warningTime);

      /* 45-min expiration - release and close */
      forceTimerRef.current = setTimeout(async () => {
        await releaseHold(currentId);
        if (onClose) onClose();
      }, HOLD_TIMEOUT_MS);
    },
     
    [clearAllTimers, onClose, releaseHold],
  );

  const establishHold = useCallback(
    async (id: string) => {
      try {
        console.warn(`[Playground] Establishing hold for ${id}...`);
        const probe = await fetch(`${workerUrl}/worker-status`, {
          method: "GET",
          headers: getAuthHeaderOnly(),
        });
        if (!probe.ok) throw new Error("Worker not reachable");

        if (holdAbortRef.current) holdAbortRef.current.abort();
        const controller = new AbortController();
        holdAbortRef.current = controller;

        // Fire-and-forget: /hold-for-call is long-polling (blocks up to 600s).
        fetch(`${workerUrl}/hold-for-call`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ call_id: id }),
          signal: controller.signal,
        }).catch((e) => {
          if (e.name !== "AbortError") {
            console.error("Hold request ended:", e);
          }
        });

        setIsHolding(true);
        setError("");
        const now = Date.now();
        setHoldStartMs(now);
        startTimers(id, now);
      } catch (e: any) {
        console.error("Failed to hold worker:", e);
        setError("Failed to wake the worker. Is it running?");
      }
    },
    [workerUrl, startTimers],
  );

  /* ────────────────── FETCH AGENTS ────────────────── */

  const fetchAgents = useCallback(async () => {
    setLoadingAgents(true);
    console.warn(
      `[Playground] Fetching agents from ${workerUrl}/playground-agents...`,
    );

    const resolvedTenantId =
      tenantId || process.env.NEXT_PUBLIC_PLAYGROUND_TENANT_ID;
    const resolvedUserId =
      userId || process.env.NEXT_PUBLIC_PLAYGROUND_USER_ID;
    const payload: any = {};
    if (resolvedTenantId) payload.tenant_id = resolvedTenantId;
    if (resolvedUserId) payload.user_id = resolvedUserId;

    try {
      const resp = await fetch(`${workerUrl}/playground-agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (!resp.ok)
        throw new Error(`Agent list failed with status: ${resp.status}`);
      const data = await resp.json();
      console.warn(
        `[Playground] Received ${data.agents?.length || 0} agents from worker.`,
      );
      setAgents(data.agents || []);
      if (data.agents?.length > 0) {
        setSelectedAgent((prev) => prev ?? data.agents[0].id);
        setError("");
      }
    } catch (e: any) {
      console.error("[Playground] Error fetching agents:", e);
      setError(
        `Could not load agent list from ${workerUrl}. Please check if the worker is running.`,
      );
    } finally {
      setLoadingAgents(false);
    }
  }, [workerUrl, tenantId, userId]);

  /* ────────────────── ON MOUNT ────────────────── */

  useEffect(() => {
    fetchAgents();

    return () => {
      if (holdAbortRef.current) holdAbortRef.current.abort();
      if (callIdRef.current) {
        releaseHold(callIdRef.current);
      }
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerUrl]);

  /* Keep and maintain connection (wait and hold) for all active playground/builder phases */
  useEffect(() => {
    const isAtActiveArea = step !== "welcome" && step !== "create-selection";
    if (isAtActiveArea) {
      if (!isHolding && !reloading && !callIdRef.current) {
        const id = generateCallId();
        setCallId(id);
        establishHold(id);
      }
    } else {
      if (callIdRef.current) {
        releaseHold(callIdRef.current);
        setCallId("");
        setIsHolding(false);
        clearAllTimers();
      }
    }
  }, [step, isHolding, reloading, establishHold, releaseHold, clearAllTimers]);

  /* ────────────────── STEP TRANSITIONS ────────────────── */

  const startTesting = useCallback(() => {
    setStep("config");
    if (!isHolding && !reloading) {
      const id = generateCallId();
      callIdRef.current = id;
      setCallId(id);
      establishHold(id);
    }
  }, [isHolding, reloading, establishHold]);

  /* ────────────────── START CALL ────────────────── */

  const startCall = useCallback(async () => {
    if (!selectedAgent) {
      setError("Please select an agent first.");
      return;
    }
    setError("");
    setConnecting(true);
    console.warn(
      `[Playground] Sending init request to ${workerUrl}/playground-init`,
    );

    const payload: any = {
      agent_id: selectedAgent,
      skip_analysis: skipAnalysis,
      enable_recording: enableRecording,
      enable_call_log: enableCallLog,
    };

    const resolvedTenantId =
      tenantId || process.env.NEXT_PUBLIC_PLAYGROUND_TENANT_ID;
    const resolvedUserId =
      userId || process.env.NEXT_PUBLIC_PLAYGROUND_USER_ID;

    if (resolvedTenantId) payload.tenant_id = resolvedTenantId;
    if (resolvedUserId) payload.user_id = resolvedUserId;
    if (process.env.NEXT_PUBLIC_PLAYGROUND_TO_NUMBER)
      payload.to_number = process.env.NEXT_PUBLIC_PLAYGROUND_TO_NUMBER;
    if (process.env.NEXT_PUBLIC_PLAYGROUND_FROM_NUMBER)
      payload.from_number = process.env.NEXT_PUBLIC_PLAYGROUND_FROM_NUMBER;

    try {
      const resp = await fetch(`${workerUrl}/playground-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.detail || `Init failed: ${resp.statusText}`);
      }

      const data = await resp.json();
      setSessionToken(data.token);
      setLivekitUrl(data.livekit_url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConnecting(false);
    }
  }, [
    selectedAgent,
    skipAnalysis,
    enableRecording,
    enableCallLog,
    tenantId,
    userId,
    workerUrl,
  ]);

  /* ────────────────── DISCONNECT HANDLER ────────────────── */

  const handleDisconnect = useCallback(() => {
    setSessionToken("");
    setLivekitUrl("");
  }, []);

  return {
    step,
    setStep,
    startTesting,
    sessionToken,
    livekitUrl,
    workerUrl,
    isHolding,
    reloading,
    error,
    connecting,
    setError,
    agents,
    selectedAgent,
    setSelectedAgent,
    loadingAgents,
    fetchAgents,
    skipAnalysis,
    setSkipAnalysis,
    enableRecording,
    setEnableRecording,
    enableCallLog,
    setEnableCallLog,
    timerDisplay,
    startCall,
    handleDisconnect,
    openCreateSelection: () => {
      if (callIdRef.current) releaseHold(callIdRef.current);
      setCallId("");
      setIsHolding(false);
      clearAllTimers();
      setStep("create-selection");
    },
    startDirectConfig: () => {
      if (callIdRef.current) releaseHold(callIdRef.current);
      if (onClose) onClose();
      router.push("/settings?tab=api");
    },
    startGuidedJourney: async () => {
      console.warn("[Playground] Starting guided journey...");
      const newSessionId = `session-${Math.random().toString(36).substring(2, 9)}`;
      setBuilderSessionId(newSessionId);
      setBuilderData(null);
      setError("");
      setStep("guided-journey"); // Show loading screen

      const id = generateCallId();
      callIdRef.current = id; // Sync ref synchronously to prevent race conditions with active area useEffect
      setCallId(id);

      // Probe worker status with retry loop (10 attempts, 1.5s delay)
      let awake = false;
      const maxAttempts = 10;
      const delayMs = 1500;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.warn(`[Playground] Probing worker status, attempt ${attempt}/${maxAttempts}...`);
          const probe = await fetch(`${workerUrl}/worker-status`, {
            method: "GET",
            headers: getAuthHeaderOnly(),
          });
          if (probe.ok) {
            awake = true;
            break;
          }
        } catch (e) {
          console.warn(`[Playground] Worker status probe attempt ${attempt} failed:`, e);
        }
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      if (!awake) {
        console.error("[Playground] Worker failed to wake up after polling.");
        setError("Worker is sleeping. Please try again later.");
        // Clear callId as the connection failed
        setCallId("");
        callIdRef.current = "";
        return;
      }

      // Worker is awake! Establish hold and call builder chat
      try {
        await establishHold(id);

        const res = await fetch(`${workerUrl}/playground-builder/chat`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ session_id: newSessionId }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json();
        console.warn("[Playground] Agent responded:", data.step, data.question);

        // Set data and transition immediately
        setBuilderData({
          question: data.question,
          description: data.description,
          options: data.options,
          htmlContent: data.htmlContent,
          blocks: data.blocks,
          buttonLabel: data.buttonLabel,
          agentId: data.agentId,
          draft: data.draft,
          phase: data.phase,
        });
        setStep(data.step as PlaygroundStep);
      } catch (err: any) {
        console.error("[Playground] FETCH FAILED:", err);
        setError(err.message || "Failed to initialize guided journey. Please try again later.");
        // DO NOT transition to "builder-text" (empty screen), stay on loading screen to display soft error
      }
    },
    advanceBuilderStep: async (userInput?: string | string[], action?: string) => {
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);

      console.warn(`[Playground] advanceBuilderStep - input: ${userInput}, action: ${action}`);

      setStep("guided-journey"); // Show loading screen while waiting

      try {
        const res = await fetch(`${workerUrl}/playground-builder/chat`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            session_id: builderSessionId,
            message: typeof userInput === "string" ? userInput : (userInput || []).join(", "),
            action: action,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        console.warn("[Playground] Agent responded:", data.step, data.question);

        if (data.step === "config") {
          await fetchAgents();
          if (data.agentId) {
            setSelectedAgent(Number(data.agentId));
          }
          setStep("config");
          if (!isHolding && !reloading) {
            const id = generateCallId();
            setCallId(id);
            establishHold(id);
          }
          return;
        }

        // Set data and transition immediately - no timer
        setBuilderData({
          question: data.question,
          description: data.description,
          options: data.options,
          htmlContent: data.htmlContent,
          blocks: data.blocks,
          buttonLabel: data.buttonLabel,
          agentId: data.agentId,
          draft: data.draft,
          phase: data.phase,
        });

        setStep(data.step as PlaygroundStep);
      } catch (err) {
        console.error("[Playground] advanceBuilderStep FAILED:", err);
        setStep("welcome"); // Go back to start on failure
      }
    },
    builderData,
  };
}
