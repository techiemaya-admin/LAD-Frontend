'use client';

import { useState, useRef } from 'react';
import EmailPreview from './EmailPreview';
import MediaInsertionModal from './MediaInsertionModal';
import EmailMediaLibrary from './EmailMediaLibrary';
import { Button } from '@/components/ui/button';

interface HtmlEmailEditorProps {
  htmlContent: string;
  subject?: string;
  onContentChange: (content: string) => void;
  onSubjectChange?: (subject: string) => void;
}

export default function HtmlEmailEditor({
  htmlContent,
  subject = '',
  onContentChange,
  onSubjectChange,
}: HtmlEmailEditorProps) {
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState('');

  const wordCount = htmlContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = htmlContent.length;

  /** Insert html at current cursor position (or end if no selection). */
  const insertAtCursor = (htmlTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Fallback: append to end
      onContentChange(htmlContent + '\n' + htmlTag);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = htmlContent.substring(0, start) + htmlTag + htmlContent.substring(end);
    onContentChange(newContent);

    setTimeout(() => {
      if (textarea) {
        const pos = start + htmlTag.length;
        textarea.selectionStart = textarea.selectionEnd = pos;
        textarea.focus();
      }
    }, 0);
  };

  const handleInsertMedia = (htmlTag: string) => {
    insertAtCursor(htmlTag);
    setShowMediaModal(false);
  };

  const insertPlaceholder = (placeholder: string) => {
    insertAtCursor(placeholder);
  };

  // ── Drag-and-drop handlers for the textarea ──────────────────────────────
  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    // Allow drop only when we have our own media payload
    if (
      e.dataTransfer.types.includes('application/json') ||
      e.dataTransfer.types.includes('text/plain')
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    // Prefer our rich JSON payload (from EmailMediaLibrary)
    const raw = e.dataTransfer.getData('application/json');
    if (raw) {
      try {
        const { html } = JSON.parse(raw) as { html: string };
        if (html) {
          insertAtCursor('\n' + html + '\n');
          return;
        }
      } catch { /* fall through */ }
    }

    // Fallback: if a plain URL was dropped, wrap it in a basic img tag
    const url = e.dataTransfer.getData('text/plain');
    if (url && url.startsWith('http')) {
      insertAtCursor(`\n<img src="${url}" alt="image" style="max-width:100%; height:auto;" />\n`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-600 font-semibold">Formatting Tools:</div>

        <button
          onClick={() => insertPlaceholder('{{first_name}}')}
          className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 font-mono text-blue-600"
          title="Insert first name placeholder"
        >
          First Name
        </button>

        <button
          onClick={() => insertPlaceholder('{{last_name}}')}
          className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 font-mono text-blue-600"
          title="Insert last name placeholder"
        >
          Last Name
        </button>

        <button
          onClick={() => insertPlaceholder('{{company}}')}
          className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 font-mono text-blue-600"
          title="Insert company placeholder"
        >
          Company
        </button>

        <button
          onClick={() => insertPlaceholder('{{title}}')}
          className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 font-mono text-blue-600"
          title="Insert title placeholder"
        >
          Title
        </button>

        <div className="flex-1"></div>

        <button
          onClick={() => setShowMediaModal(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          📸 Insert Media
        </button>
      </div>

      {/* Main 3-column layout: Media Library | Editor | Preview */}
      <div className="flex gap-4">
        {/* Left Pane: Media Library */}
        <div className="w-52 flex-shrink-0 overflow-y-auto max-h-[680px] pr-1">
          <EmailMediaLibrary onInsert={insertAtCursor} />
        </div>

        {/* Center Pane: HTML Editor */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              HTML Content
              {isDragOver && (
                <span className="ml-2 text-xs text-blue-600 font-normal animate-pulse">
                  Drop image here →
                </span>
              )}
            </label>
            <textarea
              ref={textareaRef}
              value={htmlContent}
              onChange={(e) => onContentChange(e.target.value)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              placeholder="Write your HTML email content here. You can use {{first_name}}, {{company}}, etc. for dynamic content.&#10;&#10;Drag images from the Media Library on the left to insert them."
              rows={15}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 font-mono text-sm bg-white transition-colors ${
                isDragOver
                  ? 'border-blue-400 ring-2 ring-blue-300 bg-blue-50'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
          </div>

          {/* Stats */}
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <span>📝 Words: {wordCount}</span>
            <span>🔤 Characters: {charCount}</span>
            <span>
              {charCount > 500000 ? '❌' : charCount > 400000 ? '⚠️' : '✅'} Size:{' '}
              {(charCount / 1000).toFixed(1)}KB / 500KB
            </span>
          </div>

          {/* Helper Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-900">💡 Tips:</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Use <code className="bg-blue-100 px-1 rounded">&lt;p&gt;</code> tags for paragraphs</li>
              <li>• Use <code className="bg-blue-100 px-1 rounded">&lt;br /&gt;</code> for line breaks</li>
              <li>• Use <code className="bg-blue-100 px-1 rounded">&lt;strong&gt;</code> or <code className="bg-blue-100 px-1 rounded">&lt;em&gt;</code> for emphasis</li>
              <li>• <strong>Drag</strong> images from the Media Library into the editor above</li>
              <li>• Or <strong>click</strong> a thumbnail to insert at cursor position</li>
            </ul>
          </div>
        </div>

        {/* Right Pane: Preview */}
        <div className="w-72 flex-shrink-0 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Email Preview
            </label>
            <div className="border border-gray-200 rounded-lg p-3 bg-white max-h-[600px] overflow-y-auto">
              <EmailPreview
                htmlContent={htmlContent}
                subject={subject}
                showDeviceSelector={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Media Insertion Modal (keeps existing "Insert Media" button working) */}
      <MediaInsertionModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onInsert={handleInsertMedia}
      />
    </div>
  );
}
