'use client';

import React, { useState, useRef } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { apiUpload } from '@/lib/api';
import { Upload, FileText, X, ArrowLeft, ArrowRight, Check } from 'lucide-react';

export default function Screen2InboundUpload() {
  const { setInboundFile, setCurrentScreen } = useOnboardingStore();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [fieldMapping, setFieldMapping] = useState({
    name: '',
    email: '',
    linkedin: '',
    company: '',
    phone: '',
    title: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      alert('Please upload a valid Excel (.xlsx, .xls) or CSV file');
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);

    try {
      // Upload file to backend
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await apiUpload<{
        success: boolean;
        preview: any[];
        headers: string[];
      }>('/api/onboarding/inbound/upload', formData);

      if (response.success && response.preview) {
        setPreview(response.preview);
        // Auto-map common fields
        if (response.headers) {
          const headers = response.headers.map((h: string) => h.toLowerCase());
          const autoMapping: any = {};
          
          headers.forEach((header: string) => {
            if (header.includes('name') || header.includes('full name')) autoMapping.name = header;
            if (header.includes('email') || header.includes('e-mail')) autoMapping.email = header;
            if (header.includes('linkedin') || header.includes('linked in')) autoMapping.linkedin = header;
            if (header.includes('company') || header.includes('organization')) autoMapping.company = header;
            if (header.includes('phone') || header.includes('mobile')) autoMapping.phone = header;
            if (header.includes('title') || header.includes('position') || header.includes('job')) autoMapping.title = header;
          });
          
          setFieldMapping(autoMapping);
        }
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleContinue = () => {
    if (!file) return;

    const inboundFileData = {
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      mappedFields: fieldMapping,
      preview,
    };

    setInboundFile(inboundFileData);
    setCurrentScreen(5); // Move to workflow setup
  };

  const availableFields = preview.length > 0 
    ? Object.keys(preview[0] || {})
    : [];

  return (
    <div className="relative w-full h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="w-full max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => setCurrentScreen(2)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Upload Your Leads
            </h1>
            <p className="text-xl text-gray-600">
              Upload your Excel or CSV file with your leads
            </p>
          </div>

          {/* File Upload Area */}
          <div className="bg-white rounded-2xl p-8 mb-8 shadow-lg">
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-semibold text-gray-700 mb-2">
                  Drag and drop your file here
                </p>
                <p className="text-gray-500 mb-4">or</p>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Browse Files
                </button>
                <p className="text-sm text-gray-400 mt-4">
                  Supports .xlsx, .xls, and .csv files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) handleFileSelect(selectedFile);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-semibold text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview([]);
                      setFieldMapping({
                        name: '',
                        email: '',
                        linkedin: '',
                        company: '',
                        phone: '',
                        title: '',
                      });
                    }}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-red-600" />
                  </button>
                </div>

                {isUploading && (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Processing file...</p>
                  </div>
                )}

                {preview.length > 0 && (
                  <>
                    {/* Field Mapping */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Map Your Fields
                      </h3>
                      <p className="text-sm text-gray-600">
                        Match your file columns to our standard fields
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(fieldMapping).map(([key, value]) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                              {key}
                            </label>
                            <select
                              value={value}
                              onChange={(e) =>
                                setFieldMapping({ ...fieldMapping, [key]: e.target.value })
                              }
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select column...</option>
                              {availableFields.map((field) => (
                                <option key={field} value={field}>
                                  {field}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Preview (First 5 rows)
                      </h3>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {availableFields.map((field) => (
                                <th
                                  key={field}
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                                >
                                  {field}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {preview.slice(0, 5).map((row, idx) => (
                              <tr key={idx}>
                                {availableFields.map((field) => (
                                  <td
                                    key={field}
                                    className="px-4 py-3 text-sm text-gray-900"
                                  >
                                    {row[field] || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Continue Button */}
          {file && preview.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleContinue}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                <span>Continue to Workflow Setup</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

