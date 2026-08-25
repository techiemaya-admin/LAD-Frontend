'use client';

import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface EmailPreviewProps {
  htmlContent: string;
  subject?: string;
  showDeviceSelector?: boolean;
}

export default function EmailPreview({
  htmlContent,
  subject,
  showDeviceSelector = true,
}: EmailPreviewProps) {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [error, setError] = useState('');
  // Track parent app's dark mode via MutationObserver - drives iframe theme
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() =>
      setIsDark(root.classList.contains('dark'))
    );
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Sanitize HTML content
  const sanitizeHtml = (dirtyHtml: string) => {
    try {
      return DOMPurify.sanitize(dirtyHtml, {
        ALLOWED_TAGS: [
          'p', 'div', 'span', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'br', 'hr', 'img', 'a', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
        ],
        ALLOWED_ATTR: ['src', 'alt', 'href', 'title', 'class', 'style', 'width', 'height'],
        KEEP_CONTENT: true,
        ALLOW_UNKNOWN_PROTOCOLS: false,
      });
    } catch (err) {
      setError(`HTML sanitization error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return '';
    }
  };

  const sanitized = sanitizeHtml(htmlContent);

  // Add basic email styles and make it responsive
  const htmlWithStyles = `
    <!DOCTYPE html>
    <html id="iframe-root"${isDark ? ' data-theme="dark"' : ''}>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <style>
        /* Modern customized scrollbar tracking inside the preview iframe */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        html, body {
          background-color: #f9f9f9;
          color: #333333;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 16px;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .email-container {
          background-color: #ffffff;
          padding: 24px;
          border-radius: 8px;
          max-width: 600px;
          margin: 0 auto;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 16px;
          margin-bottom: 16px;
        }
        .email-subject {
          font-size: 18px;
          font-weight: 600;
          color: #000000;
          margin: 0;
        }
        .email-body {
          font-size: 14px;
          color: #333333;
        }
        .email-body p {
          margin: 0 0 16px 0;
        }
        .email-body a {
          color: #0066cc;
          text-decoration: none;
        }
        .email-body a:hover {
          text-decoration: underline;
        }
        .email-body img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 16px 0;
          border-radius: 4px;
        }
        .email-body h1, .email-body h2, .email-body h3 {
          margin: 24px 0 12px 0;
          color: #000000;
        }
        .email-body ul, .email-body ol {
          margin: 12px 0;
          padding-left: 24px;
        }
        .email-body li {
          margin: 6px 0;
        }
        
        /* High-contrast explicit selector fallback when data attribute is applied */
        html[data-theme="dark"],
        html[data-theme="dark"] body {
          background-color: #000724 !important;
          color: #f3f4f6 !important;
        }
        html[data-theme="dark"] .email-container {
          background-color: #000c3b !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3) !important;
        }
        html[data-theme="dark"] .email-header {
          border-bottom: 1px solid #1e293b !important;
        }
        html[data-theme="dark"] .email-subject {
          color: #ffffff !important;
          background-color: transparent !important;
        }
        html[data-theme="dark"] .email-body {
          color: #cbd5e1 !important;
        }
        html[data-theme="dark"] .email-body h1, 
        html[data-theme="dark"] .email-body h2, 
        html[data-theme="dark"] .email-body h3 {
          color: #ffffff !important;
        }
        html[data-theme="dark"] .email-body a {
          color: #38bdf8 !important;
        }
        html[data-theme="dark"] ::webkit-scrollbar-track {
          background: #000724;
        }
        html[data-theme="dark"] ::webkit-scrollbar-thumb {
          background: #1e293b;
        }

        /* No OS-level dark media query - theme is driven solely by parent app class */
      </style>
    </head>
    <body>
      <div class="email-container">
        ${subject ? `<div class="email-header"><h2 class="email-subject">${DOMPurify.sanitize(subject)}</h2></div>` : ''}
        <div class="email-body">
          ${sanitized || '<div style="text-align: center; color: #9ca3af; padding: 20px 0;">No template content generated yet. Choose an editor block to begin.</div>'}
        </div>
      </div>
    </body>
    </html>
  `;

  // Get device dimensions
  const getDeviceWidth = () => {
    switch (device) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      default:
        return '100%';
    }
  };

    // Snapshot state-tracking rendering key used to force structural remount updates
    const renderingKey = `${subject?.length || 0}_${sanitized.length}_${device}_${isDark}`;

  return (
    <div className="flex flex-col gap-4 bg-transparent">
      {/* Device Selector */}
      {showDeviceSelector && (
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
          <button
            onClick={() => setDevice('mobile')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              device === 'mobile'
                ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-900'
                : 'bg-gray-100 dark:bg-[#000c3b] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#0b1957]/50'
            }`}
          >
            📱 Mobile (375px)
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              device === 'tablet'
                ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-900'
                : 'bg-gray-100 dark:bg-[#000c3b] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#0b1957]/50'
            }`}
          >
            📊 Tablet (768px)
          </button>
          <button
            onClick={() => setDevice('desktop')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              device === 'desktop'
                ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-900'
                : 'bg-gray-100 dark:bg-[#000c3b] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#0b1957]/50'
            }`}
          >
            💻 Desktop
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Preview Container */}
      <div
        className="border-2 border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-[#000724]"
        style={{
          width: device === 'desktop' ? '100%' : getDeviceWidth(),
          margin: '0 auto',
        }}
      >
        <iframe
                key={renderingKey}
          sandbox="allow-same-origin allow-scripts allow-forms"
          srcDoc={htmlWithStyles}
          style={{
            width: '100%',
            height: device === 'mobile' ? '600px' : device === 'tablet' ? '800px' : '600px',
            border: 'none',
            display: 'block',
        }}
          title="Email Preview"
        />
      </div>

      {/* Placeholder Hint */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/60 rounded-lg p-3">
        <p className="text-sm text-blue-800 dark:text-blue-400 mb-2 font-semibold">💡 Supported Placeholders:</p>
        <div className="flex flex-wrap gap-2">
          {['{{first_name}}', '{{last_name}}', '{{company}}', '{{title}}', '{{email}}'].map((placeholder) => (
            <span key={placeholder} className="inline-block bg-white dark:bg-[#000c3b] border border-blue-200 dark:border-blue-800 px-2 py-1 rounded text-xs text-blue-700 dark:text-blue-300 font-mono">
              {placeholder}
            </span>
          ))}
        </div>
        <p className="text-xs text-blue-700 dark:text-blue-400/70 mt-2">These will be replaced with actual values when emails are sent.</p>
      </div>
    </div>
  );
}