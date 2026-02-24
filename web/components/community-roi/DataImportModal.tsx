'use client';

import React, { useState } from 'react';
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
  useExtractData,
  useExecuteImport,
  useImportStatus,
} from '../hooks/useDataImport';
import { Loader2, FileUp, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [excelFilePath, setExcelFilePath] = useState<string>('');
  const [step, setStep] = useState<'select' | 'extract' | 'execute' | 'complete'>('select');
  const [extractedData, setExtractedData] = useState<any>(null);

  const { data: optionsData, isLoading: optionsLoading } = useDataImportOptions();
  const extractMutation = useExtractData();
  const executeMutation = useExecuteImport();
  const { data: importStatus } = useImportStatus();

  const options = optionsData?.data || [];

  const handleExtract = async () => {
    if (!excelFilePath) {
      alert('Please enter Excel file path');
      return;
    }

    try {
      setStep('extract');
      const result = await extractMutation.mutateAsync({
        excelFilePath,
        sheetType: selectedSheet,
      });
      setExtractedData(result.data);
    } catch (error: any) {
      alert(`Extraction failed: ${error.message}`);
      setStep('select');
    }
  };

  const handleExecute = async () => {
    try {
      setStep('execute');
      const sheetsToImport =
        selectedSheet === 'all'
          ? ['interactions', 'referrals', 'combination', 'tyfcb']
          : [selectedSheet];

      await executeMutation.mutateAsync({
        sheetTypes: sheetsToImport,
      });

      setStep('complete');
      setTimeout(() => {
        setOpen(false);
        setStep('select');
        setSelectedSheet('all');
        setExcelFilePath('');
      }, 3000);
    } catch (error: any) {
      alert(`Import execution failed: ${error.message}`);
      setStep('execute');
    }
  };

  const isLoading =
    optionsLoading ||
    extractMutation.isPending ||
    executeMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-2"
        >
          <FileUp className="h-4 w-4" />
          Import Data
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Data from Excel</DialogTitle>
          <DialogDescription>
            Choose a sheet type and provide the Excel file path to import data
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
                      All Sheets (Interactions + Referrals + Combination + TYFCB)
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
                <label className="text-sm font-medium">Excel File Path</label>
                <input
                  type="text"
                  value={excelFilePath}
                  onChange={(e) => setExcelFilePath(e.target.value)}
                  placeholder="e.g. /path/to/BNI_analysis.xlsx"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExtract}
                  disabled={!excelFilePath || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Extracting...
                    </>
                  ) : (
                    'Extract Data'
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Step: Extract */}
          {step === 'extract' && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm font-medium">Extracting data from Excel...</p>
              <p className="text-xs text-gray-500">This may take a few moments</p>
            </div>
          )}

          {/* Step: Execute */}
          {step === 'execute' && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
              <p className="text-sm font-medium">Importing data to database...</p>
              <p className="text-xs text-gray-500">
                {extractedData?.recordCounts
                  ? `Processing ${JSON.stringify(extractedData.recordCounts)}`
                  : 'Processing...'}
              </p>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium">Import completed successfully!</p>
              <p className="text-xs text-gray-500">
                {selectedSheet === 'all' ? 'All sheets' : `${selectedSheet}`}{' '}
                have been imported
              </p>
            </div>
          )}

          {/* Show extracted data summary after extraction */}
          {extractedData && (step === 'execute' || step === 'complete') && (
            <div className="bg-blue-50 p-3 rounded-md space-y-2 border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900">
                Extraction Summary
              </h4>
              <div className="text-xs space-y-1 text-blue-800">
                {extractedData.generatedFiles?.map((file: any) => (
                  <p key={file.type}>
                    {file.type}: {file.name}
                  </p>
                ))}
              </div>
              {extractedData.recordCounts && (
                <div className="text-xs space-y-1 text-blue-800 border-t border-blue-200 pt-2">
                  <p className="font-semibold">Record Counts:</p>
                  {Object.entries(extractedData.recordCounts).map(
                    ([key, count]: [string, any]) => (
                      <p key={key}>
                        {key}: {count}
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {(extractMutation.isError || executeMutation.isError) && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200 flex gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-xs text-red-700">
                  {extractMutation.error?.message ||
                    executeMutation.error?.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons for execute step */}
        {step === 'complete' && (
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        )}

        {extractedData && step === 'execute' && (
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setStep('select');
                setExtractedData(null);
              }}
            >
              Back
            </Button>
            <Button onClick={handleExecute} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                'Proceed to Import'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DataImportModal;
