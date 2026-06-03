"use client";

import { useState, useCallback, useRef } from "react";
import { safeStorage } from "@lad/shared/storage";

export interface ReferenceImage {
  filename: string;
  thumbnail: string;
  path: string;
}

export type MediaBuilderStep =
  | "welcome"
  | "loading"
  | "builder-text"
  | "builder-mcq-few"
  | "builder-image-output";

export interface MediaUiPayload {
  step: MediaBuilderStep;
  question?: string;
  description?: string;
  options?: { id: string; label: string }[];
  images?: string[];
  phase?: string;
  enable_upload?: boolean;
}

export function useMediaBuilder() {
  const [step, setStep] = useState<MediaBuilderStep>("welcome");
  const [sessionId, setSessionId] = useState<string>("");
  const [uiPayload, setUiPayload] = useState<MediaUiPayload | null>(null);
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>("");

  const holdAbortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>("");

  const workerUrl =
    process.env.NEXT_PUBLIC_PLAYGROUND_WORKER_URL || "http://localhost:8080";

  const getAuthHeaders = () => {
    const token = safeStorage.getItem("token");
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const establishHold = useCallback(
    async (id: string) => {
      try {
        console.log(`[MediaBuilder] Establishing hold for ${id}...`);
        
        const startTime = Date.now();
        const timeoutMs = 60000; // 1 minute
        let connected = false;
        
        while (Date.now() - startTime < timeoutMs) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const probe = await fetch(`${workerUrl}/worker-status`, {
              method: "GET",
              headers: getAuthHeaders(),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            
            if (probe.ok) {
              connected = true;
              break;
            }
          } catch (e) {
            console.log("[MediaBuilder] Worker status probe failed, retrying...");
          }
          // Wait 2 seconds before retrying
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        
        if (!connected) {
          throw new Error("Something went wrong, Mr.LAD will fix it! Please try again later.");
        }

        if (holdAbortRef.current) holdAbortRef.current.abort();
        const controller = new AbortController();
        holdAbortRef.current = controller;

        // Fire-and-forget: /hold-for-call is long-polling (blocks up to 600s).
        fetch(`${workerUrl}/hold-for-call`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ call_id: id }),
          signal: controller.signal,
        }).catch((e) => {
          if (e.name !== "AbortError") {
            console.error("Hold request ended:", e);
          }
        });
      } catch (e: any) {
        console.error("Failed to hold worker:", e);
        throw new Error(e.message || "Something went wrong, Mr.LAD will fix it! Please try again later.");
      }
    },
    [workerUrl],
  );

  const releaseHold = useCallback(
    async (id: string) => {
      if (!id) return;
      try {
        await fetch(`${workerUrl}/release-call`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ call_id: id }),
        });
        console.log(`[MediaBuilder] Released hold for ${id}`);
      } catch (e) {
        console.error("Failed to release worker:", e);
      }
    },
    [workerUrl],
  );

  const closeFlow = useCallback(async () => {
    if (holdAbortRef.current) {
      holdAbortRef.current.abort();
    }
    const currentSessionId = sessionIdRef.current;
    if (currentSessionId) {
      await releaseHold(currentSessionId);
    }
  }, [releaseHold]);

  const startFlow = useCallback(() => {
    const newSessionId = `media-${Math.random().toString(36).substring(2, 9)}`;
    setSessionId(newSessionId);
    sessionIdRef.current = newSessionId;
    setStep("welcome");
    setUiPayload(null);
    setReferences([]);
    setError("");
    setGenerating(false);
    setIsUploading(false);
  }, []);

  const selectImageCreation = useCallback(async () => {
    setStep("loading");
    setError("");
    try {
      // Establish worker connection hold
      await establishHold(sessionId);

      const res = await fetch(`${workerUrl}/playground-media/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setUiPayload({
        step: data.step,
        question: data.question,
        description: data.description,
        options: data.options,
        images: data.images,
        phase: data.phase,
        enable_upload: data.enable_upload,
      });
      setStep(data.step as MediaBuilderStep);
    } catch (err: any) {
      setError(err.message || "Failed to initialize Image Creation.");
      setStep("welcome");
    }
  }, [sessionId, workerUrl]);

  const uploadReference = useCallback(async (file: File) => {
    if (references.length >= 5) {
      setError("Maximum of 5 reference images allowed.");
      return;
    }
    
    setIsUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("file", file);

    try {
      const res = await fetch(`${workerUrl}/playground-media/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Upload failed.");
      }

      const data = await res.json();
      setReferences((prev) => [
        ...prev,
        {
          filename: data.filename,
          thumbnail: data.thumbnail,
          path: data.path,
        },
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to upload image reference.");
    } finally {
      setIsUploading(false);
    }
  }, [references, sessionId, workerUrl]);

  const removeReference = useCallback(async (path: string) => {
    setError("");
    try {
      const res = await fetch(`${workerUrl}/playground-media/remove-reference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          session_id: sessionId,
          path: path,
        }),
      });

      if (res.ok) {
        setReferences((prev) => prev.filter((r) => r.path !== path));
      }
    } catch (err: any) {
      console.error("Failed to delete reference:", err);
    }
  }, [sessionId, workerUrl]);

  const advanceStep = useCallback(async (userInput?: string | string[]) => {
    const isCurrentlyGenerating = step === "builder-text" && uiPayload?.phase === "Phase 2: Describe Image";
    const isCurrentlyOutputs = step === "builder-image-output";

    if (isCurrentlyGenerating || isCurrentlyOutputs) {
      setGenerating(true);
    } else {
      setStep("loading");
    }
    
    setError("");

    let messageToSend = "";
    if (typeof userInput === "string") {
      messageToSend = userInput;
    } else if (Array.isArray(userInput)) {
      messageToSend = userInput.join(", ");
    }

    try {
      const res = await fetch(`${workerUrl}/playground-media/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: messageToSend,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setUiPayload({
        step: data.step,
        question: data.question,
        description: data.description,
        options: data.options,
        images: data.images,
        phase: data.phase,
        enable_upload: data.enable_upload,
      });
      setStep(data.step as MediaBuilderStep);
      
      // Clear references display once we transition past the reference guidance step
      setReferences([]);
    } catch (err: any) {
      setError(err.message || "Request failed.");
      setStep("welcome");
    } finally {
      setGenerating(false);
    }
  }, [sessionId, step, uiPayload, workerUrl]);

  return {
    step,
    setStep,
    sessionId,
    uiPayload,
    references,
    isUploading,
    generating,
    error,
    setError,
    startFlow,
    selectImageCreation,
    uploadReference,
    removeReference,
    advanceStep,
    closeFlow,
  };
}
