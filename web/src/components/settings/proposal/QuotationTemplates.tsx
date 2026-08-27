'use client';

import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowRight,
  X,
  Tag,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getApiBaseUrlForLocal } from '@/lib/api-utils';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { QuotationTemplate, Placeholder, QuotationTemplatesProps } from './types';

export const QuotationTemplates: React.FC<QuotationTemplatesProps> = ({
  templates,
  placeholderList,
  tenantId,
  onRefresh,
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPlaceholderModalOpen, setIsPlaceholderModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Preview Modal state
  const [previewQuotationUrl, setPreviewQuotationUrl] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isDocx =
        file.name.toLowerCase().endsWith('.docx') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (!isDocx) {
        toast.error('Only .docx files are allowed');
        e.target.value = '';
        setPendingFile(null);
        return;
      }

      setPendingFile(file);
      toast.success(`File "${file.name}" selected`);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName) {
      toast.error('Please enter a template name');
      return;
    }
    if (!pendingFile) {
      toast.error('Please select a template file first');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('template_name', templateName);
      formData.append('is_default', String(isDefault));
      formData.append('file', pendingFile);

      const response = await fetchWithTenant(
        `${getApiBaseUrlForLocal()}/api/quotation-templates/upload/${tenantId}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        toast.success('Quotation template uploaded and saved');
        setIsUploadModalOpen(false);
        setTemplateName('');
        setIsDefault(false);
        setPendingFile(null);
        onRefresh();
      } else {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Failed to upload Quotation template');
      }
    } catch (error: any) {
      console.error('Template upload error:', error);
      toast.error(error.message || 'Failed to upload template');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setTemplateName('');
    setIsDefault(false);
    setPendingFile(null);
  };

  const handlePreview = async (template: QuotationTemplate) => {
    try {
      const response = await fetchWithTenant(
        `${getApiBaseUrlForLocal()}/api/quotation-templates/${template.id}/preview`
      );
      if (!response.ok) throw new Error('Failed to fetch Quotation preview');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setPreviewQuotationUrl(url);
      setIsPreviewModalOpen(true);
    } catch (error) {
      toast.error('Visual preview failed to load for quotation');
      console.error(error);
    }
  };

  const closePreview = () => {
    if (previewQuotationUrl) window.URL.revokeObjectURL(previewQuotationUrl);
    setPreviewQuotationUrl(null);
    setIsPreviewModalOpen(false);
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetchWithTenant(
        `${getApiBaseUrlForLocal()}/api/quotation-templates/${tenantId}/set-default/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_default: true }),
        }
      );
      if (res.ok) {
        toast.success('Default quotation template updated');
        onRefresh();
      } else {
        toast.error('Failed to set default template');
      }
    } catch (error) {
      console.error('Set default quotation template failed:', error);
      toast.error('Failed to set default template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quotation template?')) return;
    try {
      const res = await fetchWithTenant(`${getApiBaseUrlForLocal()}/api/quotation-templates/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Quotation template deleted');
        onRefresh();
      } else {
        toast.error('Failed to delete quotation template');
      }
    } catch (error) {
      console.error('Delete quotation template failed:', error);
      toast.error('Failed to delete quotation template');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-3xl shadow-sm border border-slate-200 dark:border-gray-800 overflow-hidden">
      <div className="p-4 sm:p-8 pb-4 sm:pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 border-b border-slate-100 dark:border-gray-800">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-gray-100">
            Quotation Templates
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-400 dark:text-gray-400 font-bold mt-0.5 sm:mt-1 uppercase tracking-widest">
            Manage your document templates
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <button
            onClick={() => setIsPlaceholderModalOpen(true)}
            className="text-[10px] sm:text-xs font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-2 transition-colors border-b-2 border-transparent hover:border-blue-200 pb-1"
          >
            <Tag className="w-3.5 h-3.5" /> View Placeholder Guide
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Upload template
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8">
        <div className="space-y-4 sm:space-y-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="p-4 sm:p-6 bg-white dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 rounded-2xl sm:rounded-3xl group transition-all hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-gray-100 truncate">
                      {template.name}
                    </h3>
                    {template.is_default && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[8px] sm:text-[10px] font-black uppercase rounded-lg shrink-0">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400 dark:text-gray-400 font-medium mb-3 sm:mb-4">
                    • DOCX • Uploaded {format(new Date(template.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handlePreview(template)}
                    className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 rounded-xl font-bold text-[10px] sm:text-xs hover:bg-slate-50 dark:hover:bg-gray-700 transition-all"
                  >
                    Preview
                  </button>
                  {!template.is_default && (
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-red-600 dark:text-red-400 rounded-xl font-bold text-[10px] sm:text-xs hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 transition-all"
                    >
                      Delete
                    </button>
                  )}
                  {!template.is_default && (
                    <button
                      onClick={() => handleSetDefault(template.id)}
                      className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 rounded-xl font-bold text-[10px] sm:text-xs hover:bg-slate-50 dark:hover:bg-gray-700 transition-all"
                    >
                      Set default
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="py-12 sm:py-20 border-2 border-dashed border-slate-100 dark:border-gray-800 rounded-[30px] sm:rounded-[40px] flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 text-center px-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 opacity-20" />
              </div>
              <p className="font-bold text-xs sm:text-sm">No templates uploaded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Visual Preview Modal */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[90vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl z-10"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
                <h2 className="font-bold text-slate-800 dark:text-gray-100 text-lg">
                  Quotation Template Preview
                </h2>
                <button
                  onClick={closePreview}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="flex-1 bg-slate-100 dark:bg-gray-950 p-4">
                {previewQuotationUrl && (
                  <iframe
                    src={`${previewQuotationUrl}#toolbar=0&navpanes=0`}
                    className="w-full h-full rounded-xl border-none shadow-lg"
                    title="Visual Preview"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] z-10"
            >
              <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-xl font-black text-slate-800 dark:text-gray-100 truncate">
                      Upload Template
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-400 font-bold uppercase tracking-widest truncate">
                      Add a new quotation layout
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-gray-100 transition-colors shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="p-4 sm:p-8 overflow-y-auto">
                <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl sm:rounded-[40px] border-2 border-dashed border-slate-200 dark:border-gray-700 group-hover:border-blue-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 transition-all pointer-events-none" />
                    <div className="relative py-10 sm:py-16 flex flex-col items-center justify-center cursor-pointer text-center px-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                        {isUploading ? (
                          <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : pendingFile ? (
                          <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                        ) : (
                          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-gray-100 mb-1">
                          {isUploading ? (
                            'Preparing to save...'
                          ) : pendingFile ? (
                            'File selected!'
                          ) : (
                            <>
                              <span className="text-blue-600 dark:text-blue-400">Click to upload</span> or drag & drop
                            </>
                          )}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-400 font-bold uppercase tracking-widest truncate max-w-[200px] sm:max-w-none">
                          {pendingFile ? pendingFile.name : 'DOCX • Max 10MB'}
                        </p>
                      </div>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        disabled={isUploading}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-widest ml-1">
                        Template name
                      </label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g. Corporate Quotation v2"
                        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 dark:text-gray-100 placeholder:text-slate-300 text-xs sm:text-sm"
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer group p-1 sm:p-2">
                      <div
                        className={cn(
                          'w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 transition-all flex items-center justify-center shrink-0',
                          isDefault ? 'bg-blue-600 border-blue-600' : 'border-slate-200 dark:border-gray-700 group-hover:border-blue-400'
                        )}
                      >
                        {isDefault && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isDefault}
                        onChange={() => setIsDefault(!isDefault)}
                      />
                      <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-gray-300">
                        Set as default template for this tenant
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={handleSaveTemplate}
                    disabled={isUploading}
                    className={cn(
                      'w-full py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95',
                      isUploading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    Save template <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Placeholder Details Modal */}
      <AnimatePresence>
        {isPlaceholderModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPlaceholderModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10"
            >
              <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Tag className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-xl font-black text-slate-800 dark:text-gray-100 truncate">
                      Placeholder Dictionary
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-400 font-bold uppercase tracking-widest line-clamp-1">
                      Available tags for your templates
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPlaceholderModalOpen(false)}
                  className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-gray-100 transition-colors shrink-0"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="p-4 sm:p-8 overflow-y-auto">
                {/* Desktop View */}
                <div className="hidden md:block border border-slate-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-gray-800/60 border-b border-slate-100 dark:border-gray-800">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Tag / Key
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Type
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                      {placeholderList.map((ph) => (
                        <tr key={ph.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <code className="text-[11px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                              [{ph.placeholder_key}]
                            </code>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-gray-400">
                            {ph.is_loop ? (
                              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                List/Table
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                Text Value
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 dark:text-gray-400 font-medium leading-relaxed max-w-xs">
                            {ph.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {placeholderList.map((ph) => (
                    <div
                      key={ph.id}
                      className="p-4 bg-slate-50 dark:bg-gray-800/60 rounded-xl border border-slate-100 dark:border-gray-700 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                          [{ph.placeholder_key}]
                        </code>
                        {ph.is_loop ? (
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase rounded-lg">
                            List
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase rounded-lg">
                            Text
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-gray-400 font-medium leading-relaxed">
                        {ph.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-slate-50 dark:bg-gray-800/50 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-gray-700 italic text-[10px] sm:text-xs text-slate-500 dark:text-gray-400">
                  <p className="flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-blue-500 dark:text-blue-400" />
                    Placeholders must be wrapped in square brackets (e.g., [key]) in DOCX templates to be detected correctly.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-8 border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/50 shrink-0 flex justify-end">
                <button
                  onClick={() => setIsPlaceholderModalOpen(false)}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-800 dark:text-gray-200 rounded-xl sm:rounded-2xl font-black text-xs hover:bg-slate-50 dark:hover:bg-gray-700 transition-all active:scale-95 shadow-sm"
                >
                  Close Dictionary
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
