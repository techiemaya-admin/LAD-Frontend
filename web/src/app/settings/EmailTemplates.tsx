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
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export interface Template {
  id: string;
  template_name: string;
  created_at: string;
  html?: string;
  design?: any;
  is_default?: boolean;
  subject_line: string;
  placeholders?: string[];
}

export interface Placeholder {
  id: string;
  placeholder_key: string;
  description: string;
  data_source_path: string;
  is_loop: boolean;
}

interface EmailTemplatesProps {
  templates: Template[];
  onUpload: (template_name: string, subjectLine: string, isDefault: boolean, file: File) => Promise<void>;
  onDelete: (id: string) => void;
  onPreview: (template: Template) => void;
  onSetDefault: (id: string) => void;
  placeholderList: Placeholder[];
}

export const EmailTemplates: React.FC<EmailTemplatesProps> = ({
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
  const [uploadedHtml, setUploadedHtml] = useState('');
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [templateSubject, setTemplateSubject] = useState('Quotation from [company_name]');
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
      await onUpload(templateName, templateSubject, isDefault, pendingFile);
      setTemplateSubject('Quotation from [company_name]');
      setIsUploadModalOpen(false);
      setTemplateName('');
      setIsDefault(false);
      setPendingFile(null);
      setUploadedHtml('');
      setDetectedTags([]);
    } catch (error: any) {
      console.error('Email template upload error:', error);
      toast.error(error.message || 'Failed to upload email template');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setTemplateSubject('Quotation from [company_name]');
    setTemplateName('');
    setIsDefault(false);
    setPendingFile(null);
    setUploadedHtml('');
    setDetectedTags([]);
  };

  const handleOpenPlaceholderDetails = () => {
    setIsPlaceholderModalOpen(true);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-8 pb-6 flex items-center justify-between bg-white border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Email Templates</h2>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Manage your communication layouts</p>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={handleOpenPlaceholderDetails}
            className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-2 transition-colors border-b-2 border-transparent hover:border-blue-200 pb-1"
          >
            <Tag className="w-3.5 h-3.5" /> View Placeholder Guide
          </button>
          <button
            onClick={() => {
              setIsUploadModalOpen(true);
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-3 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Upload template
          </button>
        </div>
      </div>

      <div className="p-8">
        <div className="space-y-6">
          {templates.map((template) => (
            <div key={template.id} className="p-6 bg-white border border-slate-200 rounded-3xl group transition-all hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-black text-slate-800">{template.template_name}</h3>
                    {template.is_default && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-lg">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium mb-4">
                    {template.template_name.toLowerCase().replace(/\s+/g, '-')}.html • HTML • Uploaded {format(new Date(template.created_at), 'MMM d, yyyy')}
                  </p>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <p className="text-xs font-bold text-slate-500 italic">Subject: {template.subject_line}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(template.placeholders || []).map((tag) => (
                      <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-full">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onPreview(template)}
                    className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all"
                  >
                    Preview
                  </button>
                  {!template.is_default && (
                    <button
                      onClick={() => onDelete(template.id)}
                      className="px-6 py-2.5 bg-white border border-slate-200 text-red-600 rounded-xl font-bold text-xs hover:bg-red-50 hover:border-red-200 transition-all"
                    >
                      Delete
                    </button>
                  )}
                  {!template.is_default && (
                    <button
                      onClick={() => onSetDefault(template.id)}
                      className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all"
                    >
                      Set default
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="py-20 border-2 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 opacity-20" />
              </div>
              <p className="font-bold text-sm">No templates uploaded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Upload Email Template</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Add a new email layout</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto max-h-[70vh]">
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-blue-50/50 rounded-[40px] border-2 border-dashed border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50 transition-all pointer-events-none" />
                    <div className="relative py-16 flex flex-col items-center justify-center cursor-pointer">
                      <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        {isUploading ? (
                          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : pendingFile ? (
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        ) : (
                          <Upload className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-slate-800 mb-1">
                          {isUploading ? 'Preparing to save...' : pendingFile ? 'File selected!' : <><span className="text-blue-600">Click to upload</span> or drag & drop</>}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {pendingFile ? pendingFile.name : 'DOCX • Max 10MB'}
                        </p>
                      </div>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={isUploading}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Template name</label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g. Welcome Email v1"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Subject Line</label>
                      <input
                        type="text"
                        value={templateSubject}
                        onChange={(e) => setTemplateSubject(e.target.value)}
                        placeholder="Quotation for {{service_name}} - {{company_name}}"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer group p-2">
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                        isDefault ? "bg-blue-600 border-blue-600" : "border-slate-200 group-hover:border-blue-400"
                      )}>
                        {isDefault && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isDefault}
                        onChange={() => setIsDefault(!isDefault)}
                      />
                      <span className="text-sm font-bold text-slate-600">Set as default email template</span>
                    </label>
                  </div>

                  <button
                    onClick={handleSaveTemplate}
                    disabled={isUploading}
                    className={cn(
                      "w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95",
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <Tag className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Email Placeholder Dictionary</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Available tags for your emails</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPlaceholderModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                {isLoadingPlaceholders ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading definitions...</p>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-3xl overflow-hidden">
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
                )}
                <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 italic text-xs text-slate-500">
                  <p className="flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-blue-500" />
                    Email placeholders must be wrapped in square brackets (e.g., [key]) to be detected correctly.
                  </p>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end">
                <button
                  onClick={() => setIsPlaceholderModalOpen(false)}
                  className="px-8 py-3 bg-white border border-slate-200 text-slate-800 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
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
