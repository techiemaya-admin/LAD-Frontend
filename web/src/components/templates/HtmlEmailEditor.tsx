'use client';

import React, { useState, useRef } from 'react';
import MediaInsertionModal from './MediaInsertionModal';
import EmailMediaLibrary from './EmailMediaLibrary';

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
  const [showMediaMobile, setShowMediaMobile] = useState(false);
  const [isDragOver, setIsDragOver]         = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = htmlContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = htmlContent.length;

  // ── Cursor insert helper ──────────────────────────────────────────────────

  const insertAtCursor = (htmlTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) { onContentChange(htmlContent + '\n' + htmlTag); return; }
    const start = textarea.selectionStart;
    const end   = textarea.selectionEnd;
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
      <div className="flex flex-col sm:flex-row gap-0 h-full w-full overflow-hidden bg-transparent">

        {/* Mobile only header to toggle Media Library (collapsible on mobile screens) */}
        <div className="sm:hidden flex-shrink-0 bg-gray-50 dark:bg-[#000c3b] border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">📸 Media library items</span>
          <button
              type="button"
              onClick={() => setShowMediaMobile(!showMediaMobile)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-white dark:bg-[#000724] border border-gray-200 dark:border-gray-800 font-bold text-gray-700 dark:text-gray-300 cursor-pointer shadow-xs hover:bg-gray-50 dark:hover:bg-[#0b1957]/30"
          >
            {showMediaMobile ? 'Hide Library ✖' : 'Show Library +'}
          </button>
        </div>

      {/* ── Left: Media Library ── */}
      <div className={`w-full sm:w-52 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#000724] overflow-y-auto p-4 ${showMediaMobile ? 'block h-48 sm:h-full' : 'hidden sm:block h-full'}`}>
        <EmailMediaLibrary onInsert={insertAtCursor} />
      </div>

      {/* ── Right: HTML Editor ── */}
      <div className="flex-1 min-w-0 flex flex-col p-3 sm:p-5 gap-2 sm:gap-3 overflow-hidden h-full">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#000c3b] rounded-xl border border-gray-200 dark:border-gray-800 flex-shrink-0">
          <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mr-1">Insert:</span>
          {[
            { label: 'First Name', val: '{{first_name}}' },
            { label: 'Last Name',  val: '{{last_name}}'  },
            { label: 'Company',    val: '{{company}}'    },
            { label: 'Title',      val: '{{title}}'      },
          ].map(({ label, val }) => (
            <button
              key={val}
              onClick={() => insertAtCursor(val)}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-mono bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
            >
              {label}
            </button>
          ))}
          <div className="flex-1 min-w-[8px]" />
          <button
            onClick={() => setShowMediaModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs bg-primary dark:bg-blue-500 text-white rounded-lg hover:bg-primary/90 active:bg-primary/80 dark:hover:bg-blue-600 dark:active:bg-blue-700 font-semibold transition-all active:scale-95 cursor-pointer"
          >
            📸 Insert Media
          </button>
        </div>

        {/* HTML textarea */}
        <div className="flex-1 flex flex-col min-h-0">
          {isDragOver && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse mb-1">Drop image here →</p>
          )}
          <textarea
            ref={textareaRef}
            value={htmlContent}
            onChange={(e) => onContentChange(e.target.value)}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            placeholder={`<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">\n  <h1>Hello {{first_name}},</h1>\n  <p>Write your email here...</p>\n</div>`}
            className={`flex-1 w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 font-mono text-sm resize-none transition-colors ${
              isDragOver
                ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-300 dark:ring-blue-900 bg-blue-50 dark:bg-blue-950/20 text-gray-900 dark:text-white'
                : 'border-gray-200 dark:border-gray-800 focus:ring-blue-500 focus:border-blue-400 bg-white dark:bg-[#000c3b] text-gray-900 dark:text-white'
            }`}
            style={{ minHeight: '340px' }}
          />
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
          <span>📝 {wordCount} words</span>
          <span>🔤 {charCount} chars</span>
          <span className={charCount > 400000 ? 'text-amber-500 dark:text-amber-400 font-medium' : ''}>
            {charCount > 500000 ? '❌' : charCount > 400000 ? '⚠️' : '✅'}{' '}
            {(charCount / 1000).toFixed(1)} KB / 500 KB
          </span>
          <div className="hidden sm:block flex-1 border-transparent" />
          <span className="hidden sm:inline text-gray-400 dark:text-gray-600 text-[10px] truncate max-w-xs">Drag images from the Media Library · Use placeholders for personalisation</span>
        </div>

        {/* Placeholders hint */}
        <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/60 rounded-xl px-3 py-2 sm:px-4 sm:py-3 flex-shrink-0">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1 sm:mb-1.5">💡 Supported Placeholders:</p>
          <div className="flex flex-wrap gap-1.5">
            {['{{first_name}}', '{{last_name}}', '{{company}}', '{{title}}', '{{email}}'].map(p => (
              <button
                key={p}
                onClick={() => insertAtCursor(p)}
                className="px-2 py-0.5 font-mono text-[11px] bg-white dark:bg-[#000724] border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-105 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
          <p className="text-[10px] sm:text-[11px] text-blue-500 dark:text-blue-400/70 mt-1 sm:mt-1.5">These will be replaced with actual values when emails are sent.</p>
        </div>
      </div>

      {/* Media Insertion Modal */}
      <MediaInsertionModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onInsert={(html) => { insertAtCursor(html); setShowMediaModal(false); }}
      />
    </div>
  );
}
