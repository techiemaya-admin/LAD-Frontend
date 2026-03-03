/**
 * Data Import API Client
 * Handles all HTTP calls to the data import endpoints
 */

const API_BASE_URL = '/api/community-roi/data-import';

interface ExtractDataRequest {
  excelFilePath: string;
  sheetType?: 'all' | 'interactions' | 'referrals' | 'combination' | 'tyfcb';
}

interface ExecuteImportRequest {
  sheetTypes?: string[];
}

interface ImportOption {
  id: string;
  label: string;
  description: string;
  targetTable: string;
  icon: string;
}

export const dataImportAPI = {
  /**
   * Get available import options
   */
  async getOptions() {
    const response = await fetch(`${API_BASE_URL}/options`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get import options: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Extract data from Excel file (stage 2)
   */
  async extract(excelFilePath: string, sheetType: string = 'all') {
    const response = await fetch(`${API_BASE_URL}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        excelFilePath,
        sheetType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to extract data: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Execute import (stage 3)
   */
  async executeImport(sheetTypes: string[] = ['all']) {
    const response = await fetch(`${API_BASE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        sheetTypes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to execute import: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get import status
   */
  async getStatus() {
    const response = await fetch(`${API_BASE_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get import status: ${response.statusText}`);
    }

    return response.json();
  },
};

export default dataImportAPI;
