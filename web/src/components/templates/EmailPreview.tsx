'use client';

import { useState } from 'react';
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
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 16px;
          background-color: #f9f9f9;
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
          color: #000;
          margin: 0;
        }
        .email-body {
          font-size: 14px;
          color: #555;
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
          color: #000;
        }
        .email-body ul, .email-body ol {
          margin: 12px 0;
          padding-left: 24px;
        }
        .email-body li {
          margin: 6px 0;
        }
        .placeholder-hint {
          display: inline-block;
          background-color: #fff3cd;
          border: 1px dashed #ffc107;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
          color: #856404;
          margin: 0 4px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        ${subject ? `<div class="email-header"><h2 class="email-subject">${DOMPurify.sanitize(subject)}</h2></div>` : ''}
        <div class="email-body">
          ${sanitized}
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

  return (
    <div className="flex flex-col gap-4">
      {/* Device Selector */}
      {showDeviceSelector && (
        <div className="flex gap-2 border-b border-gray-200 pb-3">
          <button
            onClick={() => setDevice('mobile')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              device === 'mobile'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📱 Mobile (375px)
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              device === 'tablet'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Tablet (768px)
          </button>
          <button
            onClick={() => setDevice('desktop')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              device === 'desktop'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💻 Desktop
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Preview Container */}
      <div
        className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50"
        style={{
          width: device === 'desktop' ? '100%' : getDeviceWidth(),
          margin: '0 auto',
        }}
      >
        <iframe
          sandbox="allow-same-origin"
          srcDoc={htmlWithStyles}
          style={{
            width: '100%',
            height: device === 'mobile' ? '600px' : device === 'tablet' ? '800px' : '600px',
            border: 'none',
          }}
          title="Email Preview"
        />
      </div>

      {/* Placeholder Hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800 mb-2 font-semibold">💡 Supported Placeholders:</p>
        <div className="flex flex-wrap gap-2">
          {['{{first_name}}', '{{last_name}}', '{{company}}', '{{title}}', '{{email}}'].map((placeholder) => (
            <span key={placeholder} className="inline-block bg-white border border-blue-200 px-2 py-1 rounded text-xs text-blue-700 font-mono">
              {placeholder}
            </span>
          ))}
        </div>
        <p className="text-xs text-blue-700 mt-2">These will be replaced with actual values when emails are sent.</p>
      </div>
    </div>
  );
}
