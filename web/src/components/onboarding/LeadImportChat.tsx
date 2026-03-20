'use client';

import React, { useState, useRef, useCallback } from 'react';
import { apiUpload, apiPost } from '@/lib/api';
import { logger } from '@/lib/logger';
import {
  Upload,
  Download,
  FileText,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  Phone,
  MessageCircle,
  Users,
  Eye,
  Smartphone,
  Camera,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeadImportChatProps {
  onImportComplete: (result: {
    leadIds: string[];
    savedCount: number;
    detectedChannels: string[];
    selectedChannels: string[];
    totalLeads: number;
    platforms: any;
  }) => void;
  onCancel?: () => void;
}

interface ChannelConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  emoji: string;
}

interface ImportResultData {
  leads: any[];
  totalLeads: number;
  skippedRows: number;
  preview: any[];
  platforms: {
    available: string[];
    coverage: Record<string, number>;
    enrichableCount: number;
  };
}

// ---------------------------------------------------------------------------
// Channel configuration
// ---------------------------------------------------------------------------

const CHANNEL_CONFIG: Record<string, ChannelConfig> = {
  linkedin: { label: 'LinkedIn', icon: Eye, color: '#0077B5', emoji: '💼' },
  email: { label: 'Email', icon: Mail, color: '#F59E0B', emoji: '📧' },
  voice: { label: 'Voice Call', icon: Phone, color: '#8B5CF6', emoji: '📞' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: '#25D366', emoji: '💬' },
  instagram: { label: 'Instagram', icon: Camera, color: '#E4405F', emoji: '📷' },
  facebook: { label: 'Facebook', icon: Users, color: '#1877F2', emoji: '👤' },
  tiktok: { label: 'TikTok', icon: Smartphone, color: '#000000', emoji: '🎵' },
  twitter: { label: 'Twitter/X', icon: MessageSquare, color: '#1DA1F2', emoji: '🐦' },
};

const PRIMARY_CHANNELS = ['linkedin', 'email', 'whatsapp', 'voice', 'instagram'];

// ---------------------------------------------------------------------------
// Accepted file types
// ---------------------------------------------------------------------------

// Phase 2: Accept ANY file format (images, PDFs, CSV, Excel, text)
const ACCEPTED_TYPES = [
  // Spreadsheets
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  // Images (for Gemini Vision API)
  'image/jpeg',
  'image/png',
  'image/webp',
  // PDFs
  'application/pdf',
  // Text
  'text/plain',
  'application/json',
];

const ACCEPTED_EXTENSIONS = [
  // Spreadsheets
  '.csv', '.xlsx', '.xls',
  // Images
  '.jpg', '.jpeg', '.png', '.webp',
  // PDF
  '.pdf',
  // Text
  '.txt', '.json'
];

