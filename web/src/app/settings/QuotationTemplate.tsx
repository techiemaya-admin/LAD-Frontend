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
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { QuotationTemplatesProps } from '../../types/quotationtemplateprops';
export const QuotationTemplates: React.FC<QuotationTemplatesProps> = ({ 
  templates, 
  onUpload,
  onOpenBuilder,
  onDelete,
  onPreview,
  onSetDefault
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [uploadedHtml, setUploadedHtml] = useState('');
  const [detectedTags, setDetectedTags] = useState<string[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/templates/parse', {
          method: 'POST',
          body: formData
        });

        const text = await response.text();
        
        if (!response.ok) {
          let errorData = { error: 'Failed to parse template' };
          try {
            errorData = JSON.parse(text);
          } catch (e) {
            // Not JSON
          }
          throw new Error(errorData.error || 'Failed to parse template');
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Server returned non-JSON response:', text);
          throw new Error('Server returned an invalid response (HTML instead of JSON). Check server logs.');
        }
        
        setIsUploading(false);
        setFileUploaded(true);
        setUploadedHtml(data.html);
        setDetectedTags(data.placeholders);
        
        toast.success(`File "${file.name}" uploaded and parsed successfully`);
      } catch (error: any) {
        console.error('Template parsing error:', error);
        setIsUploading(false);
        toast.error(error.message || 'Failed to parse template file. Please try a different format.');
      }
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName) {
      toast.error('Please enter a template name');
      return;
    }
    if (!fileUploaded) {
      toast.error('Please upload a template file first');
      return;
    }

    onUpload(templateName, isDefault, detectedTags, uploadedHtml);
    setIsUploadModalOpen(false);
    setTemplateName('');
    setIsDefault(false);
    setFileUploaded(false);
    setUploadedHtml('');
    setDetectedTags([]);
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setTemplateName('');
    setIsDefault(false);
    setFileUploaded(false);
    setUploadedHtml('');
    setDetectedTags([]);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-8 pb-6 flex items-center justify-between bg-white border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Quotation Templates</h2>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Manage your document templates</p>
        </div>
        <button 
          onClick={() => {
            setIsUploadModalOpen(true);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-3 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Upload template
        </button>
      </div>

      <div className="p-8">
        <div className="space-y-6">
          {templates.map((template) => (
            <div key={template.id} className="p-6 bg-white border border-slate-200 rounded-3xl group transition-all hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-black text-slate-800">{template.name}</h3>
                    {template.is_default && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-lg">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium mb-4">
                    {template.name.toLowerCase().replace(/\s+/g, '-')}.html • HTML • Uploaded {format(new Date(template.created_at), 'MMM d, yyyy')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(template.placeholders || ['quotationNumber', 'clientName', 'totalAmount', 'validUntil']).map((tag) => (
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
                  {template.is_default ? (
                    <button 
                      onClick={() => onDelete(template.id)}
                      className="px-6 py-2.5 bg-white border border-slate-200 text-red-600 rounded-xl font-bold text-xs hover:bg-red-50 hover:border-red-200 transition-all"
                    >
                      Delete
                    </button>
                  ) : (
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
                  <FileText className="w-8 h-8 opacity-20" />
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
                    <h3 className="text-xl font-black text-slate-800">Upload Template</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Add a new quotation layout</p>
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
                        ) : fileUploaded ? (
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        ) : (
                          <Upload className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-slate-800 mb-1">
                          {isUploading ? 'Uploading...' : fileUploaded ? 'File uploaded!' : <><span className="text-blue-600">Click to upload</span> or drag & drop</>}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {fileUploaded ? 'Ready to save' : 'HTML, DOCX, or PDF • Max 10MB'}
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
                        placeholder="e.g. Corporate Quotation v2"
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
                      <span className="text-sm font-bold text-slate-600">Set as default template for this tenant</span>
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
    </div>
  );
};
