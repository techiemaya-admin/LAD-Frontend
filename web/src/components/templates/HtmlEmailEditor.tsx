'use client';

import { useState, useRef } from 'react';
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
    <div className="flex gap-0 h-full -m-6">

      {/* ── Left: Media Library ── */}
      <div className="w-52 flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto p-4">
        <EmailMediaLibrary onInsert={insertAtCursor} />
      </div>

      {/* ── Right: HTML Editor ── */}
      <div className="flex-1 min-w-0 flex flex-col p-5 gap-3 overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-gray-200 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Insert:</span>
          {[
            { label: 'First Name', val: '{{first_name}}' },
            { label: 'Last Name',  val: '{{last_name}}'  },
            { label: 'Company',    val: '{{company}}'    },
            { label: 'Title',      val: '{{title}}'      },
          ].map(({ label, val }) => (
            <button
              key={val}
              onClick={() => insertAtCursor(val)}
              className="px-2.5 py-1 text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {label}
            </button>
          ))}
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
            placeholder={`<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">\n  <h1>Hello {{first_name}},</h1>\n  <p>Write your email here...</p>\n</div>`}
            className={`flex-1 w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 font-mono text-sm bg-white resize-none transition-colors ${
              isDragOver
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

        {/* Placeholders hint */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex-shrink-0">
          <p className="text-xs font-semibold text-blue-700 mb-1.5">💡 Supported Placeholders:</p>
          <div className="flex flex-wrap gap-2">
            {['{{first_name}}', '{{last_name}}', '{{company}}', '{{title}}', '{{email}}'].map(p => (
              <button
                key={p}
                onClick={() => insertAtCursor(p)}
                className="px-2 py-0.5 font-mono text-[11px] bg-white border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-blue-500 mt-1.5">These will be replaced with actual values when emails are sent.</p>
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
