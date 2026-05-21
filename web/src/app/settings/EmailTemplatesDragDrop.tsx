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
import { Link } from 'react-router-dom';

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
  // Added to match SettingsPage.tsx props
  onSaveDesign?: (name: string, subject: string, isDefault: boolean, design: any, html: string, id?: string) => Promise<void>;
  onPreview?: (template: Template) => void;
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
      setAiSuggestions(resp.suggestions || []);
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
        const body = JSON.stringify({
          ...suggestion,
          tenant_id: tenantId,
        });
        await fetch(`${getApiBaseUrlForLocal()}/api/quotation-email-template/${tenantId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: body,
        });
      }
      toast.success(`Successfully added ${toAdd.length} templates`);
      setAiSuggestions(null);
      setSelectedSuggestions([]);
      onUpload(tenantId);
    } catch (error) {
      toast.error('Failed to save some templates');
    }
  };

  return (
      <div className="relative">
        <div className="p-4 sm:p-8 pb-4 sm:pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-b border-slate-100">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">Email Templates</h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Manage your communication layouts</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6">
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleOpenAiModal}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl sm:rounded-full font-semibold text-xs sm:text-sm hover:bg-black transition-colors flex items-center justify-center gap-3 active:scale-95 shadow-sm"
            >
              <Brain className="w-4 h-4" /> Ask AI
            </motion.button>
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsFlowOpen(true)}
                className="px-6 py-3 bg-[#0A053F] text-white rounded-xl sm:rounded-full font-black text-xs sm:text-sm shadow-[0_20px_40px_-10px_rgba(10,5,63,0.3)] flex items-center justify-center gap-3 group"
            >
              <div className="w-5 h-5 rounded-full border-2 border-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                <Plus className="w-4 h-4" />
              </div>
              Create Template
            </motion.button>
          </div>
        </div>

        <div className="p-4 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template: any) => (
                <div
                    key={template.id}
                    className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group flex flex-col"
                >
                  <div className="relative h-20 sm:h-24 bg-gradient-to-r from-[#0b1957] via-[#162a6e] to-[#1e3a8a] overflow-hidden">
                    <div className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-white/[0.07]" />
                    <div className="absolute -bottom-2 -left-2 w-10 h-10 rounded-full bg-white/[0.05]" />
                    <div className="absolute left-4 top-3 bottom-3 right-12 rounded-lg bg-white/[0.12] border border-white/[0.15] px-3 py-2.5 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/60" />
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                        <div className="ml-2 h-1 rounded-sm bg-white/20 flex-1" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-1 rounded-sm bg-white/20 w-3/4" />
                        <div className="h-1 rounded-sm bg-white/12 w-full" />
                        <div className="h-1 rounded-sm bg-white/8 w-[60%]" />
                      </div>
                    </div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-white/70" />
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <h3 className="font-bold text-[#1E293B] truncate text-sm sm:text-base">{template.name}</h3>
                    <p className="text-[10px] sm:text-xs text-[#64748B] mt-1 line-clamp-1">
                      {template.subject_line || 'No subject'}
                    </p>
                  </div>

                  <div className="px-5 py-4 border-t border-slate-50 mt-auto flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-3 sm:gap-4">
                      {template.is_default ? (
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> DEFAULT
                    </span>
                      ) : (
                          <button
                              onClick={() => onSetDefault(template.id)}
                              className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
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
                          setIsFlowOpen(true);
                          setEditingTemplate(template);
                        }}
                        className="flex items-center gap-2 text-slate-800 hover:text-blue-600 font-bold text-[10px] sm:text-xs transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </div>
            ))}
          </div>
        </div>


        {/* Ask AI Email Modal */}
        <AnimatePresence>
          {isAiModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-2xl sm:rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
                >
                  <div className="p-5 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-800 text-base sm:text-xl tracking-tight truncate">AI Email Architect</h3>
                        <p className="text-[8px] sm:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] truncate">Crafting elite communication templates</p>
                      </div>
                    </div>
                    <button
                        onClick={() => setIsAiModalOpen(false)}
                        className="p-1.5 sm:p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors shrink-0"
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-[#FDFDFF]">
                    {isAiGenerating ? (
                        <div className="flex flex-col items-center justify-center h-60 sm:h-80 text-slate-400 gap-6">
                          <div className="relative">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 border-[4px] sm:border-[6px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-lg shadow-indigo-500/10"></div>
                            <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          </div>
                          <div className="text-center px-4">
                            <p className="font-black text-slate-800 text-base sm:text-lg mb-1 animate-pulse">Designing Sophisticated Templates</p>
                            <p className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">Synthesizing requirements, concepts, and pricing rules...</p>
                          </div>
                        </div>
                    ) : aiSuggestions ? (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between px-2">
                            <p className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
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
                                className="text-[9px] sm:text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest bg-indigo-50 px-2 sm:px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {selectedSuggestions.length === aiSuggestions.length ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                                        "group relative p-5 sm:p-8 rounded-2xl sm:rounded-[32px] border-2 transition-all cursor-pointer bg-white flex flex-col",
                                        selectedSuggestions.includes(idx)
                                            ? "border-indigo-600 shadow-2xl shadow-indigo-500/10 ring-4 ring-indigo-50"
                                            : "border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/50"
                                    )}
                                >
                                  <div className="flex items-start justify-between mb-4 sm:mb-6">
                                    <div className="space-y-1.5 sm:space-y-2 flex-1 mr-3 sm:mr-4 overflow-hidden">
                                      <div className="flex items-center gap-2">
                                <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
                                  {suggestion.category}
                                </span>
                                      </div>
                                      <h4 className="font-black text-slate-900 text-sm sm:text-lg leading-tight tracking-tight group-hover:text-indigo-600 transition-colors truncate">
                                        {suggestion.name}
                                      </h4>
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="shrink-0 text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest border border-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">Subject</span>
                                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate">
                                  {suggestion.subject}
                                </span>
                                      </div>
                                    </div>
                                    <div className={cn(
                                        "w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition-all shrink-0",
                                        selectedSuggestions.includes(idx)
                                            ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-500/30"
                                            : "border-slate-100 bg-slate-50 text-transparent"
                                    )}>
                                      <Check className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white stroke-[3px]" />
                                    </div>
                                  </div>

                                  <div className="relative flex-1">
                                    <div className="p-3 sm:p-5 bg-slate-50/50 rounded-xl sm:rounded-2xl border border-slate-100/50 italic text-[10px] sm:text-[11px] leading-relaxed text-slate-400 font-medium line-clamp-4 group-hover:line-clamp-none transition-all duration-500">
                                      {suggestion.body_text}
                                    </div>
                                  </div>


                                  {selectedSuggestions.includes(idx) && (
                                      <div className="mt-3 sm:mt-4 flex items-center gap-2 text-indigo-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                                        <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Selected
                                      </div>
                                  )}
                                </motion.div>
                            ))}
                          </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-60 sm:h-80 text-slate-300 gap-4">
                          <Brain className="w-12 h-12 sm:w-16 sm:h-16 opacity-10" />
                          <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] sm:text-xs">Awaiting Architecture Selection</p>
                        </div>
                    )}
                  </div>

                  <div className="p-5 sm:p-8 bg-white border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                    <div className="flex w-full sm:w-auto gap-4">
                      <button
                          onClick={() => setIsAiModalOpen(false)}
                          className="flex-1 sm:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                      <button
                          onClick={handleAddSuggestions}
                          disabled={selectedSuggestions.length === 0 || isAiGenerating}
                          className="flex-[2] sm:flex-none min-w-[140px] sm:min-w-[200px] px-6 py-3 bg-indigo-600 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 disabled:opacity-50 disabled:grayscale active:scale-95 flex items-center justify-center gap-3"
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


        <AnimatePresence>
          {isFlowOpen && (
              <div className="fixed inset-0 z-[110] flex justify-center items-start overflow-y-auto p-0 sm:p-4 md:p-8">
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
                    className="relative w-full max-w-[95vw] bg-white rounded-none sm:rounded-3xl md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col min-h-screen sm:min-h-0"
                >
                  <div className="absolute top-4 right-4 sm:right-6 z-[120]">
                    <button
                        onClick={() => setIsFlowOpen(false)}
                        className="p-2 bg-slate-100/80 backdrop-blur-sm hover:bg-slate-200 rounded-full text-slate-500 transition-colors shadow-sm"
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <QuotationEmailTemplateEditor
                        mode={editingTemplate ? 'edit' : 'create'}
                        tenantId={tenantId}
                        placeholders={placeholders}
                        initialTemplate={editingTemplate || undefined}
                        onCancel={() => {
                          setIsFlowOpen(false);
                          setEditingTemplate(null);
                        }}
                        onSuccess={() => {
                          setIsFlowOpen(false);
                          setEditingTemplate(null);
                          if (onUpload) onUpload(tenantId);
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