'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';

interface MediaEntry {
  url: string;
  name: string;
  uploadedAt: string;
}

interface SectionDef {
  key: 'header' | 'footer' | 'signature';
  label: string;
  icon: string;
  description: string;
  buildHtml: (url: string, alt: string) => string;
}

export const MEDIA_SECTIONS: SectionDef[] = [
  {
    key: 'header',
    label: 'Header Images',
    icon: '🖼️',
    description: 'Banner or logo at the top',
    buildHtml: (url, alt) =>
      `<div style="text-align:center; margin-bottom:20px;">\n  <img src="${url}" alt="${alt}" style="max-width:100%; height:auto; display:block; margin:0 auto;" />\n</div>`,
  },
  {
    key: 'footer',
    label: 'Footer Images',
    icon: '📄',
    description: 'Banner or branding at the bottom',
    buildHtml: (url, alt) =>
      `<div style="text-align:center; margin-top:20px; padding-top:16px; border-top:1px solid #e5e7eb;">\n  <img src="${url}" alt="${alt}" style="max-width:100%; height:auto; display:block; margin:0 auto;" />\n</div>`,
  },
  {
    key: 'signature',
    label: 'Signature Images',
    icon: '✍️',
    description: 'Sender signature or avatar',
    buildHtml: (url, alt) =>
      `<div style="margin-top:16px;">\n  <img src="${url}" alt="${alt}" style="max-height:80px; height:auto;" />\n</div>`,
  },
];

const storageKey = (section: string) => `email_media_${section}`;

interface EmailMediaLibraryProps {
  onInsert: (html: string) => void;
}

export default function EmailMediaLibrary({ onInsert }: EmailMediaLibraryProps) {
  const [images, setImages] = useState<Record<string, MediaEntry[]>>({
    header: [],
    footer: [],
    signature: [],
  });
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Load persisted images from localStorage on mount
  useEffect(() => {
    const loaded: Record<string, MediaEntry[]> = {};
    for (const s of MEDIA_SECTIONS) {
      try {
        loaded[s.key] = JSON.parse(localStorage.getItem(storageKey(s.key)) || '[]');
      } catch {
        loaded[s.key] = [];
      }
    }
    setImages(loaded);
  }, []);

  const persist = (key: string, entries: MediaEntry[]) => {
    try {
      localStorage.setItem(storageKey(key), JSON.stringify(entries));
    } catch { /* non-fatal */ }
  };

  const handleUpload = async (sectionKey: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setUploading(sectionKey);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/campaigns/email-templates/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error(`Upload failed (${response.status})`);

      const data = await response.json();
      const url = data.url || data.data?.url;
      if (!url) throw new Error('No URL returned from server');

      const entry: MediaEntry = { url, name: file.name, uploadedAt: new Date().toISOString() };

      setImages((prev) => {
        const updated = [entry, ...prev[sectionKey].filter((i) => i.url !== url)].slice(0, 20);
        persist(sectionKey, updated);
        return { ...prev, [sectionKey]: updated };
      });

      // Also sync into the general upload list for the Insert Media modal
      try {
        const stored = JSON.parse(localStorage.getItem('email_media_uploads') || '[]');
        const general = [entry, ...stored.filter((s: any) => s.url !== url)].slice(0, 50);
        localStorage.setItem('email_media_uploads', JSON.stringify(general));
      } catch { /* non-fatal */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
      if (fileRefs.current[sectionKey]) {
        fileRefs.current[sectionKey]!.value = '';
      }
    }
  };

  const removeImage = (sectionKey: string, url: string) => {
    setImages((prev) => {
      const updated = prev[sectionKey].filter((i) => i.url !== url);
      persist(sectionKey, updated);
      return { ...prev, [sectionKey]: updated };
    });
  };

  const buildHtml = (sectionKey: string, url: string, alt: string): string => {
    const section = MEDIA_SECTIONS.find((s) => s.key === sectionKey);
    return section
      ? section.buildHtml(url, alt)
      : `<img src="${url}" alt="${alt}" style="max-width:100%; height:auto;" />`;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Panel header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          📂 Media Library
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Drag thumbnails into the editor, or click to insert
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
          <p className="text-xs text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-xs text-red-500 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {MEDIA_SECTIONS.map((section) => (
        <div
          key={section.key}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          {/* Section header */}
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-800 leading-tight">
                {section.icon} {section.label}
              </p>
              <p className="text-xs text-gray-500 leading-tight">{section.description}</p>
            </div>
            <button
              type="button"
              onClick={() => fileRefs.current[section.key]?.click()}
              disabled={uploading === section.key}
              className="flex-shrink-0 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap font-medium"
            >
              {uploading === section.key ? '⏳' : '+ Upload'}
            </button>
            <input
              ref={(el) => { fileRefs.current[section.key] = el; }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUpload(section.key, e)}
            />
          </div>

          {/* Thumbnails */}
          <div className="p-2 min-h-[56px]">
            {images[section.key].length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3 italic">
                No images yet
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {images[section.key].map((img) => (
                  <div
                    key={img.url}
                    className="relative group rounded border border-gray-200 overflow-hidden cursor-grab active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => {
                      const html = buildHtml(section.key, img.url, img.name);
                      // Pass as application/json so the drop handler can pick it up cleanly
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({ html, url: img.url, category: section.key, alt: img.name })
                      );
                      // Fallback plain-text for other targets
                      e.dataTransfer.setData('text/plain', img.url);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    title={`Drag into editor or click to insert as ${section.label.replace(' Images', '').toLowerCase()}`}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-16 object-cover"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.src = '';
                        el.alt = '?';
                        el.className = 'w-full h-16 flex items-center justify-center text-gray-400 bg-gray-100';
                      }}
                    />

                    {/* Click-to-insert overlay */}
                    <button
                      type="button"
                      onClick={() => onInsert(buildHtml(section.key, img.url, img.name))}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold pointer-events-auto"
                    >
                      Insert
                    </button>

                    {/* Remove × */}
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); removeImage(section.key, img.url); }}
                      className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none flex z-10"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
