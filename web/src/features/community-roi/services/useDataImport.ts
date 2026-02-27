/**
 * Data Import React Hooks
 * Provides state management for data import operations using React Query
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataImportAPI } from './dataImportAPI';

interface ImportOption {
  id: string;
  label: string;
  description: string;
  targetTable: string;
  icon: string;
}

interface ExtractedData {
  recordCounts: {
    interactions?: number;
    referrals?: number;
    combination?: number;
    contribution?: number;
  };
  sqlFiles: string[];
  timestamp: string;
}

/**
 * Fetch available import options
 */
export function useDataImportOptions() {
  return useQuery({
    queryKey: ['dataImportOptions'],
    queryFn: async () => {
      const result = await dataImportAPI.getOptions();
      return result as { data: ImportOption[] };
    },
    staleTime: Infinity, // Options rarely change
  });
}

/**
 * Extract data from Excel file
 */
export function useExtractData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ excelFilePath, sheetType }: { excelFilePath: string; sheetType: string }) => {
      const result = await dataImportAPI.extract(excelFilePath, sheetType);
      return result as { success: boolean; data: ExtractedData };
    },
    onSuccess: () => {
      // Invalidate status to refresh pending imports
      queryClient.invalidateQueries({ queryKey: ['importStatus'] });
    },
  });
}

/**
 * Execute import operation
 */
export function useExecuteImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sheetTypes }: { sheetTypes?: string[] } = {}) => {
      const result = await dataImportAPI.executeImport(sheetTypes);
      return result as { success: boolean; message: string };
    },
    onSuccess: () => {
      // Invalidate status after completion
      queryClient.invalidateQueries({ queryKey: ['importStatus'] });
    },
  });
}

/**
 * Get current import status
 */
export function useImportStatus() {
  return useQuery({
    queryKey: ['importStatus'],
    queryFn: async () => {
      const result = await dataImportAPI.getStatus();
      return result as {
        pendingFiles: string[];
        generatedFiles: string[];
        lastImport?: string;
      };
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

export default {
  useDataImportOptions,
  useExtractData,
  useExecuteImport,
  useImportStatus,
};
