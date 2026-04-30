"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const workerUrl = process.env.NEXT_PUBLIC_PLAYGROUND_WORKER_URL || "";
const isWorkerConfigured = workerUrl.startsWith("https://");

export interface PlaygroundStore {
  id: string;
  tenant_id: string | null;
  gemini_store_name: string;
  display_name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  priority: number;
  document_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface PlaygroundDocument {
  name: string;
  display_name: string;
  state: string | null;
}

export function useKnowledgeBase(tenantId: string = "", userId: string = "") {
  const [stores, setStores] = useState<PlaygroundStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [error, setError] = useState("");
  const [isAwake, setIsAwake] = useState(false);
  const [wakeError, setWakeError] = useState("");
  const sessionId = useRef("");

  useEffect(() => {
    if (!isWorkerConfigured) return;

    if (!sessionId.current) {
      sessionId.current = crypto.randomUUID();
    }
    let active = true;

    const wakeWorker = async () => {
      try {
        const res = await fetch(`${workerUrl}/worker-status`);
        if (!res.ok) throw new Error("Worker not reachable");

        // Start hold
        fetch(`${workerUrl}/hold-for-call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ call_id: sessionId.current })
        }).catch(e => {
            // Ignore abort or network errors from the long-polling hold
        });

        if (active) setIsAwake(true);
      } catch (e: any) {
        if (active) setWakeError(e.message || "Failed to wake worker.");
      }
    };

    wakeWorker();

    return () => {
      active = false;
      if (sessionId.current) {
        fetch(`${workerUrl}/release-call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ call_id: sessionId.current }),
          keepalive: true
        }).catch(() => {
          // Ignore network errors on unmount
        });
      }
    };
  }, []);

  const fetchStores = useCallback(async () => {
    if (!tenantId) return;
    setLoadingStores(true);
    setError("");
    try {
      const res = await fetch(`${workerUrl}/playground-rag/stores/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, user_id: userId }),
      });
      if (!res.ok) throw new Error("Failed to fetch stores");
      const data = await res.json();
      setStores(data);
    } catch (err: any) {
      setError(err.message || "An error occurred fetching stores.");
    } finally {
      setLoadingStores(false);
    }
  }, [tenantId, userId]);

  const createStore = async (displayName: string, description?: string) => {
    try {
      if (!tenantId) {
        throw new Error("You must select an active organization/tenant to create a knowledge base.");
      }
      const res = await fetch(`${workerUrl}/playground-rag/stores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId,
          display_name: displayName,
          description: description || "",
          is_default: false,
        }),
      });
      if (!res.ok) throw new Error("Failed to create store");
      await fetchStores();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const deleteStore = async (storeName: string) => {
    if (!tenantId) throw new Error("Missing tenantId");
    try {
      const geminiId = storeName.replace("fileSearchStores/", "");
      const res = await fetch(`${workerUrl}/playground-rag/stores/${geminiId}?tenant_id=${tenantId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete store");
      await fetchStores();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const updateStoreSettings = async (storeName: string, isDefault: boolean) => {
    if (!tenantId) throw new Error("Missing tenantId");
    try {
      const geminiId = storeName.replace("fileSearchStores/", "");
      const res = await fetch(`${workerUrl}/playground-rag/stores/${geminiId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId,
          is_default: isDefault,
        }),
      });
      if (!res.ok) throw new Error("Failed to update store settings");
      await fetchStores();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const uploadDocument = async (storeName: string, file: File, displayName?: string) => {
    if (!tenantId) throw new Error("Missing tenantId");
    try {
      const geminiId = storeName.replace("fileSearchStores/", "");
      const formData = new FormData();
      formData.append("tenant_id", tenantId);
      formData.append("file", file);
      if (displayName) formData.append("display_name", displayName);

      const res = await fetch(`${workerUrl}/playground-rag/stores/${geminiId}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.detail || "Failed to upload document");
      }
      return true;
    } catch (err: any) {
      throw err; // Allow UI to handle specific upload errors
    }
  };

  const fetchDocuments = async (storeName: string): Promise<PlaygroundDocument[]> => {
    if (!tenantId) return [];
    try {
      const geminiId = storeName.replace("fileSearchStores/", "");
      const res = await fetch(`${workerUrl}/playground-rag/stores/${geminiId}/documents?tenant_id=${tenantId}`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return await res.json();
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  };

  const deleteDocument = async (storeName: string, documentId: string) => {
    if (!tenantId) throw new Error("Missing tenantId");
    try {
      const storeGeminiId = storeName.replace("fileSearchStores/", "");
      const docGeminiId = documentId.replace(`${storeName}/documents/`, "");
      const res = await fetch(
        `${workerUrl}/playground-rag/stores/${storeGeminiId}/documents/${docGeminiId}?tenant_id=${tenantId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete document");
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const testChat = async (storeName: string, question: string) => {
    if (!tenantId) throw new Error("Missing tenantId");
    const storeGeminiId = storeName.replace("fileSearchStores/", "");
    const res = await fetch(`${workerUrl}/playground-rag/stores/${storeGeminiId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        question: question,
      }),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to get chat response");
    }
    return await res.json();
  };

  return {
    stores,
    loadingStores,
    error,
    setError,
    isAwake,
    wakeError,
    fetchStores,
    createStore,
    deleteStore,
    updateStoreSettings,
    uploadDocument,
    fetchDocuments,
    deleteDocument,
    testChat,
  };
}