function isAcceptedFile(file: File): boolean {
  return (
    ACCEPTED_TYPES.includes(file.type) ||
    ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LeadImportChat({ onImportComplete, onCancel }: LeadImportChatProps) {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importResult, setImportResult] = useState<ImportResultData | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [showExtraChannels, setShowExtraChannels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Template download
  // ---------------------------------------------------------------------------

  const handleDownloadTemplate = async (format: 'csv' | 'xlsx' = 'xlsx') => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || ''}/api/campaigns/leads/import-template?format=${format}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          credentials: 'include',
        },
      );
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_import_template.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Failed to download template', err);
      setError('Failed to download template');
    }
  };

  // ---------------------------------------------------------------------------
  // File upload
  // ---------------------------------------------------------------------------

  const handleFileUpload = useCallback(async (selectedFile: File) => {
    if (!isAcceptedFile(selectedFile)) {
      setError('Please upload a supported file: image (JPG, PNG), PDF, CSV, Excel (.xlsx, .xls), or text file');
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const result = await apiUpload<{ success: boolean; data: ImportResultData; error?: string }>(
        '/api/campaigns/leads/import',
        formData,
      );

      if (result.success) {
        setImportResult(result.data);

        // Auto-select detected channels
        const detected = result.data.platforms?.available || [];

        // If enrichable leads exist (name+company), enable all primary channels
        if (result.data.platforms?.enrichableCount > 0) {
          setSelectedChannels([...new Set([...PRIMARY_CHANNELS, ...detected])]);
        } else {
          setSelectedChannels([...detected]);
        }
      } else {
        setError(result.error || 'Failed to parse file');
      }
    } catch (err: any) {
      logger.error('File upload failed', err);
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Drag and drop handlers
  // ---------------------------------------------------------------------------

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileUpload(droppedFile);
      }
    },
    [handleFileUpload],
  );

  // ---------------------------------------------------------------------------
  // Channel selection
  // ---------------------------------------------------------------------------

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel],
    );
  };

  // ---------------------------------------------------------------------------
  // Confirm import (save)
  // ---------------------------------------------------------------------------

  const handleConfirmImport = async () => {
    if (!importResult) return;

    setIsSaving(true);
    setError(null);

    try {
      const saveResult = await apiPost<{
        success: boolean;
        leadIds: string[];
        savedCount: number;
        error?: string;
      }>('/api/campaigns/leads/import/save', {
        leads: importResult.leads,
        detectedChannels: selectedChannels,
      });

      if (saveResult.success) {
        onImportComplete({
          leadIds: saveResult.leadIds,
          savedCount: saveResult.savedCount,
          detectedChannels: importResult.platforms?.available || [],
          selectedChannels,
          totalLeads: importResult.totalLeads,
          platforms: importResult.platforms,
        });
      } else {
        setError(saveResult.error || 'Failed to save leads');
      }
    } catch (err: any) {
      logger.error('Failed to save imported leads', err);
      setError(err.message || 'Failed to save leads');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Reset file selection
  // ---------------------------------------------------------------------------

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    setSelectedChannels([]);
    setShowExtraChannels(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const detectedChannels = importResult?.platforms?.available || [];
  const coverage = importResult?.platforms?.coverage || {};
  const enrichableCount = importResult?.platforms?.enrichableCount || 0;

  const extraChannels = Object.keys(CHANNEL_CONFIG).filter(
    (ch) => !detectedChannels.includes(ch) && !selectedChannels.includes(ch),
  );

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderChannelPill = (channelKey: string, isDetected: boolean) => {
    const config = CHANNEL_CONFIG[channelKey];
    if (!config) return null;

    const Icon = config.icon;
    const pct = coverage[channelKey] ?? 0;
    const isSelected = selectedChannels.includes(channelKey);
    const isEnrichable = enrichableCount > 0 && pct === 0;

    return (
      <div
        key={channelKey}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
          isSelected
            ? 'bg-white border border-slate-200 shadow-sm'
            : 'bg-slate-50 border border-slate-100 opacity-60'
        }`}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ backgroundColor: `${config.color}15` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
        </div>
        <span className="font-medium text-slate-700">{config.label}</span>
        <span className="ml-auto text-xs text-slate-400">
          {pct > 0 ? `${pct}%` : isEnrichable ? 'enrichable' : '0%'}
        </span>
        {isSelected && (
          <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full max-w-[480px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Header + Template Download                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Import Your Leads</h3>
        <p className="mt-1 text-sm text-slate-500">
          Upload any file with lead data: images (business cards, contact photos), PDFs, CSV, Excel, or text. All fields are optional.
        </p>

        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadTemplate('xlsx')}
            title="Download as Excel format (works with Excel, Google Sheets, Numbers, etc.)"
          >
            <Download className="h-4 w-4" />
            Excel (.xlsx)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadTemplate('csv')}
            title="Download as CSV format (compatible with all spreadsheet apps including Mac Numbers)"
          >
            <Download className="h-4 w-4" />
            CSV (.csv)
          </Button>
        </div>

        <p className="mt-2 text-xs text-slate-400">Download template in your preferred format. CSV works great with Mac Numbers!</p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Error display                                                      */}
      {/* ------------------------------------------------------------------ */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: File Upload                                             */}
      {/* ------------------------------------------------------------------ */}
      {!importResult && (
        <div className="mb-4">
          {!file || error ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <Upload className="mb-3 h-10 w-10 text-slate-400" />
              <p className="text-sm font-medium text-slate-600">
                Drag and drop your file here
              </p>
              <p className="my-1 text-xs text-slate-400">or</p>
              <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Browse Files
              </span>
              <p className="mt-2 text-xs text-slate-400">Images, PDFs, CSV, Excel · Any contact file</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.pdf,.txt,.json"
                className="hidden"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileUpload(selectedFile);
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {/* File info bar */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[260px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="rounded-md p-1 hover:bg-red-50 transition-colors"
                >
                  <X className="h-4 w-4 text-red-500" />
                </button>
              </div>

              {/* Loading spinner */}
              {isUploading && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="text-sm text-slate-500">Processing file...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Results                                                 */}
      {/* ------------------------------------------------------------------ */}
      {importResult && (
        <div className="space-y-4">
          {/* Lead count summary */}
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <div className="text-sm text-green-800">
              <span className="font-semibold">{importResult.totalLeads} leads</span> parsed
              successfully
              {importResult.skippedRows > 0 && (
                <span className="text-green-600">
                  {' '}({importResult.skippedRows} row{importResult.skippedRows !== 1 ? 's' : ''} skipped)
                </span>
              )}
            </div>
          </div>

          {/* File info */}
          {file && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-slate-700 truncate max-w-[260px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="rounded-md p-1 hover:bg-red-50 transition-colors"
              >
                <X className="h-4 w-4 text-red-500" />
              </button>
            </div>
          )}

          {/* Data preview table */}
          {importResult.preview && importResult.preview.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                Preview
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Name', 'Company', 'Email'].map((header) => (
                        <th
                          key={header}
                          className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {importResult.preview.slice(0, 5).map((row: any, idx: number) => (
                      <tr key={idx}>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                          {row.name || row.fullName || row.full_name || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                          {row.company || row.organization || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                          {row.email || row.emailAddress || row.email_address || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detected channels */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              Detected Channels
            </p>

            {enrichableCount > 0 && (
              <p className="mb-2 text-xs text-blue-600">
                {enrichableCount} lead{enrichableCount !== 1 ? 's' : ''} with name + company
                (enrichable from name+company)
              </p>
            )}

            <div className="grid grid-cols-1 gap-2">
              {PRIMARY_CHANNELS.map((ch) => renderChannelPill(ch, detectedChannels.includes(ch)))}
            </div>
          </div>

          {/* Add more channels */}
          {extraChannels.length > 0 && (
            <div>
              <button
                onClick={() => setShowExtraChannels((prev) => !prev)}
                className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                Add more channels
                {showExtraChannels ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showExtraChannels && (
                <div className="mt-2 space-y-2">
                  {extraChannels.map((channelKey) => {
                    const config = CHANNEL_CONFIG[channelKey];
                    if (!config) return null;
                    const Icon = config.icon;
                    const isSelected = selectedChannels.includes(channelKey);

                    return (
                      <div
                        key={channelKey}
                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-md"
                            style={{ backgroundColor: `${config.color}15` }}
                          >
                            <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {config.label}
                          </span>
                        </div>
                        <Switch
                          checked={isSelected}
                          onCheckedChange={() => toggleChannel(channelKey)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Section 4: Action Buttons                                        */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={handleConfirmImport}
              disabled={isSaving || selectedChannels.length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirm Import
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Cancel button when no results yet */}
      {!importResult && onCancel && (
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
