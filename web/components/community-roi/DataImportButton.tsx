'use client';

import React from 'react';
import { FileUp } from 'lucide-react';
import DataImportModal from './DataImportModal';

/**
 * DataImportButton - Button to open data import modal
 * Can be placed next to "Log Interaction" button
 */
export function DataImportButton() {
  return (
    <div className="flex items-center">
      <DataImportModal />
    </div>
  );
}

/**
 * Simple import button without modal - opens file picker and triggers import
 */
export function QuickImportButton() {
  return (
    <button
      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors gap-2"
      onClick={() => {
        // This would trigger the modal
        document.getElementById('data-import-trigger')?.click();
      }}
    >
      <FileUp className="h-4 w-4" />
      Import Data
    </button>
  );
}

export default DataImportButton;
