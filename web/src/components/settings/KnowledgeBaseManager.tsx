"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, BookOpen, FileText, Plus, Trash2, Upload, Loader2, Sparkles, Folder, CheckCircle, MessageSquare, Send } from "lucide-react";
import { useKnowledgeBase, PlaygroundStore, PlaygroundDocument } from "@/hooks/voice-agent/useKnowledgeBase";
import ReactMarkdown from "react-markdown";

import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Label } from "@/components/ui/label";

interface KnowledgeBaseManagerProps {
  tenantId?: string;
  userId?: string;
}

export default function KnowledgeBaseManager({ tenantId, userId }: KnowledgeBaseManagerProps) {
  const { user } = useAuth();
  const { tenantId: contextTenantId } = useTenant();
  const effectiveTenantId = tenantId || contextTenantId || (user as any)?.tenantId || "";
  const effectiveUserId = userId || (user as any)?.uid || (user as any)?.id || "";
  const rag = useKnowledgeBase(effectiveTenantId, effectiveUserId);
  
  // State for Create Store
  const [showCreateStore, setShowCreateStore] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreDesc, setNewStoreDesc] = useState("");
  const [creatingStore, setCreatingStore] = useState(false);

  // State for Store Details
  const [selectedStore, setSelectedStore] = useState<PlaygroundStore | null>(null);
  const [documents, setDocuments] = useState<PlaygroundDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  
  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Chat Widget State
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "bot"; content: string; sources?: string[] }[]>([]);

  // WhatsApp grounding toggle: when ON, the tenant's default KB stores are
  // attached to every WABA inbound message as Gemini file_search grounding.
  // The flag lives in chat_settings.metadata.kb_grounding_enabled (per-tenant).
  const [waGroundingEnabled, setWaGroundingEnabled] = useState(false);
  const [waGroundingLoading, setWaGroundingLoading] = useState(true);
  const [waGroundingSaving, setWaGroundingSaving] = useState(false);

  useEffect(() => {
    if (effectiveTenantId) {
      rag.fetchStores();
    }
  }, [effectiveTenantId, rag.fetchStores]);

  // Load the WABA grounding toggle from chat_settings.metadata
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/whatsapp-conversations/chat-settings?channel=waba");
        if (!res.ok) return;
        const data = await res.json();
        const settings = data.data ?? data.settings ?? data ?? {};
        const metadata = settings.metadata ?? {};
        if (!cancelled) {
          setWaGroundingEnabled(Boolean(metadata.kb_grounding_enabled));
        }
      } catch {
        /* default to OFF on failure */
      } finally {
        if (!cancelled) setWaGroundingLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleToggleWaGrounding = async (enabled: boolean) => {
    // Optimistic update
    setWaGroundingEnabled(enabled);
    setWaGroundingSaving(true);
    try {
      const res = await fetch("/api/whatsapp-conversations/chat-settings/kb-grounding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        // Revert on failure
        setWaGroundingEnabled(!enabled);
      }
    } catch {
      setWaGroundingEnabled(!enabled);
    } finally {
      setWaGroundingSaving(false);
    }
  };

  // Load documents when a store is selected
  useEffect(() => {
    if (selectedStore) {
      loadDocuments(selectedStore.gemini_store_name);
    }
  }, [selectedStore]);

  const loadDocuments = async (storeName: string) => {
    setLoadingDocs(true);
    const docs = await rag.fetchDocuments(storeName);
    setDocuments(docs);
    setLoadingDocs(false);
  };

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return;
    setCreatingStore(true);
    const ok = await rag.createStore(newStoreName.trim(), newStoreDesc.trim());
    if (ok) {
      setShowCreateStore(false);
      setNewStoreName("");
      setNewStoreDesc("");
    }
    setCreatingStore(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedStore) return;
    
    // Quick size validation
    if (file.size > 100 * 1024 * 1024) {
      rag.setError("File is too large (max 100MB)");
      return;
    }

    setUploading(true);
    rag.setError("");
    try {
      await rag.uploadDocument(selectedStore.gemini_store_name, file);
      await loadDocuments(selectedStore.gemini_store_name);
      // Refresh stores list to update document count
      await rag.fetchStores();
    } catch (err: any) {
      rag.setError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedStore || isChatting) return;

    const query = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: query }]);
    setIsChatting(true);

    try {
      const response = await rag.testChat(selectedStore.gemini_store_name, query);
      setChatMessages((prev) => [
        ...prev,
        { role: "bot", content: response.answer, sources: response.sources },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: "bot", content: `Error: ${err.message}` },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const renderContent = () => {
  // --- Render Store List View ---
  if (!rag.isAwake && !rag.wakeError) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[300px] text-slate-500">
        <Loader2 className="size-8 animate-spin text-purple-400 mb-4" />
        <p className="text-sm font-medium animate-pulse">Waking up worker environment...</p>
        <p className="text-xs mt-2 text-slate-400 max-w-[250px] text-center">This may take a few seconds if the service is starting up.</p>
      </div>
    );
  }

  if (rag.wakeError) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[300px] text-red-600 bg-red-50 border border-red-100 rounded-xl p-6">
        <h3 className="font-bold mb-2">Worker Initialization Failed</h3>
        <p className="text-sm">{rag.wakeError}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!selectedStore) {
    return (
      <div className="relative flex flex-col w-full max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
        {rag.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {rag.error}
          </div>
        )}

        <div className="flex-1 w-full">
          {showCreateStore ? (
            <div className="p-5 border border-purple-100 bg-purple-50/30 rounded-xl space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-purple-900">Create New Folder</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Folder Name (e.g., Company Handbook)"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Description (Optional)"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  value={newStoreDesc}
                  onChange={(e) => setNewStoreDesc(e.target.value)}
                />
                <div className="pt-2">
                  <Button
                    className="w-full bg-[#0B1957] hover:bg-[#0B1957]/90 text-white rounded-xl"
                    onClick={handleCreateStore}
                    disabled={!newStoreName.trim() || creatingStore}
                  >
                    {creatingStore ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Create Folder
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {rag.loadingStores && !showCreateStore ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-purple-400" />
            </div>
          ) : rag.stores.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <Folder className="size-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-semibold text-slate-700">No Folders Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Create a knowledge base folder to upload documents. These documents will be used as context for your AI agent.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {rag.stores.map((store) => (
                <div
                  key={store.id}
                  className={`group relative flex items-center justify-between p-4 border rounded-xl transition-all cursor-pointer ${
                    store.is_default
                      ? "border-purple-200 bg-purple-50/30"
                      : "border-slate-200 hover:border-purple-300 hover:shadow-md"
                  }`}
                  onClick={(e) => {
                    // Prevent navigation if clicking the switch or delete button
                    if ((e.target as HTMLElement).closest("button")) return;
                    setSelectedStore(store);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${store.is_default ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500 group-hover:bg-purple-50 group-hover:text-purple-500"}`}>
                      <Folder className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{store.display_name}</h3>
                      <p className="text-xs text-slate-500">
                        {store.document_count} {store.document_count === 1 ? "document" : "documents"}
                        {store.description && <span className="hidden sm:inline"> • {store.description}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pl-4 border-l border-slate-100">
                    <div className="flex flex-col items-center gap-1">
                      <Label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider cursor-pointer">
                        {store.is_default ? "Attached" : "Attach"}
                      </Label>
                      <Switch
                        checked={store.is_default}
                        onCheckedChange={async (checked) => {
                          const originalStores = [...rag.stores];
                          // Optimistic update
                          rag.stores.find((s) => s.id === store.id)!.is_default = checked;
                          const ok = await rag.updateStoreSettings(store.gemini_store_name, checked);
                          if (!ok) {
                            // Revert on failure
                            rag.fetchStores();
                          }
                        }}
                        className={store.is_default ? "bg-purple-600" : ""}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 -mr-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete folder "${store.display_name}"?`)) {
                          rag.deleteStore(store.gemini_store_name);
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Render Store Detail / Document Upload View ---
  return (
    <div className="relative flex flex-col w-full max-h-[600px] overflow-y-auto pr-1 custom-scrollbar animate-in slide-in-from-right-8 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center">
          <button
            onClick={() => {
              setSelectedStore(null);
              setShowChat(false);
            }}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors mr-3"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h3 className="text-md font-bold text-gray-900">{selectedStore.display_name}</h3>
            <p className="text-xs text-slate-500">Manage documents for this folder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showChat ? "default" : "outline"}
            size="sm"
            className={showChat ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-purple-700 border-purple-200 hover:bg-purple-50"}
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="size-4 mr-1.5" />
            {showChat ? "Back to Docs" : "Test Chat"}
          </Button>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {documents.length} docs
          </span>
        </div>
      </div>

      {rag.error && !showChat && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {rag.error}
        </div>
      )}

      {showChat ? (
        <div className="flex flex-col flex-1 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Sparkles className="size-8 mb-2 opacity-50" />
                <p className="text-sm">Ask a question to test this Knowledge Base</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col w-fit max-w-[85%] ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-br-sm text-right"
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm"
                    }`}
                  >
                    {msg.role === "bot" ? (
                      <ReactMarkdown
                        components={{
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-2 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-2 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="pl-1" {...props} />,
                          h1: ({node, ...props}) => <h1 className="font-bold text-lg mb-2 mt-4 first:mt-0 text-slate-900" {...props} />,
                          h2: ({node, ...props}) => <h2 className="font-bold text-base mb-2 mt-4 first:mt-0 text-slate-900" {...props} />,
                          h3: ({node, ...props}) => <h3 className="font-semibold text-base mb-2 mt-3 first:mt-0 text-slate-900" {...props} />,
                          a: ({node, ...props}) => <a className="text-purple-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                          code: ({node, className, ...props}) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-slate-100 text-purple-700 px-1 py-0.5 rounded text-xs font-mono" {...props} />
                            ) : (
                              <div className="bg-slate-800 rounded-md my-2 overflow-hidden">
                                <div className="px-3 py-1 bg-slate-900 text-slate-400 text-[10px] font-mono uppercase tracking-wider">{className?.replace('language-', '') || 'Code'}</div>
                                <div className="p-3 overflow-x-auto"><code className="text-slate-50 text-xs font-mono" {...props} /></div>
                              </div>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "bot" && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1 px-1 text-[10px] text-slate-400 flex flex-wrap gap-1">
                      <span className="font-semibold uppercase tracking-wider mr-1">Sources:</span>
                      {msg.sources.map((s, i) => (
                        <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {isChatting && (
              <div className="flex max-w-[85%] mr-auto">
                <div className="px-4 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-bl-sm shadow-sm text-sm flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Thinking...
                </div>
              </div>
            )}
          </div>
          <div className="p-3 bg-white border-t border-slate-200">
            <form onSubmit={handleChatSubmit} className="flex gap-2 relative">
              <input
                type="text"
                placeholder="Type a message to test RAG retrieval..."
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatting}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!chatInput.trim() || isChatting}
                className="rounded-full bg-purple-600 hover:bg-purple-700 text-white shrink-0 absolute right-1 top-1 h-8 w-8"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full space-y-6">
          {/* Upload Area */}
          <div 
            className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all ${
              dragActive ? "border-purple-500 bg-purple-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.md,.csv,.docx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <div className="p-3 bg-white shadow-sm rounded-full mb-3 text-purple-600">
              {uploading ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <Upload className="size-6" />
              )}
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {uploading ? "Uploading document..." : "Click or drag file to upload"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports PDF, TXT, MD, CSV, DOCX (Max 100MB)
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 bg-white"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Select File
            </Button>
          </div>

          {/* Document List */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 px-1">Uploaded Documents</h3>
            {loadingDocs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-slate-300" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm border border-slate-100 rounded-xl">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {documents.map((doc) => (
                  <div key={doc.name} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="size-4 text-slate-400 flex-shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-medium text-slate-700 truncate">{doc.display_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {doc.state === "ACTIVE" ? (
                            <span className="text-green-600 flex items-center gap-1"><CheckCircle className="size-3"/> Active</span>
                          ) : (
                            doc.state || "Processing..."
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                      onClick={async () => {
                        if (confirm(`Delete document "${doc.display_name}"?`)) {
                          await rag.deleteDocument(selectedStore.gemini_store_name, doc.name);
                          loadDocuments(selectedStore.gemini_store_name);
                          rag.fetchStores();
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
  };

  return (
    <div className="flex flex-col w-full">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Knowledge Base</h2>
          </div>
          <p className="text-sm text-gray-500">
            This content is injected into all AI conversations as context. Add company info, FAQs, product details, etc.
          </p>
        </div>
        {!selectedStore && !showCreateStore && rag.isAwake && !rag.wakeError && (
          <Button
            variant="outline"
            size="sm"
            className="text-purple-700 border-purple-200 hover:bg-purple-50"
            onClick={() => setShowCreateStore(true)}
          >
            <Plus className="size-4 mr-1" />
            New Folder
          </Button>
        )}
      </div>

      {/* WhatsApp grounding toggle — gates whether Knowledge Base folders
          flagged "Attached" are passed to the WABA AI as Gemini file_search
          sources at reply time. Only takes effect on tenants using a Gemini
          model in their WABA chat settings. */}
      <div className="px-6 py-4 border-b border-gray-100 bg-purple-50/40 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <MessageSquare className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-medium text-gray-900">Use Knowledge Base in WhatsApp replies</p>
          </div>
          <p className="text-xs text-gray-500">
            When ON, every inbound WhatsApp message is answered using content from the
            folders flagged <span className="font-medium">Attached</span> below.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          {waGroundingSaving && <Loader2 className="size-3.5 animate-spin text-purple-400" />}
          <Switch
            checked={waGroundingEnabled}
            disabled={waGroundingLoading || waGroundingSaving}
            onCheckedChange={handleToggleWaGrounding}
            className={waGroundingEnabled ? "bg-purple-600" : ""}
          />
        </div>
      </div>

      <div className="p-6">
        {renderContent()}
      </div>
    </div>
  );
}
