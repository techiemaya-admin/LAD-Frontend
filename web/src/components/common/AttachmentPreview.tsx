/**
 * Attachment Preview Component
 * Displays attachment cards with preview functionality
 */
import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogTitle, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  X,
  File,
  Image as ImageIcon,
  FileText,
  FileType,
} from 'lucide-react';
function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
interface Attachment {
  id: string | number;
  url: string;
  filename?: string;
  file_name?: string;
  mimetype?: string;
  size?: number;
  uploaded_at?: string;
  uploadedAt?: string;
  uploaded_by_name?: string;
  user_id?: string | number;
}
interface AttachmentPreviewProps {
  attachment: Attachment;
  onDelete?: ((attachmentId: string | number, userId?: string | number) => void) | null;
}
const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachment, onDelete }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Lock body scroll when dialog is open
  React.useEffect(() => {
    if (previewOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewOpen]);
  // Determine icon based on file type
  const getFileIcon = (mimetype?: string, filename?: string, file_name?: string) => {
    if (!mimetype && !filename && !file_name) {
      return <File className="w-6 h-6 text-slate-500" />;
    }
    const type = mimetype || '';
    const name = file_name || filename || '';
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(name)) {
      return <ImageIcon className="w-6 h-6 text-emerald-500" />;
    } else if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return <FileText className="w-6 h-6 text-red-500" />;
    } else if (type.includes('document') || type.includes('word') || /\.(doc|docx|txt)$/i.test(name)) {
      return <FileType className="w-6 h-6 text-blue-500" />;
    } else {
      return <File className="w-6 h-6 text-slate-500" />;
    }
  };
  // Check if file can be previewed
  const canPreview = (mimetype?: string, filename?: string, file_name?: string): boolean => {
    if (!mimetype && !filename && !file_name) return false;
    const type = mimetype || '';
    const name = file_name || filename || '';
    return type.startsWith('image/') || 
           type === 'application/pdf' || 
           /\.(jpg|jpeg|png|gif|bmp|webp|pdf)$/i.test(name);
  };
  const handlePreviewOpen = () => {
    setPreviewOpen(true);
  };
  const handlePreviewClose = () => {
    setPreviewOpen(false);
    setPreviewLoading(false);
  };
  // Render preview content
  const renderPreviewContent = () => {
    if (!attachment?.url) return null;
    const { url, mimetype, filename, file_name } = attachment;
    // Images
    if (mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file_name || filename || '')) {
      return (
        <div className="flex justify-center items-center min-h-[400px] relative">
          {previewLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="w-1/2">
                <Progress value={undefined} className="h-2" />
              </div>
            </div>
          )}
          <img
            src={url}
            alt={file_name || filename || 'Attachment'}
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
            onLoad={() => setPreviewLoading(false)}
            onError={() => setPreviewLoading(false)}
            onLoadStart={() => setPreviewLoading(true)}
          />
        </div>
      );
    }
    // PDFs and other documents
    return (
      <div className="w-full min-h-[600px] relative">
        {previewLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="w-1/2">
              <Progress value={undefined} className="h-2" />
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-[600px] border-0 rounded-lg"
          title={file_name || filename || 'Attachment'}
          onLoad={() => setPreviewLoading(false)}
          onError={() => setPreviewLoading(false)}
        />
      </div>
    );
  };
  const fileName = attachment.file_name || attachment.filename || 'Untitled';
  const uploadedDate = attachment.uploaded_at || attachment.uploadedAt;
  const uploadedByName = attachment.uploaded_by_name;
  return (
    <>
      <Card className="max-w-[300px] relative hover:shadow-md transition-shadow cursor-pointer">
        <div onClick={handlePreviewOpen} className="w-full">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {getFileIcon(attachment.mimetype, attachment.filename, attachment.file_name)}
              </div>
              <div className={cn(
                'flex-grow min-w-0',
                onDelete && 'pr-10'
              )}>
                <div className="font-semibold text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                  {fileName}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {uploadedByName && `Uploaded by ${uploadedByName}`}
                  {uploadedByName && uploadedDate && ' • '}
                  {uploadedDate && new Date(uploadedDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 bg-white/80 hover:bg-white/90"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(attachment.id, attachment.user_id);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </Card>
      {/* Preview Dialog */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={handlePreviewClose}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div
            className="relative z-50 bg-white rounded-lg shadow-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogTitle className="flex justify-between items-center pb-2 px-6 pt-6">
              <h2 className="text-lg font-semibold overflow-hidden text-ellipsis whitespace-nowrap pr-2">
                {fileName}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviewClose}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
            <DialogContent className="p-6 pt-2">
              {renderPreviewContent()}
            </DialogContent>
          </div>
        </div>
      )}
    </>
  );
};
export default AttachmentPreview;