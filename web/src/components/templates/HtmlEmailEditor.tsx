'use client';

import { useState, useRef } from 'react';
import EmailPreview from './EmailPreview';
import MediaInsertionModal from './MediaInsertionModal';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState('');

  const wordCount = htmlContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
  const charCount = htmlContent.length;

  const handleInsertMedia = (htmlTag: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newContent = htmlContent.substring(0, start) + htmlTag + htmlContent.substring(end);
    onContentChange(newContent);

    // Move cursor after inserted content
    setTimeout(() => {
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = start + htmlTag.length;
        textarea.focus();
      }
    }, 0);

    setShowMediaModal(false);
  };

  const insertPlaceholder = (placeholder: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newContent = htmlContent.substring(0, start) + placeholder + htmlContent.substring(end);
    onContentChange(newContent);

    // Move cursor after inserted placeholder
    setTimeout(() => {
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
        textarea.focus();
      }
    }, 0);
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

      {/* Main Editor Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Pane: Editor */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              HTML Content
            </label>
            <textarea
              ref={textareaRef}
              value={htmlContent}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Write your HTML email content here. You can use {{first_name}}, {{company}}, etc. for dynamic content."
              rows={15}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-white"
            />
          </div>

          {/* Stats */}
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <span>📝 Words: {wordCount}</span>
            <span>🔤 Characters: {charCount}</span>
            <span>{charCount > 500000 ? '❌' : charCount > 400000 ? '⚠️' : '✅'} Size: {(charCount / 1000).toFixed(1)}KB / 500KB</span>
          </div>

          {/* Helper Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-900">💡 HTML Tips:</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Use <code className="bg-blue-100 px-1 rounded">&lt;p&gt;</code> tags for paragraphs</li>
              <li>• Use <code className="bg-blue-100 px-1 rounded">&lt;br /&gt;</code> for line breaks</li>
              <li>• Use <code className="bg-blue-100 px-1 rounded">&lt;strong&gt;</code> or <code className="bg-blue-100 px-1 rounded">&lt;em&gt;</code> for emphasis</li>
              <li>• Click "Insert Media" to add images</li>
              <li>• Max size: 500KB (most email clients support this)</li>
            </ul>
          </div>
        </div>

        {/* Right Pane: Preview */}
        <div className="space-y-3">
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

      {/* Media Insertion Modal */}
      <MediaInsertionModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onInsert={handleInsertMedia}
      />
    </div>
  );
}
