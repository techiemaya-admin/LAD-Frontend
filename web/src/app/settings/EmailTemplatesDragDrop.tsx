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
  LayoutTemplate, Pencil, FileText, MessageSquare, RefreshCw, Clock, XCircle, Image, FileIcon, Video
} from 'lucide-react';
import Link from 'next/link';

import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { CreateEmailTemplateFlow } from './CreateEmailTemplateFlow';
import { useRouter } from 'next/navigation';
import QuotationEmailTemplateEditor, { Template } from './QuotationEmailTemplateEditor';


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
