'use client';

import React, { useState } from 'react';
import { Upload, File, X, CheckCircle2, AlertCircle, Info, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { FIELD_MAPPINGS, RequirementField, RequirementsCollectionProps } from './types';
import { parseDocument, generateExampleStructure, downloadExampleStructure as downloadExample } from './utils';

export default function RequirementsCollection({
  requirements,
  message,
  onComplete,
  workflow,
}: RequirementsCollectionProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [allRequirementsFile, setAllRequirementsFile] = useState<File | null>(null);
  const [showStructureInfo, setShowStructureInfo] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);

  // Convert requirements to array of field objects
  const requirementFields: RequirementField[] = Array.isArray(requirements)
    ? requirements.map((field) => ({
        field,
        label: FIELD_MAPPINGS[field]?.label || field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        type: FIELD_MAPPINGS[field]?.type || 'text',
        required: true,
      }))
    : Object.keys(requirements).map((field) => ({
        field,
        label: FIELD_MAPPINGS[field]?.label || field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        type: FIELD_MAPPINGS[field]?.type || 'text',
        required: requirements[field] === true,
      }));

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileUpload = (field: string, file: File | null) => {
    if (file) {
      setUploadedFiles((prev) => ({ ...prev, [field]: file }));
      setFormData((prev) => ({ ...prev, [field]: file.name }));
    } else {
      setUploadedFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[field];
        return newFiles;
      });
      setFormData((prev) => {
        const newData = { ...prev };
        delete newData[field];
        return newData;
      });
    }
  };

  // Handle upload of all requirements document
  const handleAllRequirementsUpload = async (file: File | null) => {
    if (!file) {
      setAllRequirementsFile(null);
      setParsingError(null);
      return;
    }

    setAllRequirementsFile(file);
    setParsingError(null);

    try {
      const parsedData = await parseDocument(file);
      
      // Populate form data with parsed values
      const newFormData: Record<string, any> = {};
      requirementFields.forEach((req) => {
        // Try to find matching field in parsed data
        const value = parsedData[req.field] || 
                     parsedData[req.field.toLowerCase()] ||
                     parsedData[req.field.replace(/_/g, ' ')] ||
                     parsedData[FIELD_MAPPINGS[req.field]?.label.toLowerCase()];
        
        if (value) {
          newFormData[req.field] = value;
        }
      });

      setFormData((prev) => ({ ...prev, ...newFormData }));
      
      // Clear any errors
      setErrors({});
    } catch (error: any) {
      setParsingError(error.message || 'Failed to parse document');
      logger.error('Error parsing document', error);
    }
  };

  const handleDownloadExample = () => {
    const example = generateExampleStructure(requirementFields);
    downloadExample(example);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    requirementFields.forEach((req) => {
      if (req.required && !formData[req.field] && !uploadedFiles[req.field]) {
        newErrors[req.field] = `${req.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    // Combine text inputs and uploaded files
    const completeData = {
      ...formData,
      files: uploadedFiles,
    };

    onComplete(completeData);
  };

  const isFieldComplete = (field: string): boolean => {
    return !!(formData[field] || uploadedFiles[field]);
  };

  const allFieldsComplete = requirementFields.every((req) => 
    !req.required || isFieldComplete(req.field)
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header Message */}
      {message && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">{message}</p>
        </div>
      )}

      {/* Upload All Requirements Section */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-semibold text-gray-900">
              Upload All Requirements in One Document
            </h4>
          </div>
          <button
            onClick={() => setShowStructureInfo(!showStructureInfo)}
            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
            title="Show document structure"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-xs text-gray-600 mb-3">
          Upload a single document (JSON, CSV, or structured text) containing all required information.
        </p>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded-md cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
            <Upload className="w-4 h-4" />
            <span>Upload All Requirements</span>
            <input
              type="file"
              className="hidden"
              accept=".json,.csv,.txt,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                handleAllRequirementsUpload(file);
              }}
            />
          </label>
          
          <button
            onClick={handleDownloadExample}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Example</span>
          </button>
        </div>

        {allRequirementsFile && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-900 flex-1">
              {allRequirementsFile.name}
            </span>
            <button
              type="button"
              onClick={() => handleAllRequirementsUpload(null)}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {parsingError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-red-900">Parsing Error</p>
                <p className="text-xs text-red-700 mt-1">{parsingError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Document Structure Info */}
        {showStructureInfo && (
          <div className="mt-4 p-4 bg-white border border-gray-300 rounded-md">
            <h5 className="text-sm font-semibold text-gray-900 mb-3">Document Structure Formats</h5>
            
            <div className="space-y-4 text-xs">
              {/* JSON Format */}
              <div>
                <p className="font-semibold text-gray-700 mb-2">1. JSON Format (Recommended):</p>
                <pre className="p-3 bg-gray-50 border border-gray-200 rounded-md overflow-x-auto text-xs">
{`{
  "linkedin_url_or_keywords": "https://linkedin.com/in/example or keywords",
  "connect_message": "Hi {{first_name}}, I'd like to connect...",
  "dm_message": "Hi {{first_name}}, I noticed..."
}`}
                </pre>
              </div>

              {/* Structured Text Format */}
              <div>
                <p className="font-semibold text-gray-700 mb-2">2. Structured Text Format:</p>
                <pre className="p-3 bg-gray-50 border border-gray-200 rounded-md overflow-x-auto text-xs">
{`LinkedIn URL or Keywords: https://linkedin.com/in/example
Connection Message: Hi {{first_name}}, I'd like to connect...
DM Message: Hi {{first_name}}, I noticed...`}
                </pre>
              </div>

              {/* CSV Format */}
              <div>
                <p className="font-semibold text-gray-700 mb-2">3. CSV Format:</p>
                <pre className="p-3 bg-gray-50 border border-gray-200 rounded-md overflow-x-auto text-xs">
{`linkedin_url_or_keywords,connect_message,dm_message
https://linkedin.com/in/example,"Hi {{first_name}}, I'd like to connect...","Hi {{first_name}}, I noticed..."`}
                </pre>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-600">
                  <strong>Note:</strong> Field names are case-insensitive. For multi-line text (like messages), 
                  use newlines in JSON or continue on next lines in structured text format.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Requirements List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Required Information
        </h3>

        {requirementFields.map((req) => {
          const fieldValue = formData[req.field] || '';
          const hasFile = !!uploadedFiles[req.field];
          const isComplete = isFieldComplete(req.field);
          const hasError = !!errors[req.field];

          return (
            <div
              key={req.field}
              className={cn(
                'p-4 border rounded-lg transition-all',
                isComplete
                  ? 'border-green-200 bg-green-50'
                  : hasError
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-900">
                    {req.label}
                    {req.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {isComplete && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                  {hasError && (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
              </div>

              {/* Input Field */}
              <div className="space-y-2">
                {req.type === 'textarea' ? (
                  <textarea
                    value={fieldValue}
                    onChange={(e) => handleInputChange(req.field, e.target.value)}
                    placeholder={`Enter ${req.label.toLowerCase()}...`}
                    rows={4}
                    className={cn(
                      'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                      hasError ? 'border-red-300' : 'border-gray-300'
                    )}
                  />
                ) : (
                  <input
                    type={req.type === 'url' ? 'url' : req.type === 'email' ? 'email' : 'text'}
                    value={fieldValue}
                    onChange={(e) => handleInputChange(req.field, e.target.value)}
                    placeholder={`Enter ${req.label.toLowerCase()}...`}
                    className={cn(
                      'w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                      hasError ? 'border-red-300' : 'border-gray-300'
                    )}
                  />
                )}

                {/* File Upload Option */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-100 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Upload Document</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleFileUpload(req.field, file);
                      }}
                    />
                  </label>

                  {hasFile && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-md">
                      <File className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-900">
                        {uploadedFiles[req.field].name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleFileUpload(req.field, null)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {hasError && (
                  <p className="text-xs text-red-600 mt-1">{errors[req.field]}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!allFieldsComplete}
          className={cn(
            'px-6 py-2 rounded-md text-sm font-medium transition-colors',
            allFieldsComplete
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          )}
        >
          Complete Workflow
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span>Progress</span>
          <span>
            {requirementFields.filter((req) => isFieldComplete(req.field)).length} /{' '}
            {requirementFields.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(
                requirementFields.filter((req) => isFieldComplete(req.field)).length /
                requirementFields.length
              ) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
