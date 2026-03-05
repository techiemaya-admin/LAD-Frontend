import { useMutation, useQuery } from '@tanstack/react-query';
import { communityROIApiClient } from '../communityROIApiClient';

/**
 * Get available import sheet options
 */
export function useDataImportOptions() {
  return useQuery({
    queryKey: ['community-roi', 'data-import-options'],
    queryFn: async () => {
      const response = await communityROIApiClient.get('/api/community-roi/data-import/options');
      return response.data;
    }
  });
}

/**
 * Extract data from Excel file
 */
export function useExtractData() {
  return useMutation({
    mutationFn: async ({ excelFilePath, sheetType = 'all' }: { excelFilePath: string; sheetType?: string }) => {
      const response = await communityROIApiClient.post('/api/community-roi/data-import/extract', {
        excelFilePath,
        sheetType
      });
      return response.data;
    }
  });
}

/**
 * Execute SQL import for extracted data
 */
export function useExecuteImport() {
  return useMutation({
    mutationFn: async ({ sheetTypes = ['all'] }: { sheetTypes?: string[] }) => {
      const response = await communityROIApiClient.post('/api/community-roi/data-import/execute', {
        sheetTypes: Array.isArray(sheetTypes) ? sheetTypes : [sheetTypes]
      });
      return response.data;
    }
  });
}

/**
 * Get import status and pending files
 */
export function useImportStatus() {
  return useQuery({
    queryKey: ['community-roi', 'import-status'],
    queryFn: async () => {
      const response = await communityROIApiClient.get('/api/community-roi/data-import/status');
      return response.data;
    },
    refetchInterval: 5000 // Refresh every 5 seconds
  });
}
