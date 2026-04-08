"use client";

import { useEffect, useState, useRef, useCallback } from "react";

/* ──────────────────────────────────────────────────────────────────
   CONSTANTS
   ────────────────────────────────────────────────────────────────── */

const HOLD_TIMEOUT_MS = 45 * 60 * 1000; // 45 min session limit

/** Minutes remaining from a starting timestamp */
function minsLeft(startMs: number): number {
  const elapsed = Date.now() - startMs;
  return Math.max(0, Math.ceil((HOLD_TIMEOUT_MS - elapsed) / 60000));
}

/* ──────────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────────── */

export interface AgentOption {
  id: number;
  name: string;
  description: string;
}

export type PlaygroundStep = "welcome" | "config" | "coming-soon";

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
  /* Step tracking */
  const [step, setStep] = useState<PlaygroundStep>("welcome");

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
  const [timerDisplay, setTimerDisplay] = useState("");

  /* Refs for timers */
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const forceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const holdAbortRef = useRef<AbortController | null>(null);

  const generateCallId = () =>
    `play-${Math.random().toString(36).substring(2, 9)}`;

  /* ────────────────── HOLD LIFECYCLE ────────────────── */

  const clearAllTimers = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (forceTimerRef.current) clearTimeout(forceTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  const releaseHold = useCallback(
    async (id: string) => {
      if (!id) return;
      try {
        await fetch(`${workerUrl}/release-call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ call_id: id }),
        });
        console.log(`[Playground] Released hold for ${id}`);
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

      /* 45-min expiration — release and close */
      forceTimerRef.current = setTimeout(async () => {
        await releaseHold(currentId);
        if (onClose) onClose();
      }, HOLD_TIMEOUT_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clearAllTimers, onClose, releaseHold],
  );

  const establishHold = useCallback(
    async (id: string) => {
      try {
        console.log(`[Playground] Establishing hold for ${id}...`);
        const probe = await fetch(`${workerUrl}/worker-status`, {
          method: "GET",
        });
        if (!probe.ok) throw new Error("Worker not reachable");

        if (holdAbortRef.current) holdAbortRef.current.abort();
        const controller = new AbortController();
        holdAbortRef.current = controller;

        // Fire-and-forget: /hold-for-call is long-polling (blocks up to 600s).
        fetch(`${workerUrl}/hold-for-call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    console.log(
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok)
        throw new Error(`Agent list failed with status: ${resp.status}`);
      const data = await resp.json();
      console.log(
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

  /* Auto-release when leaving test screens */
  useEffect(() => {
    const isAtTestArea = step === "config" || !!sessionToken;
    if (!isAtTestArea && callIdRef.current) {
      releaseHold(callIdRef.current);
      setCallId("");
      setIsHolding(false);
      clearAllTimers();
    }
  }, [step, sessionToken, releaseHold, clearAllTimers]);

  /* ────────────────── STEP TRANSITIONS ────────────────── */

  const startTesting = useCallback(() => {
    setStep("config");
    if (!isHolding && !reloading) {
      const id = generateCallId();
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
    console.log(
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
        headers: { "Content-Type": "application/json" },
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
  };
}
