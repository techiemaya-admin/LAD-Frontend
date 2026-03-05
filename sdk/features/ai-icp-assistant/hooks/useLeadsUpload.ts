/**
 * useLeadsUpload Hook
 * 
 * Manages leads upload flow: template download, file upload, analysis, platform detection
 */
import { useState, useCallback } from 'react';
import {
  downloadLeadsTemplate,
  getLeadsTemplateColumns,
  uploadLeadsFile,
  uploadLeadsContent,
  analyzeLeads,
  getPlatformQuestions,
  validateLeadsForExecution,
} from '../api';
import type {
  ParsedLead,
  LeadsTemplateColumn,
  LeadsUploadResponse,
  LeadsAIAnalysisResponse,
  PlatformDetection,
  PlatformQuestion,
  LeadsValidation,
} from '../types';
export interface LeadsUploadState {
  // Status
  isLoading: boolean;
  error: string | null;
  // Template
  templateColumns: LeadsTemplateColumn[] | null;
  // Uploaded leads
  leads: ParsedLead[];
  validLeads: number;
  totalRows: number;
  uploadErrors: string[];
  // Platform detection
  platforms: PlatformDetection | null;
  // Analysis
  analysis: LeadsAIAnalysisResponse['data'] | null;
  summary: string | null;
  // Platform questions
  platformQuestions: PlatformQuestion[];
  // Validation
  validation: LeadsValidation | null;
  // Flow state
  step: 'idle' | 'template' | 'uploading' | 'uploaded' | 'analyzing' | 'analyzed' | 'configuring' | 'validated';
}
const initialState: LeadsUploadState = {
  isLoading: false,
  error: null,
  templateColumns: null,
  leads: [],
  validLeads: 0,
  totalRows: 0,
  uploadErrors: [],
  platforms: null,
  analysis: null,
  summary: null,
  platformQuestions: [],
  validation: null,
  step: 'idle',
};
export function useLeadsUpload() {
  const [state, setState] = useState<LeadsUploadState>(initialState);
  /**
   * Reset the upload state
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);
  /**
   * Download the CSV template
   */
  const downloadTemplate = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const blob = await downloadLeadsTemplate();
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setState(prev => ({ ...prev, isLoading: false, step: 'template' }));
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to download template';
      setState(prev => ({ ...prev, isLoading: false, error }));
      return false;
    }
  }, []);
  /**
   * Fetch template column definitions
   */
  const fetchTemplateColumns = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await getLeadsTemplateColumns();
      setState(prev => ({
        ...prev,
        isLoading: false,
        templateColumns: response.columns,
      }));
      return response.columns;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch template columns';
      setState(prev => ({ ...prev, isLoading: false, error }));
      return null;
    }
  }, []);
  /**
   * Upload a CSV file
   */
  const uploadFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, step: 'uploading' }));
    try {
      const response = await uploadLeadsFile(file);
      if (!response.success) {
        throw new Error(response.error || 'Upload failed');
      }
      setState(prev => ({
        ...prev,
        isLoading: false,
        leads: response.data.leads,
        validLeads: response.data.validLeads,
        totalRows: response.data.totalRows,
        uploadErrors: response.data.errors,
        platforms: response.data.platforms,
        summary: response.data.summary,
        step: 'uploaded',
      }));
      return response;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to upload file';
      setState(prev => ({ ...prev, isLoading: false, error, step: 'idle' }));
      return null;
    }
  }, []);
  /**
   * Upload CSV content as string
   */
  const uploadContent = useCallback(async (csvContent: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, step: 'uploading' }));
    try {
      const response = await uploadLeadsContent(csvContent);
      if (!response.success) {
        throw new Error(response.error || 'Upload failed');
      }
      setState(prev => ({
        ...prev,
        isLoading: false,
        leads: response.data.leads,
        validLeads: response.data.validLeads,
        totalRows: response.data.totalRows,
        uploadErrors: response.data.errors,
        platforms: response.data.platforms,
        summary: response.data.summary,
        step: 'uploaded',
      }));
      return response;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to upload content';
      setState(prev => ({ ...prev, isLoading: false, error, step: 'idle' }));
      return null;
    }
  }, []);
  /**
   * Perform AI analysis on uploaded leads
   */
  const performAnalysis = useCallback(async () => {
    if (state.leads.length === 0) {
      setState(prev => ({ ...prev, error: 'No leads to analyze' }));
      return null;
    }
    setState(prev => ({ ...prev, isLoading: true, error: null, step: 'analyzing' }));
    try {
      const response = await analyzeLeads(state.leads);
      if (!response.success) {
        throw new Error('Analysis failed');
      }
      setState(prev => ({
        ...prev,
        isLoading: false,
        analysis: response.data,
        step: 'analyzed',
      }));
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to analyze leads';
      setState(prev => ({ ...prev, isLoading: false, error, step: 'uploaded' }));
      return null;
    }
  }, [state.leads]);
  /**
   * Fetch platform-specific questions
   */
  const fetchPlatformQuestions = useCallback(async () => {
    if (!state.platforms) {
      setState(prev => ({ ...prev, error: 'No platform data available' }));
      return null;
    }
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await getPlatformQuestions(undefined, state.platforms);
      if (!response.success) {
        throw new Error('Failed to get platform questions');
      }
      setState(prev => ({
        ...prev,
        isLoading: false,
        platformQuestions: response.data.questions,
        step: 'configuring',
      }));
      return response.data.questions;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to get platform questions';
      setState(prev => ({ ...prev, isLoading: false, error }));
      return null;
    }
  }, [state.platforms]);
  /**
   * Validate leads for execution with selected platforms
   */
  const validateForExecution = useCallback(async (selectedPlatforms: string[]) => {
    if (state.leads.length === 0) {
      setState(prev => ({ ...prev, error: 'No leads to validate' }));
      return null;
    }
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await validateLeadsForExecution(state.leads, selectedPlatforms);
      if (!response.success) {
        throw new Error('Validation failed');
      }
      setState(prev => ({
        ...prev,
        isLoading: false,
        validation: response.data,
        step: 'validated',
      }));
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to validate leads';
      setState(prev => ({ ...prev, isLoading: false, error }));
      return null;
    }
  }, [state.leads]);
  /**
   * Get available platforms
   */
  const availablePlatforms = state.platforms?.available || [];
  /**
   * Get unavailable platforms
   */
  const unavailablePlatforms = state.platforms?.unavailable || [];
  /**
   * Check if a specific platform is available
   */
  const isPlatformAvailable = useCallback((platform: string) => {
    return availablePlatforms.includes(platform);
  }, [availablePlatforms]);
  /**
   * Get platform coverage percentage
   */
  const getPlatformCoverage = useCallback((platform: string) => {
    return state.platforms?.coverage[platform]?.percentage || 0;
  }, [state.platforms]);
  return {
    // State
    ...state,
    // Derived
    availablePlatforms,
    unavailablePlatforms,
    // Actions
    reset,
    downloadTemplate,
    fetchTemplateColumns,
    uploadFile,
    uploadContent,
    performAnalysis,
    fetchPlatformQuestions,
    validateForExecution,
    // Helpers
    isPlatformAvailable,
    getPlatformCoverage,
  };
}
export default useLeadsUpload;