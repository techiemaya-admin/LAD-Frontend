import { apiClient } from '../../../shared/apiClient';

/**
 * Data Import API client
 */

export const dataImportAPI = {
  /**
   * Get available import sheet options
   */
  getOptions: async () => {
    const response = await apiClient.get('/api/community-roi/data-import/options');
    return response.data;
  },

  /**
   * Extract data from Excel file
   */
  extract: async (excelFilePath: string, sheetType: string = 'all') => {
    const response = await apiClient.post('/api/community-roi/data-import/extract', {
      excelFilePath,
      sheetType,
    });
    return response.data;
  },

  /**
   * Execute SQL import for extracted data
   */
  executeImport: async (sheetTypes?: string[]) => {
    const response = await apiClient.post('/api/community-roi/data-import/execute', {
      sheetTypes: sheetTypes || ['all'],
    });
    return response.data;
  },

  /**
   * Get import status and pending files
   */
  getStatus: async () => {
    const response = await apiClient.get('/api/community-roi/data-import/status');
    return response.data;
  },
};

export default dataImportAPI;
