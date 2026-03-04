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
import { Loader2, FileUp, CheckCircle, AlertCircle, Upload } from 'lucide-react';

interface ImportOption {
  id: string;
  label: string;
  description: string;
  targetTable: string;
  icon: string;
}

export function DataImportModal() {
  const [open, setOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<'select' | 'extract' | 'execute' | 'complete'>('select');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: optionsData, isLoading: optionsLoading } = useDataImportOptions();
  const executeMutation = useExecuteImport();

  const options = optionsData?.data || [];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Validate file type
      if (!file.name.match(/\.(xlsx?|csv)$/i)) {
        setError('Please select a valid Excel file (.xlsx, .xls) or CSV file');
        return;
      }
      setError(null);
      setSelectedFile(file);
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) {
      setError('Please select an Excel file');
      return;
    }

    try {
      setError(null);
      setIsExtracting(true);
      setStep('extract');
      
      // Create FormData to send file
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
        throw new Error(errorData.message || 'Failed to extract data');
      }

      const result = await response.json();
      setExtractedData(result.data);
      setStep('extract');
    } catch (error: any) {
      setError(`Extraction failed: ${error.message}`);
      setStep('select');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExecute = async () => {
    try {
      setError(null);
      setIsExecuting(true);
      setStep('execute');
      const sheetsToImport =
        selectedSheet === 'all'
          ? ['interactions', 'referrals', 'combination', 'tyfcb']
          : [selectedSheet];

      const response = await fetch('/api/community-roi/data-import/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sheetTypes: sheetsToImport,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to execute import');
      }

      setStep('complete');
      setTimeout(() => {
        setOpen(false);
        setStep('select');
        setSelectedSheet('all');
        setSelectedFile(null);
        setExtractedData(null);
        setError(null);
      }, 3000);
    } catch (error: any) {
      setError(`Import execution failed: ${error.message}`);
      setStep('execute');
    } finally {
      setIsExecuting(false);
    }
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
      handleFileSelect({
        target: { files },
      } as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-2 bg-amber-600 hover:bg-amber-700"
        >
          <FileUp className="h-4 w-4" />
          Import Data
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Data from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file and select which sheet type to import
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step: Select */}
          {step === 'select' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Choose Import Type</label>
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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

                {options.find((o: ImportOption) => o.id === selectedSheet) && (
                  <p className="text-xs text-gray-600 mt-1">
                    {
                      options.find((o: ImportOption) => o.id === selectedSheet)
                        ?.description
                    }
                  </p>
                )}
              </div>

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

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleExtract} 
                className="w-full" 
                disabled={!selectedFile || optionsLoading || isExtracting}
              >
                {optionsLoading || isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {optionsLoading ? 'Loading options...' : 'Extracting...'}
                  </>
                ) : (
                  'Next: Extract Data'
                )}
              </Button>
            </>
          )}

          {/* Step: Extract */}
          {step === 'extract' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Extracting data from Excel...</p>
              <p className="text-xs text-gray-500">This may take a moment depending on file size</p>
            </div>
          )}

          {/* Step: Execute */}
          {step === 'execute' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Importing data to database...</p>
              {extractedData?.recordCounts && (
                <>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>Interactions: {extractedData.recordCounts.interactions || 0}</p>
                    <p>Referrals: {extractedData.recordCounts.referrals || 0}</p>
                    <p>Contributions: {extractedData.recordCounts.contribution || 0}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <p className="text-sm font-medium">✅ Import completed successfully!</p>
              <p className="text-xs text-gray-600 text-center">
                Your data has been imported. The modal will close in a few seconds.
              </p>
            </div>
          )}

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

        {/* Action buttons */}
        {step === 'extract' && extractedData && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setStep('select');
              }}
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
