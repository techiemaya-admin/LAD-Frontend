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

export default DataImportButton;
