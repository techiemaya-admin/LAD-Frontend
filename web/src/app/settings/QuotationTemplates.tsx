import React, { useState } from 'react';
import {
  FileText,
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
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface Template {
  id: string;
  name: string;
  created_at: string;
  html?: string;
  design?: any;
  is_default?: boolean;
  placeholders?: string[];
}


export interface Placeholder {
  id: string;
  placeholder_key: string;
  description: string;
  data_source_path: string;
  is_loop: boolean;
}

interface QuotationTemplatesProps {
  templates: Template[];
  onUpload: (name: string, isDefault: boolean, file: File) => Promise<void>;
  onDelete: (id: string) => void;
  onPreview: (template: Template) => void;
  onSetDefault: (id: string) => void;
  placeholderList: Placeholder[];
}

export const QuotationTemplates: React.FC<QuotationTemplatesProps> = ({
  templates,
  onUpload,
  onDelete,
  onPreview,
  onSetDefault,
  placeholderList
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPlaceholderModalOpen, setIsPlaceholderModalOpen] = useState(false);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [isLoadingPlaceholders, setIsLoadingPlaceholders] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [detectedTags, setDetectedTags] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check extension or MIME type
      const isDocx = file.name.toLowerCase().endsWith('.docx') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (!isDocx) {
        toast.error('Only .docx files are allowed');
        // Reset the input value so the same invalid file can't be "re-selected"
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
      await onUpload(templateName, isDefault, pendingFile);
      setIsUploadModalOpen(false);
      setTemplateName('');
      setIsDefault(false);
      setPendingFile(null);
      setDetectedTags([]);
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
    setDetectedTags([]);
  };

  const handleOpenPlaceholderDetails = () => {
    setIsPlaceholderModalOpen(true);
  };

  return (
      <div className="bg-white rounded-xl sm:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-8 pb-4 sm:pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-b border-slate-100">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-800">Quotation Templates</h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-0.5 sm:mt-1 uppercase tracking-widest">Manage your document templates</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <button
                onClick={handleOpenPlaceholderDetails}
                className="text-[10px] sm:text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-2 transition-colors border-b-2 border-transparent hover:border-blue-200 pb-1"
            >
              <Tag className="w-3.5 h-3.5" /> View Placeholder Guide
            </button>
            <button
                onClick={() => {
                  setIsUploadModalOpen(true);
                }}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Upload template
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-8">
          <div className="space-y-4 sm:space-y-6">
            {templates.map((template) => (
                <div key={template.id} className="p-4 sm:p-6 bg-white border border-slate-200 rounded-2xl sm:rounded-3xl group transition-all hover:border-blue-200 hover:shadow-md">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base sm:text-lg font-black text-slate-800 truncate">{template.name}</h3>
                        {template.is_default && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[8px] sm:text-[10px] font-black uppercase rounded-lg shrink-0">Default</span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-400 font-medium mb-3 sm:mb-4">
                        • DOCX • Uploaded {format(new Date(template.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
                      <button
                          onClick={() => onPreview(template)}
                          className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-[10px] sm:text-xs hover:bg-slate-50 transition-all"
                      >
                        Preview
                      </button>
                      {!template.is_default && (
                          <button
                              onClick={() => onDelete(template.id)}
                              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-white border border-slate-200 text-red-600 rounded-xl font-bold text-[10px] sm:text-xs hover:bg-red-50 hover:border-red-200 transition-all"
                          >
                            Delete
                          </button>
                      )}
                      {!template.is_default && (
                          <button
                              onClick={() => onSetDefault(template.id)}
                              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-[10px] sm:text-xs hover:bg-slate-50 transition-all"
                          >
                            Set default
                          </button>
                      )}
                    </div>
                  </div>
                </div>
            ))}
            {templates.length === 0 && (
                <div className="py-12 sm:py-20 border-2 border-dashed border-slate-100 rounded-[30px] sm:rounded-[40px] flex flex-col items-center justify-center text-slate-400 text-center px-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 sm:w-8 sm:h-8 opacity-20" />
                  </div>
                  <p className="font-bold text-xs sm:text-sm">No templates uploaded yet</p>
                </div>
            )}
          </div>
        </div>

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
                    className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
                >
                  <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                        <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-xl font-black text-slate-800 truncate">Upload Template</h3>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Add a new quotation layout</p>
                      </div>
                    </div>
                    <button
                        onClick={handleCloseModal}
                        className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors shrink-0"
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>

                  <div className="p-4 sm:p-8 overflow-y-auto">
                    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-blue-50/50 rounded-2xl sm:rounded-[40px] border-2 border-dashed border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50 transition-all pointer-events-none" />
                        <div className="relative py-10 sm:py-16 flex flex-col items-center justify-center cursor-pointer text-center px-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-2xl sm:rounded-3xl shadow-sm flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                            {isUploading ? (
                                <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            ) : pendingFile ? (
                                <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                            ) : (
                                <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" />
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-xs sm:text-sm font-black text-slate-800 mb-1">
                              {isUploading ? 'Preparing to save...' : pendingFile ? 'File selected!' : <><span className="text-blue-600">Click to upload</span> or drag & drop</>}
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[200px] sm:max-w-none">
                              {pendingFile ? pendingFile.name : ' DOCX • Max 10MB'}
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
                          <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Template name</label>
                          <input
                              type="text"
                              value={templateName}
                              onChange={(e) => setTemplateName(e.target.value)}
                              placeholder="e.g. Corporate Quotation v2"
                              className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 text-xs sm:text-sm"
                          />
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer group p-1 sm:p-2">
                          <div className={cn(
                              "w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 transition-all flex items-center justify-center shrink-0",
                              isDefault ? "bg-blue-600 border-blue-600" : "border-slate-200 group-hover:border-blue-400"
                          )}>
                            {isDefault && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />}
                          </div>
                          <input
                              type="checkbox"
                              className="hidden"
                              checked={isDefault}
                              onChange={() => setIsDefault(!isDefault)}
                          />
                          <span className="text-xs sm:text-sm font-bold text-slate-600">Set as default template for this tenant</span>
                        </label>
                      </div>

                      <button
                          onClick={handleSaveTemplate}
                          disabled={isUploading}
                          className={cn(
                              "w-full py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95",
                              isUploading && "opacity-50 cursor-not-allowed"
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
                    className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
                >
                  <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                        <Tag className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-xl font-black text-slate-800 truncate">Placeholder Dictionary</h3>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest line-clamp-1">Available tags for your templates</p>
                      </div>
                    </div>
                    <button
                        onClick={() => setIsPlaceholderModalOpen(false)}
                        className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors shrink-0"
                    >
                      <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>

                  <div className="p-4 sm:p-8 overflow-y-auto">
                    {/* Desktop View */}
                    <div className="hidden md:block border border-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tag / Key</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                        {placeholderList.map((ph) => (
                            <tr key={ph.id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <code className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                  [{ph.placeholder_key}]
                                </code>
                              </td>
                              <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                {ph.is_loop ? (
                                    <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                List/Table
                              </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                Text Value
                              </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-400 font-medium leading-relaxed max-w-xs">{ph.description}</td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-3">
                      {placeholderList.map((ph) => (
                          <div key={ph.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <code className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                                [{ph.placeholder_key}]
                              </code>
                              {ph.is_loop ? (
                                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black uppercase rounded-lg">List</span>
                              ) : (
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase rounded-lg">Text</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{ph.description}</p>
                          </div>
                      ))}
                    </div>

                    <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-100 italic text-[10px] sm:text-xs text-slate-500">
                      <p className="flex gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-blue-500" />
                        Placeholders must be wrapped in square brackets (e.g., [key]) DOCX, or PDF templates to be detected correctly.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-8 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end">
                    <button
                        onClick={() => setIsPlaceholderModalOpen(false)}
                        className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-white border border-slate-200 text-slate-800 rounded-xl sm:rounded-2xl font-black text-xs hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
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