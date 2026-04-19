'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface MediaFile {
  id: string;
  url: string;
  name: string;
  type: string;
  uploadedAt: string;
}

interface MediaInsertionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (html: string) => void;
  tenantId?: string;
}

export default function MediaInsertionModal({
  isOpen,
  onClose,
  onInsert,
  tenantId,
}: MediaInsertionModalProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [altText, setAltText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch recently uploaded media files
  useEffect(() => {
    if (isOpen) {
      loadMediaFiles();
    }
  }, [isOpen]);

  const loadMediaFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/campaigns/email-templates', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load media');
      }

      const data = await response.json();
      // Extract media from templates
      const media: MediaFile[] = [];
      const seen = new Set<string>();

      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((template: any) => {
          if (template.media_url && !seen.has(template.media_url)) {
            seen.add(template.media_url);
            media.push({
              id: template.id || template.media_url,
              url: template.media_url,
              name: template.media_url.split('/').pop() || 'image',
              type: 'image',
              uploadedAt: template.updated_at || new Date().toISOString(),
            });
          }
        });
      }

      // Sort by upload date (newest first)
      media.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setMediaFiles(media);
    } catch (err) {
      setError(`Error loading media: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setMediaFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (!selectedMedia) {
      setError('Please select a media file');
      return;
    }

    const width = selectedMedia.type === 'image' ? '600' : undefined;
    const style = width ? ` style="max-width: 100%; height: auto; display: block; margin: 16px 0; border-radius: 4px;"` : '';

    const htmlTag = `<img src="${selectedMedia.url}" alt="${altText || selectedMedia.name}"${style} />`;

    onInsert(htmlTag);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setSelectedMedia(null);
    setAltText('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Insert Media into Email</DialogTitle>
          <DialogDescription>
            Select a previously uploaded image or upload a new one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading media...</span>
            </div>
          )}

          {/* Media Selection Grid */}
          {!loading && (
            <>
              {mediaFiles.length > 0 ? (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-900">Select Media:</label>
                  <div className="grid grid-cols-2 gap-4 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {mediaFiles.map((media) => (
                      <div
                        key={media.id}
                        onClick={() => setSelectedMedia(media)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                          selectedMedia?.id === media.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <img
                          src={media.url}
                          alt={media.name}
                          className="w-full h-24 object-cover rounded mb-2"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '🖼️';
                          }}
                        />
                        <p className="text-xs text-gray-600 truncate font-mono">{media.name}</p>
                        <p className="text-xs text-gray-400 text-right">
                          {new Date(media.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-600 mb-3">No media uploaded yet</p>
                  <p className="text-sm text-gray-500">
                    Upload an image in the media section first, then use this tool to insert it
                  </p>
                </div>
              )}

              {/* Alt Text Input */}
              {selectedMedia && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Alt Text (for accessibility):
                  </label>
                  <input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe the image content..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This text is shown if the image fails to load and helps with accessibility
                  </p>
                </div>
              )}

              {/* Preview */}
              {selectedMedia && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Preview:</p>
                  <img
                    src={selectedMedia.url}
                    alt={altText || selectedMedia.name}
                    className="max-h-40 rounded"
                  />
                </div>
              )}

              {/* HTML Preview */}
              {selectedMedia && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Generated HTML:</p>
                  <code className="text-xs text-gray-600 break-all">
                    &lt;img src="{selectedMedia.url}" alt="{altText || selectedMedia.name}" /&gt;
                  </code>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleInsert}
            disabled={!selectedMedia || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Insert Image
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
