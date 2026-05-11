import React, { useState } from 'react';
import {
  Mail,
  Plus,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Eye,
  ArrowRight,
  X,
  Settings,
  Tag,
  Info,
  Edit2,
  MoreVertical,
  LayoutTemplate, Pencil, FileText, MessageSquare, RefreshCw, Clock, XCircle, Image, FileIcon, Video,
  Brain,
  Loader2,
  Sparkles,
  Check
} from 'lucide-react';
import Link from 'next/link';

import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { CreateEmailTemplateFlow } from './CreateEmailTemplateFlow';
import { useRouter } from 'next/navigation';
import QuotationEmailTemplateEditor, { Template } from './QuotationEmailTemplateEditor';
import { getApiBaseUrlForLocal } from '@/lib/api-utils';


interface EmailTemplatesDragDropProps {
  templates: Template[];
  tenantId: string,
  placeholders: Placeholder[],
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onUpload: (tenantId: string) => void;
}

export interface Placeholder {
  id: string;
  placeholder_key: string;
  description: string;
  data_source_path: string;
  is_loop: boolean;
  display_name: string;
}

export const EmailTemplatesDragDrop: React.FC<EmailTemplatesDragDropProps> = ({
  templates,
  tenantId,
  placeholders,
  onDelete,
  onSetDefault,
  onUpload
}) => {
  const router = useRouter();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPlaceholderModalOpen, setIsPlaceholderModalOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('Quotation for {{service_name}} - {{company_name}}');
  const [isDefault, setIsDefault] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);

  const handleOpenAiModal = () => {
    setIsAiModalOpen(true);
    handleAskAi();
  };

  const handleAskAi = async () => {
    setIsAiGenerating(true);
    setAiSuggestions(null);
    setSelectedSuggestions([]);
    try {
      const suggestions = await fetch(`${getApiBaseUrlForLocal()}/api/ai-response/suggest-email-templates/${tenantId}`);
      const resp = await suggestions.json();
      console.log("concept sugges>> ")
      console.log(resp);
      console.log("Setting suggestions:", resp.suggestions)
      setAiSuggestions(resp.suggestions);
      setSelectedSuggestions([]);
    } catch (error) {
      toast.error('Failed to generate email suggestions');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAddSuggestions = async () => {
    if (!aiSuggestions) return;

    const toAdd = aiSuggestions.filter((_, i) => selectedSuggestions.includes(i));

    try {
      for (const suggestion of toAdd) {
        // FIX: You were calling 'onSave' which doesn't exist in props.
        // You should call an actual API endpoint or a passed-down handler.
        console.log("suggestion>> " + JSON.stringify(suggestion))
        const body = JSON.stringify({
          ...suggestion,
          tenant_id: tenantId,
        });
        console.log(body)
        await fetch(`${getApiBaseUrlForLocal()}/api/quotation-email-template/${tenantId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: body,
        });
      }
      toast.success(`Successfully added ${toAdd.length} concepts`);
      setAiSuggestions(null);
      setSelectedSuggestions([]);
      // Refresh the list after adding
      onUpload(tenantId);
    } catch (error) {
      toast.error('Failed to save some concepts');
    }
  };

  // const handleSave = async (andRedirect = true) => {
  //   try {
  //     const url = mode === 'create' ? `${getApiBaseUrlForLocal()}/api/quotation-email-template/${tenantId}` : `${getApiBaseUrlForLocal()}/api/quotation-email-template/${tenantId}/id/${template.id}`;
  //     const method = mode === 'create' ? 'POST' : 'PUT';
  //     const body = JSON.stringify({
  //       name: template.name,
  //       subject: template.subject,
  //       body_text: isHtmlMode
  //         ? (template.body_text || (template.body_html || '').replace(/<[^>]*>/g, '').trim())
  //         : template.body_text,
  //       body_html: isHtmlMode ? (template.body_html || null) : null,
  //       content_format: isHtmlMode ? 'html' : 'plain_text',
  //       description: template.description,
  //       is_default: template.is_default,
  //       media_url: template.media_url || null,
  //       media_alt_text: template.media_alt_text || null,
  //     });
  //     console.log("emaile template body : " + body)
  //     const res = await fetch(url, {
  //       method,
  //       headers: { 'Content-Type': 'application/json' },
  //       credentials: 'include',
  //       body: body,
  //     });

  //     if (!res.ok) {
  //       const errData = await res.json().catch(() => ({}));
  //       throw new Error(errData.error || errData.details || `${res.status} ${res.statusText}`);
  //     } else {
  //       onSuccess(); // This triggers the modal close and the fetch call in the parent
  //     }

  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'Unknown error occurred');
  //   } finally {
  //     setSaving(false);
  //   }
  // };

  return (
    <div className="relative">
      <div className="p-4 pb-3 flex items-center justify-between bg-white border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Email Templates</h2>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Manage your communication layouts</p>
        </div>
        <div className="flex items-center gap-6">
          <motion.button

            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenAiModal}
            className="px-4 py-4 bg-slate-900 text-white rounded-full font-semibold text-xl hover:bg-black transition-colors flex items-center gap-4 active:scale-95 shadow-sm"
          >
            <Brain className="w-4 h-4" /> Ask AI
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFlowOpen(true)}
            className="px-4 py-4 bg-[#0A053F] text-white rounded-full font-black text-xl shadow-[0_20px_40px_-10px_rgba(10,5,63,0.3)] flex items-center gap-4 group"
          >
            <div className="w-4 h-4 rounded-full border-4 border-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
              <Plus className="w-5 h-5" />
            </div>
            Create Template
          </motion.button>

        </div>
      </div>

      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template: any) => (
            <div
              key={template.id}
              className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
            >
              {/* Compact rich gradient header */}
              <div className="relative h-16 bg-gradient-to-r from-[#0b1957] via-[#162a6e] to-[#1e3a8a] overflow-hidden">
                <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-white/[0.07]" />
                <div className="absolute -bottom-2 -left-2 w-10 h-10 rounded-full bg-white/[0.05]" />
                <div className="absolute left-3 top-2.5 bottom-2.5 right-10 rounded-md bg-white/[0.12] border border-white/[0.15] px-2.5 py-2 flex flex-col justify-center">
                  <div className="flex items-center gap-1 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/60" />
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                    <div className="ml-1 h-1 rounded-sm bg-white/20 flex-1" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-1 rounded-sm bg-white/20 w-3/4" />
                    <div className="h-1 rounded-sm bg-white/12 w-full" />
                    <div className="h-1 rounded-sm bg-white/8 w-[60%]" />
                  </div>
                </div>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 text-white/70" />
                </div>
              </div>

              <div className="px-4 py-3">
                <h3 className="font-bold text-[#1E293B] truncate text-sm">{template.name}</h3>
                <p className="text-xs text-[#64748B] mt-0.5 line-clamp-1">
                  {template.subject || 'No subject'}
                </p>
              </div>

              <div className="p-8 pt-0 border-t border-slate-50 mt-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {template.is_default ? (
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                      ● DEFAULT
                    </span>
                  ) : (
                    <button
                      onClick={() => onSetDefault(template.id)}
                      className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-blue-600 transition-colors"
                    >
                      Set Default
                    </button>
                  )}

                  {!template.is_default && (
                    <button
                      onClick={() => onDelete(template.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsFlowOpen(true); // Close Create flow
                    setEditingTemplate(template); // Clear Edit state if applicable
                  }}
                  className="flex items-center gap-2 text-slate-800 hover:text-blue-600 font-bold text-xs transition-colors"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Ask AI Email Modal */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-xl tracking-tight">AI Email Architect</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Crafting elite communication templates</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* {aiSuggestions && !isAiGenerating && (
                    <button
                      onClick={handleAskAi}
                      className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold text-xs transition-all active:scale-95"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                  )} */}
                  <button
                    onClick={() => setIsAiModalOpen(false)}
                    className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#FDFDFF]">
                {isAiGenerating ? (
                  <div className="flex flex-col items-center justify-center h-80 text-slate-400 gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 border-[6px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-lg shadow-indigo-500/10"></div>
                      <Brain className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-slate-800 text-lg mb-1 animate-pulse">Designing Sophisticated Templates</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">Synthesizing requirements, concepts, and pricing rules...</p>
                    </div>
                  </div>
                ) : aiSuggestions ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {aiSuggestions.length} Curated Blueprints
                      </p>
                      <button
                        onClick={() => {
                          if (selectedSuggestions.length === aiSuggestions.length) {
                            setSelectedSuggestions([]);
                          } else {
                            setSelectedSuggestions(aiSuggestions.map((_, i) => i));
                          }
                        }}
                        className="text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {selectedSuggestions.length === aiSuggestions.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {aiSuggestions.map((suggestion, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => {
                            if (selectedSuggestions.includes(idx)) {
                              setSelectedSuggestions(selectedSuggestions.filter(s => s !== idx));
                            } else {
                              setSelectedSuggestions([...selectedSuggestions, idx]);
                            }
                          }}
                          className={cn(
                            "group relative p-8 rounded-[32px] border-2 transition-all cursor-pointer bg-white flex flex-col",
                            selectedSuggestions.includes(idx)
                              ? "border-indigo-600 shadow-2xl shadow-indigo-500/10 ring-4 ring-indigo-50"
                              : "border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/50"
                          )}
                        >
                          <div className="flex items-start justify-between mb-6">
                            <div className="space-y-2 flex-1 mr-4">
                              <div className="flex items-center gap-2">
                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                                  {suggestion.category}
                                </span>
                              </div>
                              <h4 className="font-black text-slate-900 text-lg leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">
                                {suggestion.name}
                              </h4>
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="shrink-0 text-[9px] font-black text-slate-300 uppercase tracking-widest border border-slate-100 px-1.5 py-0.5 rounded">Subject</span>
                                <span className="text-[11px] font-bold text-slate-500 leading-relaxed">
                                  {suggestion.subject}
                                </span>
                              </div>
                            </div>
                            <div className={cn(
                              "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0",
                              selectedSuggestions.includes(idx)
                                ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-500/30"
                                : "border-slate-100 bg-slate-50 text-transparent"
                            )}>
                              <Check className="w-5 h-5 text-white stroke-[3px]" />
                            </div>
                          </div>

                          <div className="relative flex-1">
                            <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white opacity-0 group-hover:opacity-10 pointer-events-none" />
                            <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/50 italic text-[11px] leading-relaxed text-slate-400 font-medium line-clamp-4 group-hover:line-clamp-none transition-all duration-500">
                              {suggestion.body_text}
                            </div>
                          </div>


                          {selectedSuggestions.includes(idx) && (
                            <div className="mt-4 flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                              <CheckCircle2 className="w-3 h-3" /> Selected for Import
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-slate-300 gap-4">
                    <Brain className="w-16 h-16 opacity-10" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Awaiting Architecture Selection</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-white border-t border-slate-50 flex items-center justify-between shrink-0">
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSuggestions}
                    disabled={selectedSuggestions.length === 0 || isAiGenerating}
                    className="min-w-[200px] px-4 py-2 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 disabled:opacity-50 disabled:grayscale active:scale-95 flex items-center justify-center gap-3"
                  >
                    {isAiGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Commit {selectedSuggestions.length} Blueprints</>
                    )}
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}



      <AnimatePresence>
        {isFlowOpen && (
          <div className="fixed inset-0 z-[110] flex justify-center items-start overflow-y-auto p-0 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFlowOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-[95vw] bg-white rounded-none md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header with Close Button */}
              <div className="absolute top-4 right-6 z-[120]">
                <button
                  onClick={() => setIsFlowOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* The Editor Component */}
              <div className="flex-1 overflow-hidden">
                <QuotationEmailTemplateEditor
                  mode={editingTemplate ? 'edit' : 'create'}
                  tenantId={tenantId}
                  placeholders={placeholders}
                  initialTemplate={editingTemplate || undefined}
                  onCancel={() => {
                    setIsFlowOpen(false); // Close Create flow
                    setEditingTemplate(null); // Clear Edit state if applicable
                  }}
                  onSuccess={() => {
                    setIsFlowOpen(false); // Close the modal
                    setEditingTemplate(null); // Clear editing state
                    // Check which prop is being used for fetching in your parent
                    if (onUpload) onUpload(tenantId);
                    // or if you want to be explicit, pass fetchEmailTemplates as a prop to this component
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
