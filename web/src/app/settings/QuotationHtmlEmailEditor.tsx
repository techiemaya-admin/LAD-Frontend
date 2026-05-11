'use client';

import { useState, useRef } from 'react';
import QuotationMediaInsertionModal from './QuotationMediaInsertionModal';
import QuotationEmailMediaLibrary from './QuotationEmailMediaLibrary';
import { Placeholder } from './EmailTemplatesDragDrop';

interface QuotationHtmlEmailEditorProps {
  htmlContent: string;
  subject?: string;
  onContentChange: (content: string) => void;
  onSubjectChange?: (subject: string) => void;
  placeholders: Placeholder[]
}

export default function QuotationHtmlEmailEditor({
  htmlContent,
  subject = '',
  onContentChange,
  onSubjectChange,
  placeholders
}: QuotationHtmlEmailEditorProps) {
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showAllPlaceholders, setShowAllPlaceholders] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = htmlContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = htmlContent.length;

  // ── Cursor insert helper ──────────────────────────────────────────────────

  const insertAtCursor = (htmlTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) { onContentChange(htmlContent + '\n' + htmlTag); return; }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    onContentChange(htmlContent.substring(0, start) + htmlTag + htmlContent.substring(end));
    setTimeout(() => {
      if (textarea) {
        const pos = start + htmlTag.length;
        textarea.selectionStart = textarea.selectionEnd = pos;
        textarea.focus();
      }
    }, 0);
  };

  // ── Drag-and-drop ─────────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    if (e.dataTransfer.types.includes('application/json') || e.dataTransfer.types.includes('text/plain')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData('application/json');
    if (raw) {
      try { const { html } = JSON.parse(raw) as { html: string }; if (html) { insertAtCursor('\n' + html + '\n'); return; } } catch { /* ignore */ }
    }
    const url = e.dataTransfer.getData('text/plain');
    if (url?.startsWith('http')) insertAtCursor(`\n<img src="${url}" alt="image" style="max-width:100%;height:auto;" />\n`);
  };

  return (
    <div className="flex gap-0 h-full -m-6">

      {/* ── Left: Media Library ── */}
      <div className="w-52 flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto p-4">
        <QuotationEmailMediaLibrary onInsert={insertAtCursor} />
      </div>

      {/* ── Right: HTML Editor ── */}
      <div className="flex-1 min-w-0 flex flex-col p-5 gap-3 overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-gray-200 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Insert:</span>
          {/* Slice the array based on state */}
          {(showAllPlaceholders ? placeholders : placeholders.slice(0, 5)).map((ph) => (
            <button
              key={ph.id}
              type="button"
              onClick={() => insertAtCursor(' ['+ph.placeholder_key+']')}
              className="px-3 py-1.5 text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {ph.placeholder_key}
            </button>
          ))}

          {/* Toggle Button */}
          {placeholders.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllPlaceholders(!showAllPlaceholders)}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 transition-all"
            >
              {showAllPlaceholders ? 'Show Less ↑' : `+ ${placeholders.length - 5} more...`}
            </button>
          )}

          <div className="flex-1" />
          <button
            onClick={() => setShowMediaModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            📸 Insert Media
          </button>
        </div>

        {/* HTML textarea */}
        <div className="flex-1 flex flex-col min-h-0">
          {isDragOver && (
            <p className="text-xs text-blue-600 font-medium animate-pulse mb-1">Drop image here →</p>
          )}
          <textarea
            ref={textareaRef}
            value={htmlContent}
            onChange={(e) => onContentChange(e.target.value)}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            placeholder={`<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">\n  <h1>Hello [first_name],</h1>\n  <p>Write your email here...</p>\n</div>`}
            className={`flex-1 w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 font-mono text-sm bg-white resize-none transition-colors ${isDragOver
                ? 'border-blue-400 ring-2 ring-blue-300 bg-blue-50'
                : 'border-gray-200 focus:ring-blue-500 focus:border-blue-400'
              }`}
            style={{ minHeight: '340px' }}
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-gray-400 flex-shrink-0">
          <span>📝 {wordCount} words</span>
          <span>🔤 {charCount} chars</span>
          <span className={charCount > 400000 ? 'text-amber-500 font-medium' : ''}>
            {charCount > 500000 ? '❌' : charCount > 400000 ? '⚠️' : '✅'}{' '}
            {(charCount / 1000).toFixed(1)} KB / 500 KB
          </span>
          <div className="flex-1" />
          <span className="text-gray-300">Drag images from the Media Library · Use placeholders for personalisation</span>
        </div>

      </div>

      {/* Media Insertion Modal */}
      <QuotationMediaInsertionModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onInsert={(html) => { insertAtCursor(html); setShowMediaModal(false); }}
      />
    </div>
  );
}
