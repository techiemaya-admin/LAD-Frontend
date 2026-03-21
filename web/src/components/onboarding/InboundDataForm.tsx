'use client';
import React, { useState, useRef } from 'react';
import { InboundLeadData } from '@/store/onboardingStore';
import { 
  Download, 
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Eye,
  Trash2,
  ArrowLeft,
  FileUp
} from 'lucide-react';
import { logger } from '@/lib/logger';
interface ParsedLead {
  firstName: string;
  lastName: string;
  companyName: string;
  linkedinProfile: string;
  email: string;
  whatsapp: string;
  phone: string;
  website: string;
  notes: string;
}
interface InboundDataFormProps {
  onSubmit: (data: InboundLeadData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}
type UploadStep = 'download' | 'upload' | 'mapping' | 'preview';

interface ColumnMapping {
  firstName: number;
  lastName: number;
  companyName: number;
  linkedin: number;
  email: number;
  whatsapp: number;
  phone: number;
  website: number;
  notes: number;
}

export default function InboundDataForm({ onSubmit, onCancel, isSubmitting = false }: InboundDataFormProps) {
  const [step, setStep] = useState<UploadStep>('download');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    firstName: -1,
    lastName: -1,
    companyName: -1,
    linkedin: -1,
    email: -1,
    whatsapp: -1,
    phone: -1,
    website: -1,
    notes: -1,
  });
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Generate and download CSV template
  const downloadTemplate = () => {
    const headers = ['First Name', 'Last Name', 'Company Name', 'LinkedIn Profile URL', 'Email', 'WhatsApp Number', 'Phone Number', 'Website', 'Notes'];
    const exampleRow = ['John', 'Doe', 'DELETE THIS ROW - Example Corp', 'https://linkedin.com/in/johndoe', 'example@example.com', "'+1234567890", "'+1234567890", 'https://example.com', 'DELETE THIS ROW - Remove before uploading'];
    const instructionRow = ['Lead first name', 'Lead last name', 'INSTRUCTIONS: Format phone as TEXT in Excel', '', '', "Start with ' (apostrophe)", "Example: '+919087654321", '', 'Delete example rows before upload'];
    const emptyRows = Array(10).fill(headers.map(() => ''));
    // Create CSV content
    const csvContent = [
      headers.join(','),
      exampleRow.map(cell => `"${cell}"`).join(','),
      instructionRow.map(cell => `"${cell}"`).join(','),
      ...emptyRows.map(row => row.join(','))
    ].join('\n');
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inbound_leads_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logger.debug('CSV Template downloaded');
    // Move to upload step after short delay
    setTimeout(() => setStep('upload'), 800);
  };
  // Handle file drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };
  // Handle file selection via input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };
  // Parse CSV string into rows
  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // Skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell)) { // Only add non-empty rows
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        if (char === '\r') i++; // Skip \n in \r\n
      } else if (char !== '\r') {
        currentCell += char;
      }
    }
    // Add last cell and row
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell)) {
        rows.push(currentRow);
      }
    }
    return rows;
  };
  // Process uploaded file
  const processFile = async (file: File) => {
    setError(null);
    setIsProcessing(true);
    try {
      // Validate file type - CSV only now
      if (!file.name.match(/\.csv$/i)) {
        throw new Error('Please upload a CSV file (.csv)');
      }
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }
      setUploadedFile(file);
      // Read file content
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length <= 1) {
        throw new Error('The uploaded file is empty or only contains headers. Please add your lead data.');
      }
      // First row is headers
      const headers = rows[0];
      const dataRows = rows.slice(1);

      // Auto-detect column indices
      const detectedMapping: ColumnMapping = {
        firstName: headers.findIndex(h => h.toLowerCase().includes('first') && h.toLowerCase().includes('name')),
        lastName: headers.findIndex(h => h.toLowerCase().includes('last') && h.toLowerCase().includes('name')),
        companyName: headers.findIndex(h => h.toLowerCase().includes('company')),
        linkedin: headers.findIndex(h => h.toLowerCase().includes('linkedin')),
        email: headers.findIndex(h => h.toLowerCase().includes('email')),
        whatsapp: headers.findIndex(h => h.toLowerCase().includes('whatsapp')),
        phone: headers.findIndex(h => h.toLowerCase().includes('phone')),
        website: headers.findIndex(h => h.toLowerCase().includes('website')),
        notes: headers.findIndex(h => h.toLowerCase().includes('notes')),
      };

      // Store for mapping UI
      setCsvHeaders(headers);
      setCsvData(dataRows);
      setColumnMapping(detectedMapping);
      setStep('mapping');
      logger.debug('File parsed, ready for column mapping', { headerCount: headers.length, dataRowCount: dataRows.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process file';
      logger.error('File processing error', { error: message });
      setError(message);
      setUploadedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to fix phone numbers in scientific notation
  const fixPhoneNumber = (value: string): string => {
    if (!value) return '';
    let cleaned = value.replace(/[\s\-\(\)]/g, '');
    if (/^\d+\.?\d*e\+?\d+$/i.test(cleaned)) {
      const num = parseFloat(cleaned);
      cleaned = num.toFixed(0);
    }
    if (cleaned && !cleaned.startsWith('+') && cleaned.length > 10) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  };

  // Parse leads using column mapping
  const parseLeadsWithMapping = () => {
    setError(null);
    setIsProcessing(true);
    try {
      if (csvData.length === 0) {
        throw new Error('No data to parse');
      }

      const leads: ParsedLead[] = csvData
        .map(row => ({
          firstName: (columnMapping.firstName >= 0 ? row[columnMapping.firstName] : '') || '',
          lastName: (columnMapping.lastName >= 0 ? row[columnMapping.lastName] : '') || '',
          companyName: (columnMapping.companyName >= 0 ? row[columnMapping.companyName] : '') || '',
          linkedinProfile: (columnMapping.linkedin >= 0 ? row[columnMapping.linkedin] : '') || '',
          email: (columnMapping.email >= 0 ? row[columnMapping.email] : '') || '',
          whatsapp: fixPhoneNumber(columnMapping.whatsapp >= 0 ? row[columnMapping.whatsapp] : ''),
          phone: fixPhoneNumber(columnMapping.phone >= 0 ? row[columnMapping.phone] : ''),
          website: (columnMapping.website >= 0 ? row[columnMapping.website] : '') || '',
          notes: (columnMapping.notes >= 0 ? row[columnMapping.notes] : '') || '',
        }))
        .filter(lead => {
          // Filter out example/template rows
          const isExample =
            lead.companyName.toLowerCase().includes('example') ||
            lead.companyName.toLowerCase().includes('delete this') ||
            lead.notes.toLowerCase().includes('delete this row') ||
            lead.email.toLowerCase().includes('example.com');

          // Accept rows with any meaningful data (don't be too strict)
          const hasData =
            (lead.firstName && lead.firstName.trim()) ||
            (lead.lastName && lead.lastName.trim()) ||
            (lead.companyName && lead.companyName.trim()) ||
            (lead.email && lead.email.trim()) ||
            (lead.linkedinProfile && lead.linkedinProfile.trim()) ||
            (lead.phone && lead.phone.trim()) ||
            (lead.whatsapp && lead.whatsapp.trim());

          return !isExample && hasData;
        });

      if (leads.length === 0) {
        throw new Error('No valid leads found. Please check your column mapping and ensure your data is correct.');
      }

      logger.debug('Parsed leads from CSV with mapping', { count: leads.length });
      setParsedLeads(leads);
      setStep('preview');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse leads';
      logger.error('Error parsing leads', { error: message });
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove a lead from preview
  const removeLead = (index: number) => {
    setParsedLeads(prev => prev.filter((_, i) => i !== index));
    if (parsedLeads.length <= 1) {
      setStep('upload');
      resetUpload();
    }
  };
  // Reset upload state
  const resetUpload = () => {
    setUploadedFile(null);
    setParsedLeads([]);
    setCsvHeaders([]);
    setCsvData([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  // Submit the parsed leads
  const handleSubmit = () => {
    if (parsedLeads.length === 0) {
      setError('No leads to submit');
      return;
    }
    // Aggregate data from all leads into the format expected by the store
    const aggregatedData: InboundLeadData = {
      companyName: parsedLeads.length === 1 
        ? parsedLeads[0].companyName 
        : `${parsedLeads.length} Companies`,
      platforms: {
        linkedin: parsedLeads.some(l => l.linkedinProfile),
        email: parsedLeads.some(l => l.email),
        whatsapp: parsedLeads.some(l => l.whatsapp),
        website: parsedLeads.some(l => l.website),
        phone: parsedLeads.some(l => l.phone),
      },
      firstNames: parsedLeads.map(l => l.firstName).filter(Boolean),
      lastNames: parsedLeads.map(l => l.lastName).filter(Boolean),
      linkedinProfiles: parsedLeads.map(l => l.linkedinProfile).filter(Boolean),
      emailIds: parsedLeads.map(l => l.email).filter(Boolean),
      whatsappNumbers: parsedLeads.map(l => l.whatsapp).filter(Boolean),
      websiteUrl: parsedLeads.find(l => l.website)?.website || '',
      phoneNumbers: parsedLeads.map(l => l.phone).filter(Boolean),
      notes: `Uploaded ${parsedLeads.length} lead(s). ${parsedLeads.map(l => l.notes).filter(Boolean).join(' | ')}`,
    };
    logger.debug('Submitting aggregated inbound data', { 
      leadCount: parsedLeads.length,
      platforms: aggregatedData.platforms 
    });
    onSubmit(aggregatedData);
  };
  // Get platform counts for summary
  const getPlatformCounts = () => {
    return {
      linkedin: parsedLeads.filter(l => l.linkedinProfile).length,
      email: parsedLeads.filter(l => l.email).length,
      whatsapp: parsedLeads.filter(l => l.whatsapp).length,
      phone: parsedLeads.filter(l => l.phone).length,
      website: parsedLeads.filter(l => l.website).length,
    };
  };
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-2xl w-full max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import Inbound Leads</h2>
              <p className="text-sm text-gray-600">Download template → Add your leads → Upload</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/60 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>
      {/* Steps Progress Indicator */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          {[
            { key: 'download', label: 'Download Template', icon: Download },
            { key: 'upload', label: 'Upload File', icon: Upload },
            { key: 'mapping', label: 'Map Columns', icon: FileSpreadsheet },
            { key: 'preview', label: 'Review & Submit', icon: Eye },
          ].map((s, index) => {
            const Icon = s.icon;
            const isActive = step === s.key;
            const isComplete =
              (s.key === 'download' && (step === 'upload' || step === 'mapping' || step === 'preview')) ||
              (s.key === 'upload' && (step === 'mapping' || step === 'preview')) ||
              (s.key === 'mapping' && step === 'preview');
            return (
              <React.Fragment key={s.key}>
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isComplete ? 'bg-green-500 text-white' :
                    isActive ? 'bg-green-100 text-green-600 ring-2 ring-green-500' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${
                    isActive || isComplete ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {index < 3 && (
                  <div className={`flex-1 h-0.5 mx-3 rounded ${
                    isComplete ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {/* Content Area */}
      <div className="p-5 overflow-y-auto flex-1 min-h-0">
        {/* Step 1: Download Template */}
        {step === 'download' && (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <FileSpreadsheet className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Step 1: Download Template
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
              Download our Excel template, fill in your inbound leads data with contact information, 
              then upload it back. We'll analyze and set up your campaign automatically.
            </p>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium shadow-lg shadow-green-200 hover:shadow-green-300 hover:-translate-y-0.5"
            >
              <Download className="w-5 h-5" />
              Download Template (.csv)
            </button>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Already have leads in a spreadsheet?{' '}
                <button 
                  onClick={() => setStep('upload')} 
                  className="text-green-600 hover:text-green-700 font-medium hover:underline"
                >
                  Skip to upload →
                </button>
              </p>
            </div>
          </div>
        )}
        {/* Step 2: Upload File */}
        {step === 'upload' && (
          <div className="py-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                isProcessing 
                  ? 'border-gray-300 bg-gray-50' 
                  : 'border-gray-300 hover:border-green-500 hover:bg-green-50/50'
              }`}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-14 h-14 text-green-600 animate-spin mb-4" />
                  <p className="text-gray-700 font-medium">Processing your file...</p>
                  <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileUp className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Upload Your Leads File
                  </h3>
                  <p className="text-gray-600 mb-3">
                    Click to browse or drag and drop your file here
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports: <span className="font-medium">.csv</span> (max 5MB)
                  </p>
                </>
              )}
            </div>
            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Upload Error</p>
                  <p className="text-sm text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}
            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
              <button 
                onClick={() => setStep('download')} 
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to download template
              </button>
            </div>
          </div>
        )}
        {/* Step 3: Map Columns */}
        {step === 'mapping' && (
          <div className="py-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Map Your Columns</h3>
            <p className="text-gray-600 mb-6">
              We found {csvHeaders.length} column(s) in your file. Please map them to the correct fields below:
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Mapping Error</p>
                  <p className="text-sm text-red-600 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { key: 'firstName', label: 'First Name' },
                { key: 'lastName', label: 'Last Name' },
                { key: 'companyName', label: 'Company Name' },
                { key: 'linkedin', label: 'LinkedIn URL' },
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Phone Number' },
                { key: 'whatsapp', label: 'WhatsApp Number' },
                { key: 'website', label: 'Website' },
                { key: 'notes', label: 'Notes' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                  </label>
                  <select
                    value={columnMapping[field.key as keyof ColumnMapping]}
                    onChange={(e) => {
                      setColumnMapping(prev => ({
                        ...prev,
                        [field.key]: parseInt(e.target.value),
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="-1">-- Not Used --</option>
                    {csvHeaders.map((header, idx) => (
                      <option key={idx} value={idx}>
                        {header} {idx === 0 ? '(Column A)' : idx === 1 ? '(Column B)' : idx === 2 ? '(Column C)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {csvData.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm text-blue-700">
                  <strong>Preview:</strong> {csvData.length} rows of data will be parsed using your mapping.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={() => { setStep('upload'); resetUpload(); }}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to upload
              </button>
              <button
                onClick={parseLeadsWithMapping}
                disabled={isProcessing}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 transition-all font-medium shadow-lg shadow-green-200 hover:shadow-green-300 hover:-translate-y-0.5"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Confirm Mapping & Continue
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        {/* Step 4: Preview & Review */}
        {step === 'preview' && (
          <div>
            {/* File Info */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {parsedLeads.length} Lead{parsedLeads.length !== 1 ? 's' : ''} Found
                  </h3>
                  <p className="text-sm text-gray-500">
                    From: {uploadedFile?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setStep('upload'); resetUpload(); }}
                className="text-sm text-gray-600 hover:text-green-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Different File
              </button>
            </div>
            {/* Leads List */}
            {parsedLeads.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No leads remaining. Please upload a new file.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {parsedLeads.map((lead, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {lead.firstName || lead.lastName ? `${lead.firstName} ${lead.lastName}`.trim() : `Lead ${index + 1}`}
                        </h4>
                        {lead.companyName && (
                          <p className="text-sm text-gray-600 mt-0.5">
                            🏢 {lead.companyName}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {lead.email && (
                            <span className="inline-flex items-center text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md">
                              ✉️ {lead.email}
                            </span>
                          )}
                          {lead.linkedinProfile && (
                            <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                              🔗 LinkedIn
                            </span>
                          )}
                          {lead.whatsapp && (
                            <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md">
                              💬 {lead.whatsapp}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="inline-flex items-center text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-md">
                              📞 {lead.phone}
                            </span>
                          )}
                          {lead.website && (
                            <span className="inline-flex items-center text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-md">
                              🌐 Website
                            </span>
                          )}
                        </div>
                        {lead.notes && (
                          <p className="mt-2 text-xs text-gray-500 truncate">
                            📝 {lead.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeLead(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Remove lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Platform Summary */}
            {parsedLeads.length > 0 && (
              <div className="mt-5 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <h4 className="text-sm font-semibold text-green-800 mb-3">
                  📊 Detected Contact Channels
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const counts = getPlatformCounts();
                    return (
                      <>
                        {counts.linkedin > 0 && (
                          <span className="text-xs bg-white text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                            🔗 LinkedIn ({counts.linkedin})
                          </span>
                        )}
                        {counts.email > 0 && (
                          <span className="text-xs bg-white text-red-700 px-3 py-1.5 rounded-full border border-red-200 font-medium">
                            ✉️ Email ({counts.email})
                          </span>
                        )}
                        {counts.whatsapp > 0 && (
                          <span className="text-xs bg-white text-green-700 px-3 py-1.5 rounded-full border border-green-200 font-medium">
                            💬 WhatsApp ({counts.whatsapp})
                          </span>
                        )}
                        {counts.phone > 0 && (
                          <span className="text-xs bg-white text-orange-700 px-3 py-1.5 rounded-full border border-orange-200 font-medium">
                            📞 Phone ({counts.phone})
                          </span>
                        )}
                        {counts.website > 0 && (
                          <span className="text-xs bg-white text-purple-700 px-3 py-1.5 rounded-full border border-purple-200 font-medium">
                            🌐 Website ({counts.website})
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                <p className="text-xs text-green-700 mt-3">
                  ✨ I'll ask relevant setup questions based on these channels
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Footer Actions */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        {step === 'preview' && parsedLeads.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Leads...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Analyze {parsedLeads.length} Lead{parsedLeads.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}