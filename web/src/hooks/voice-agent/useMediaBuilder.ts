"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
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
  | "builder-image-output"
  | "builder-video-confirm"
  | "builder-video-output"
  | "builder-script-confirm"
  | "builder-workflow-choice"
  | "builder-video-progress"
  | "builder-keyframes-confirm"
  | "builder-brand-dna"
  | "gallery";

export interface MediaUiPayload {
  step: MediaBuilderStep;
  question?: string;
  description?: string;
  options?: { id: string; label: string }[];
  images?: string[];
  video?: string;
  phase?: string;
  enable_upload?: boolean;
  blocks?: { label: string; value: string }[];
  status?: string;
  total_cost?: number;
  cost_breakdown?: any[];
  brand_dna?: any;
  progress?: number;
  history?: any[];
}

export function useMediaBuilder() {
  const [step, setStep] = useState<MediaBuilderStep>("welcome");
  const [sessionId, setSessionId] = useState<string>("");
  const [uiPayload, setUiPayload] = useState<MediaUiPayload | null>(null);
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [galleryImages, setGalleryImages] = useState<any[]>([]);
  const [galleryVideos, setGalleryVideos] = useState<any[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [isGalleryFullHistory, setIsGalleryFullHistory] = useState<boolean>(false);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);

  const holdAbortRef = useRef<AbortController | null>(null);
  const mageHoldAbortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>("");
  const wasInBrandDnaExtractionRef = useRef<boolean>(false);
  const isMageExtractionRef = useRef<boolean>(false);

  const workerUrl =
    process.env.NEXT_PUBLIC_PLAYGROUND_WORKER_URL || "http://localhost:8080";
  // NEXT_PUBLIC_* is inlined at BUILD time, so a deployed bundle carries
  // whatever was set when it was built. When that value is missing the old
  // fallback pointed a hosted page at the user's own machine, which produced a
  // stream of ERR_CONNECTION_REFUSED against localhost:8001. Only fall back to
  // localhost when we are actually on localhost; otherwise treat MAGe as
  // unconfigured and skip it, since these calls are best-effort anyway.
  const onLocalhost =
    typeof window !== "undefined" &&
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  const mageUrl =
    process.env.NEXT_PUBLIC_MAGE_API_URL || (onLocalhost ? "http://localhost:8001" : "");

  const getAuthHeaders = () => {
    const token = safeStorage.getItem("token");
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const establishHold = useCallback(
    async (id: string) => {
      try {
        console.warn(`[MediaBuilder] Establishing hold for ${id}...`);
        
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
          } catch {
            console.warn("[MediaBuilder] Worker status probe failed, retrying...");
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
      } catch (e: unknown) {
        console.error("Failed to hold worker:", e);
        const errMsg = e instanceof Error ? e.message : "Something went wrong, Mr.LAD will fix it! Please try again later.";
        throw new Error(errMsg);
      }
    },
    [workerUrl],
  );

  const establishMageHold = useCallback(
    async (id: string) => {
      if (!mageUrl) return;
      try {
        console.warn(`[MediaBuilder] Establishing hold for MAGe ${id}...`);
        
        const startTime = Date.now();
        const timeoutMs = 60000; // 1 minute
        let connected = false;
        
        while (Date.now() - startTime < timeoutMs) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const probe = await fetch(mageUrl, {
              method: "GET",
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            
            if (probe.ok) {
              connected = true;
              break;
            }
          } catch {
            console.warn("[MediaBuilder] MAGe status probe failed, retrying...");
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        
        if (!connected) {
          throw new Error("Failed to wake up MAGe Brand DNA extractor service.");
        }

        if (mageHoldAbortRef.current) mageHoldAbortRef.current.abort();
        const controller = new AbortController();
        mageHoldAbortRef.current = controller;

        fetch(`${mageUrl}/api/brand-profiler/hold`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_id: id }),
          signal: controller.signal,
        }).catch((e) => {
          if (e.name !== "AbortError") {
            console.error("MAGe hold request ended:", e);
          }
        });
      } catch (e: unknown) {
        console.error("Failed to hold MAGe worker:", e);
      }
    },
    [mageUrl],
  );

  const releaseMageHold = useCallback(
    async (id: string) => {
      if (!id || !mageUrl) return;
      if (mageHoldAbortRef.current) {
        mageHoldAbortRef.current.abort();
      }
      try {
        await fetch(`${mageUrl}/api/brand-profiler/release`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_id: id }),
        });
        console.warn(`[MediaBuilder] Released hold for MAGe ${id}`);
      } catch (e) {
        console.error("Failed to release MAGe worker:", e);
      }
    },
    [mageUrl],
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
        console.warn(`[MediaBuilder] Released hold for ${id}`);
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
    if (mageHoldAbortRef.current) {
      mageHoldAbortRef.current.abort();
    }
    const currentSessionId = sessionIdRef.current;
    if (currentSessionId) {
      await releaseHold(currentSessionId);
      await releaseMageHold(currentSessionId);
    }
  }, [releaseHold, releaseMageHold]);

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

  const fetchPastSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(`${workerUrl}/playground-media/sessions`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPastSessions(data.sessions || []);
      }
    } catch (e) {
      console.error("Failed to fetch past sessions:", e);
    } finally {
      setLoadingSessions(false);
    }
  }, [workerUrl]);

  const loadSession = useCallback(async (targetSessionId: string) => {
    setStep("loading");
    setError("");
    setSessionId(targetSessionId);
    sessionIdRef.current = targetSessionId;
    try {
      await establishHold(targetSessionId);
      
      const res = await fetch(`${workerUrl}/playground-media/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          session_id: targetSessionId,
          message: "",
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setUiPayload(data);
      setStep(data.step as MediaBuilderStep);
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to load session.");
      setStep("welcome");
    }
  }, [workerUrl, establishHold]);

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
      setUiPayload(data);
      setStep(data.step as MediaBuilderStep);
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to initialize Image Creation.");
      setStep("welcome");
    }
  }, [sessionId, workerUrl, establishHold]);

  const selectVideoGeneration = useCallback(async () => {
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
          message: "[START_VIDEO_GEN]",
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setUiPayload(data);
      setStep(data.step as MediaBuilderStep);
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to initialize Video Generation.");
      setStep("welcome");
    }
  }, [sessionId, workerUrl, establishHold]);

  // Polling effect for background video generation loop progress
  useEffect(() => {
    if (step !== "builder-video-progress" && !(step === "builder-keyframes-confirm" && uiPayload?.phase === "Storyboard Generation")) return;
    
    // Stop polling if the status is failed, completed, or cancelled
    if (uiPayload?.status === "completed" || uiPayload?.status === "failed" || uiPayload?.status === "cancelled") {
      return;
    }

    let active = true;
    const intervalId = setInterval(async () => {
      if (!active) return;
      
      try {
        const res = await fetch(`${workerUrl}/playground-media/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            session_id: sessionId,
            message: "", // Send empty message to poll status
          }),
        });

        if (res.ok && active) {
          const data = await res.json();
          setUiPayload(data);
          setStep(data.step as MediaBuilderStep);
        }
      } catch (err) {
        console.error("Error polling video progress:", err);
      }
    }, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [step, sessionId, workerUrl, uiPayload?.status, uiPayload?.phase]);

  // Set wasInBrandDnaExtractionRef when entering builder-video-progress step for MAGe
  useEffect(() => {
    if (step === "builder-video-progress" && isMageExtractionRef.current) {
      wasInBrandDnaExtractionRef.current = true;
    }
  }, [step]);

  // Auto-release MAGe hold if we transition away from the progress step
  useEffect(() => {
    if (step !== "builder-video-progress" && wasInBrandDnaExtractionRef.current) {
      wasInBrandDnaExtractionRef.current = false;
      isMageExtractionRef.current = false;
      releaseMageHold(sessionIdRef.current);
    }
  }, [step, releaseMageHold]);

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
      const newRef = {
        filename: data.filename,
        thumbnail: data.thumbnail,
        path: data.path,
      };
      setReferences((prev) => [
        ...prev,
        newRef,
      ]);
      return newRef;
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to upload image reference.");
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
    } catch (err) {
      const errorObj = err as Error;
      console.error("Failed to delete reference:", errorObj);
    }
  }, [sessionId, workerUrl]);

  const advanceStep = useCallback(async (userInput?: string | string[]) => {
    const isCurrentlyGenerating = step === "builder-text" && uiPayload?.phase === "Phase 2: Describe Image";
    const isCurrentlyOutputs = step === "builder-image-output";
    const isDialogueScriptInput = step === "builder-text" && uiPayload?.phase === "Phase 6: Script Input";

    if (isDialogueScriptInput) {
      setStep("builder-video-progress");
      setUiPayload(prev => prev ? {
        ...prev,
        step: "builder-video-progress",
        question: "Adding Dialogues to Video...",
        description: "Please wait while our managers sequence, generate, and overlay Cartesia voice actor dialogues onto the video.",
        blocks: [
          { label: "Analyzing script and video timeline...", value: "active" }
        ],
        status: "active"
      } : prev);
    } else if (isCurrentlyGenerating || isCurrentlyOutputs) {
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

    if (messageToSend === "Create new ICP profile") {
      if (typeof window !== "undefined") {
        window.location.href = window.location.origin + "/onboarding/advanced-search-ai?open_icp=true";
      }
      return;
    }

    if (messageToSend === "Analyze a new website") {
      try {
        await establishMageHold(sessionId);
        isMageExtractionRef.current = true;
      } catch (e) {
        console.error("Failed to establish MAGe hold:", e);
      }
    }

    if (references.length > 0) {
      if (!messageToSend || !messageToSend.trim()) {
        messageToSend = "Attached reference images:";
      }
      if (step === "builder-image-output") {
        messageToSend += ` from the generated image user selected the attachements for improvemnts`;
      } else {
        messageToSend += ` user has attached ${references.length} refrences with this request .`;
      }
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
      setUiPayload(data);
      setStep(data.step as MediaBuilderStep);
      
      // Clear references display once we transition past the reference guidance step
      setReferences([]);
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Request failed.");
      setStep("welcome");
    } finally {
      setGenerating(false);
    }
  }, [sessionId, step, uiPayload, workerUrl, references, establishMageHold]);

  const fetchGallery = useCallback(async (loadAll: boolean = false) => {
    setStep("gallery");
    setLoadingGallery(true);
    setError("");
    try {
      const url = loadAll
        ? `${workerUrl}/playground-media/gallery?max_age_days=`
        : `${workerUrl}/playground-media/gallery?max_age_days=90`;
      const res = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error(`Failed to load gallery with status ${res.status}`);
      }
      const data = await res.json();
      setGalleryImages(data.images || []);
      setGalleryVideos(data.videos || []);
      setIsGalleryFullHistory(loadAll);
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to retrieve media gallery.");
    } finally {
      setLoadingGallery(false);
    }
  }, [workerUrl]);

  const generateImagesFromGallery = useCallback(async (urls: string[]) => {
    setStep("loading");
    setError("");
    try {
      await establishHold(sessionId);
      
      const res = await fetch(`${workerUrl}/playground-media/select-gallery-references`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          session_id: sessionId,
          urls: urls,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setReferences(data.references || []);

      const chatRes = await fetch(`${workerUrl}/playground-media/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: "",
        }),
      });

      if (!chatRes.ok) {
        throw new Error(`Chat progression failed with status ${chatRes.status}`);
      }

      const chatData = await chatRes.json();
      setUiPayload(chatData);
      setStep(chatData.step as MediaBuilderStep);
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to start generation from gallery.");
      setStep("welcome");
    }
  }, [sessionId, workerUrl, establishHold]);

  const animateImageFromGallery = useCallback(async (url: string) => {
    setStep("loading");
    setError("");
    try {
      await establishHold(sessionId);
      
      const res = await fetch(`${workerUrl}/playground-media/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: `[ANIMATE_IMAGE] url=${url}`,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setUiPayload(data);
      setStep(data.step as MediaBuilderStep);
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to animate gallery image.");
      setStep("welcome");
    }
  }, [sessionId, workerUrl, establishHold]);

  const extendVideoFromGallery = useCallback(async (url: string) => {
    setStep("loading");
    setError("");
    try {
      await establishHold(sessionId);
      
      const res = await fetch(`${workerUrl}/playground-media/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: `[EXTEND_VIDEO] url=${url}`,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setUiPayload(data);
      setStep(data.step as MediaBuilderStep);
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to extend gallery video.");
      setStep("welcome");
    }
  }, [sessionId, workerUrl, establishHold]);

  const addDialoguesFromGallery = useCallback(async (url: string) => {
    setStep("loading");
    setError("");
    try {
      await establishHold(sessionId);
      
      const res = await fetch(`${workerUrl}/playground-media/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: `[ADD_DIALOGUES] url=${url}`,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      setUiPayload(data);
      setStep(data.step as MediaBuilderStep);
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to add dialogues to gallery video.");
      setStep("welcome");
    }
  }, [sessionId, workerUrl, establishHold]);

  const deleteAssets = useCallback(async (urls: string[]) => {
    setLoadingGallery(true);
    setError("");
    try {
      const res = await fetch(`${workerUrl}/playground-media/delete-assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          urls: urls,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to delete assets with status ${res.status}`);
      }

      await fetchGallery();
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to delete assets.");
      setLoadingGallery(false);
    }
  }, [workerUrl, fetchGallery]);

  const undoStep = useCallback(async () => {
    setStep("loading");
    setError("");
    try {
      await establishHold(sessionId);

      const res = await fetch(`${workerUrl}/playground-media/undo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Undo failed with status ${res.status}`);
      }

      const data = await res.json();
      setUiPayload(data);
      setStep(data.step as MediaBuilderStep);
    } catch (err) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to undo step.");
      if (uiPayload) {
        setStep(uiPayload.step);
      } else {
        setStep("welcome");
      }
    }
  }, [sessionId, workerUrl, establishHold, uiPayload]);

  return {
    step,
    setStep,
    sessionId,
    setSessionId,
    uiPayload,
    setUiPayload,
    references,
    isUploading,
    generating,
    error,
    setError,
    galleryImages,
    galleryVideos,
    loadingGallery,
    isGalleryFullHistory,
    pastSessions,
    loadingSessions,
    startFlow,
    selectImageCreation,
    selectVideoGeneration,
    uploadReference,
    removeReference,
    advanceStep,
    closeFlow,
    fetchGallery,
    generateImagesFromGallery,
    animateImageFromGallery,
    extendVideoFromGallery,
    addDialoguesFromGallery,
    deleteAssets,
    undoStep,
    fetchPastSessions,
    loadSession,
  };
}
