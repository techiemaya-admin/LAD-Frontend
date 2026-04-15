'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDataImportOptions,
  useExecuteImport,
} from '../services/useDataImport';
import { Loader2, FileUp, CheckCircle, AlertCircle, Upload, FolderOpen } from 'lucide-react';

interface ImportOption {
  id: string;
  label: string;
  description: string;
  targetTable: string;
  icon: string;
}

/** Whether the selected import type uses the member-files folder upload path */
const isMemberFilesMode = (sheet: string) => sheet === 'member_files';

export function DataImportModal() {
  const [open, setOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [step, setStep] = useState<'select' | 'extract' | 'execute' | 'complete'>('select');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const { data: optionsData, isLoading: optionsLoading } = useDataImportOptions();
  const executeMutation = useExecuteImport();

  const options = optionsData?.data || [];
  const memberMode = isMemberFilesMode(selectedSheet);

  // ── single file picker ──────────────────────────────────────────────────
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.match(/\.(xlsx?|csv)$/i)) {
        setError('Please select a valid Excel file (.xlsx, .xls) or CSV file');
        return;
      }
      setError(null);
      setSelectedFile(file);
    }
  };

  // ── folder / multi-file picker ──────────────────────────────────────────
  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const xlsx = Array.from(files).filter(f => f.name.match(/\.xlsx?$/i));
    if (xlsx.length === 0) {
      setError('No .xlsx files found in the selected folder');
      return;
    }
    setError(null);
    setSelectedFiles(xlsx);
  };

  // ── extract (single Excel file) ─────────────────────────────────────────
  const handleExtract = async () => {
    if (!selectedFile) {
      setError('Please select an Excel file');
      return;
    }
    try {
      setError(null);
      setIsExtracting(true);
      setStep('extract');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sheetType', selectedSheet);

      const response = await fetch('/api/community-roi/data-import/extract', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to extract data');
      }

      const result = await response.json();
      setExtractedData(result.data);
      setStep('extract');
    } catch (err: any) {
      setError(`Extraction failed: ${err.message}`);
      setStep('select');
    } finally {
      setIsExtracting(false);
    }
  };

  // ── extract (member report folder) ─────────────────────────────────────
  const handleExtractMemberFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select a folder containing member report files');
      return;
    }
    try {
      setError(null);
      setIsExtracting(true);
      setStep('extract');

      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('files', f));

      const response = await fetch('/api/community-roi/data-import/extract-member-files', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to process member files');
      }

      const result = await response.json();
      setExtractedData(result.data);
      setStep('extract');
    } catch (err: any) {
      setError(`Extraction failed: ${err.message}`);
      setStep('select');
    } finally {
      setIsExtracting(false);
    }
  };

  // ── execute SQL import ──────────────────────────────────────────────────
  const handleExecute = async () => {
    try {
      setError(null);
      setIsExecuting(true);
      setStep('execute');

      const sheetsToImport = memberMode
        ? ['interactions', 'referrals', 'combination']
        : selectedSheet === 'all'
        ? ['interactions', 'referrals', 'combination', 'tyfcb']
        : [selectedSheet];

      const response = await fetch('/api/community-roi/data-import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sheetTypes: sheetsToImport }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to execute import');
      }

      setStep('complete');
      setTimeout(() => {
        setOpen(false);
        resetState();
      }, 3000);
    } catch (err: any) {
      setError(`Import execution failed: ${err.message}`);
      setStep('execute');
    } finally {
      setIsExecuting(false);
    }
  };

  const resetState = () => {
    setStep('select');
    setSelectedSheet('all');
    setSelectedFile(null);
    setSelectedFiles([]);
    setExtractedData(null);
    setError(null);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect({ target: { files } } as any);
    }
  };

  const canExtract = memberMode ? selectedFiles.length > 0 : !!selectedFile;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700">
          <FileUp className="h-4 w-4" />
          Import Data
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Data from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file or a folder of member report files to import data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* ── Step: Select ── */}
          {step === 'select' && (
            <>
              {/* Import type dropdown */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Choose Import Type</label>
                <Select
                  value={selectedSheet}
                  onValueChange={(v) => {
                    setSelectedSheet(v);
                    setSelectedFile(null);
                    setSelectedFiles([]);
                    setError(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* ── NEW: Member reports folder ── */}
                    <SelectItem value="member_files">
                      📁 Member Reports Folder (BNI Cohesion files)
                    </SelectItem>

                    <SelectItem value="all">
                      All Sheets (Interactions + Referrals + Contribution + TYFCB)
                    </SelectItem>
                    {options.map((option: ImportOption) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.icon} {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Description for selected type */}
                {memberMode && (
                  <p className="text-xs text-gray-600 mt-1">
                    Select a folder containing individual member .xlsx files (e.g.
                    BNI_Rising_Phoenix/). Each file's "Cohesion" sheet is read and mapped to:
                    interactions (type 1), referrals (type 2), and relationship scores (type 3).
                  </p>
                )}
                {!memberMode && options.find((o: ImportOption) => o.id === selectedSheet) && (
                  <p className="text-xs text-gray-600 mt-1">
                    {options.find((o: ImportOption) => o.id === selectedSheet)?.description}
                  </p>
                )}
              </div>

              {/* ── Folder picker (member_files mode) ── */}
              {memberMode && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Member Reports Folder</label>

                  {/* Hidden folder input */}
                  <input
                    ref={folderInputRef}
                    type="file"
                    accept=".xlsx"
                    multiple
                    // @ts-ignore — non-standard but widely supported
                    webkitdirectory=""
                    onChange={handleFolderSelect}
                    className="hidden"
                  />

                  <div
                    onClick={() => folderInputRef.current?.click()}
                    className="w-full px-4 py-6 border-2 border-dashed border-amber-300 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer"
                  >
                    <FolderOpen className="h-8 w-8 text-amber-400" />
                    {selectedFiles.length > 0 ? (
                      <div className="text-center">
                        <p className="font-medium text-gray-900">
                          {selectedFiles.length} member file{selectedFiles.length !== 1 ? 's' : ''} selected
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Click to change selection
                        </p>
                        <div className="mt-2 max-h-24 overflow-y-auto text-xs text-gray-400 text-left space-y-0.5">
                          {selectedFiles.slice(0, 8).map(f => (
                            <div key={f.name}>{f.name}</div>
                          ))}
                          {selectedFiles.length > 8 && (
                            <div className="text-gray-400">…and {selectedFiles.length - 8} more</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="font-medium text-gray-900">Click to select folder</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Select the BNI_Rising_Phoenix folder — all .xlsx files will be read
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Single file picker (other modes) ── */}
              {!memberMode && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload Excel File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <div className="text-center">
                      {selectedFile ? (
                        <>
                          <p className="font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-gray-900">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-500 mt-1">Excel (.xlsx, .xls) or CSV files</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button
                onClick={memberMode ? handleExtractMemberFiles : handleExtract}
                className="w-full"
                disabled={!canExtract || optionsLoading || isExtracting}
              >
                {optionsLoading || isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {optionsLoading ? 'Loading options...' : 'Processing files...'}
                  </>
                ) : memberMode ? (
                  `Process ${selectedFiles.length || ''} Member File${selectedFiles.length !== 1 ? 's' : ''}`
                ) : (
                  'Next: Extract Data'
                )}
              </Button>
            </>
          )}

          {/* ── Step: Extract (loading) ── */}
          {step === 'extract' && !extractedData && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">
                {memberMode ? 'Processing member report files...' : 'Extracting data from Excel...'}
              </p>
              <p className="text-xs text-gray-500">This may take a moment</p>
            </div>
          )}

          {/* ── Step: Execute (loading) ── */}
          {step === 'execute' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Importing data to database...</p>
              {extractedData?.recordCounts && (
                <div className="text-xs text-gray-600 space-y-1 text-center">
                  <p>Interactions: {extractedData.recordCounts.interactions ?? 0}</p>
                  <p>Referrals: {extractedData.recordCounts.referrals ?? 0}</p>
                  <p>Relationship scores: {extractedData.recordCounts.relationship_scores ?? extractedData.recordCounts.combination ?? 0}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step: Complete ── */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <p className="text-sm font-medium">Import completed successfully!</p>
              <p className="text-xs text-gray-600 text-center">
                The modal will close in a few seconds.
              </p>
            </div>
          )}

          {/* ── Extraction summary (shown after extract, before execute) ── */}
          {extractedData && step === 'extract' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2">
              <h4 className="text-sm font-semibold text-blue-900">
                {memberMode
                  ? `Processed ${extractedData.filesProcessed ?? selectedFiles.length} member files`
                  : 'Extraction complete'}
              </h4>
              <div className="text-xs text-blue-800 space-y-1">
                {extractedData.recordCounts &&
                  Object.entries(extractedData.recordCounts).map(([k, v]: [string, any]) => {
                    // Skip nested objects (like relationship_scores_by_type)
                    if (typeof v === 'object' && v !== null) {
                      return null;
                    }
                    return (
                      <p key={k}>
                        <span className="font-medium capitalize">{k.replace(/_/g, ' ')}</span>: {v} records
                      </p>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── Non-select errors ── */}
          {error && step !== 'select' && (
            <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Import failed</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Execute / Back buttons ── */}
        {step === 'extract' && extractedData && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => { setStep('select'); setExtractedData(null); }}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleExecute}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isExecuting}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Executing...
                </>
              ) : (
                'Execute Import'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DataImportModal;
