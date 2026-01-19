#!/bin/bash

# Setup Deals Pipeline SDK Structure
# Creates SDK files for the deals-pipeline feature repository

set -e

FEATURE_REPO="/Users/naveenreddy/Desktop/AI-Maya/lad-feature-deals-pipeline"

echo "🔧 Setting up Deals Pipeline SDK structure..."
echo "Target: $FEATURE_REPO"
echo ""

cd "$FEATURE_REPO"

# Create SDK directory structure
mkdir -p sdk

# Create package.json
cat > sdk/package.json << 'EOF'
{
  "name": "@lad/deals-pipeline-sdk",
  "version": "1.0.0",
  "description": "Deals Pipeline Feature SDK for LAD Platform",
  "main": "index.ts",
  "types": "index.ts",
  "files": [
    "components/",
    "api.ts",
    "types.ts",
    "hooks.ts",
    "index.ts"
  ],
  "keywords": [
    "lad",
    "deals-pipeline",
    "crm",
    "pipeline",
    "sdk"
  ],
  "author": "LAD Team",
  "license": "MIT",
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
EOF

# Create types.ts
cat > sdk/types.ts << 'EOF'
/**
 * Deals Pipeline Types
 * 
 * Type definitions for the Deals Pipeline feature SDK
 */

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task';

export interface Lead {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  status: LeadStatus;
  priority: LeadPriority;
  value?: number;
  stage_id?: string;
  assigned_to?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color?: string;
  pipeline_id?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  stages?: PipelineStage[];
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: ActivityType;
  content: string;
  user_id: string;
  organization_id: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface Booking {
  id: string;
  lead_id: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_type?: string;
  meeting_link?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  lead_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  organization_id: string;
  created_at: string;
}

// API Request/Response Types
export interface LeadCreateInput {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  value?: number;
  stage_id?: string;
  metadata?: Record<string, any>;
}

export interface LeadUpdateInput extends Partial<LeadCreateInput> {
  id: string;
}

export interface StageCreateInput {
  name: string;
  order?: number;
  color?: string;
  pipeline_id?: string;
}

export interface PipelineStats {
  total_leads: number;
  total_value: number;
  leads_by_stage: Record<string, number>;
  conversion_rate: number;
  avg_deal_size: number;
}

export interface LeadListParams {
  stage_id?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  search?: string;
  assigned_to?: string;
  page?: number;
  limit?: number;
}
EOF

# Create api.ts
cat > sdk/api.ts << 'EOF'
/**
 * Deals Pipeline SDK API
 * 
 * API functions for interacting with the Deals Pipeline feature
 * All paths are feature-prefixed: /deals-pipeline/*
 */

import { apiClient } from '@/sdk/shared/apiClient';
import type {
  Lead,
  Pipeline,
  PipelineStage,
  LeadActivity,
  Booking,
  Attachment,
  LeadCreateInput,
  LeadUpdateInput,
  StageCreateInput,
  PipelineStats,
  LeadListParams,
} from './types';

// ==========================================
// LEADS
// ==========================================

/**
 * Get all leads
 */
export async function getLeads(params?: LeadListParams): Promise<Lead[]> {
  const queryParams = new URLSearchParams();
  if (params?.stage_id) queryParams.append('stage_id', params.stage_id);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.priority) queryParams.append('priority', params.priority);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.assigned_to) queryParams.append('assigned_to', params.assigned_to);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  const query = queryParams.toString();
  const path = query ? `/deals-pipeline/leads?${query}` : '/deals-pipeline/leads';
  
  const response = await apiClient.get<{ data: Lead[] }>(path);
  return response.data;
}

/**
 * Get lead by ID
 */
export async function getLead(leadId: string): Promise<Lead> {
  const response = await apiClient.get<{ data: Lead }>(`/deals-pipeline/leads/${leadId}`);
  return response.data;
}

/**
 * Create new lead
 */
export async function createLead(data: LeadCreateInput): Promise<Lead> {
  const response = await apiClient.post<{ data: Lead }>('/deals-pipeline/leads', data);
  return response.data;
}

/**
 * Update lead
 */
export async function updateLead(leadId: string, data: LeadUpdateInput): Promise<Lead> {
  const response = await apiClient.put<{ data: Lead }>(`/deals-pipeline/leads/${leadId}`, data);
  return response.data;
}

/**
 * Delete lead
 */
export async function deleteLead(leadId: string): Promise<void> {
  await apiClient.delete(`/deals-pipeline/leads/${leadId}`);
}

/**
 * Move lead to stage
 */
export async function moveLeadToStage(leadId: string, stageId: string): Promise<Lead> {
  const response = await apiClient.put<{ data: Lead }>(`/deals-pipeline/leads/${leadId}/stage`, { stage_id: stageId });
  return response.data;
}

// ==========================================
// STAGES
// ==========================================

/**
 * Get all stages
 */
export async function getStages(): Promise<PipelineStage[]> {
  const response = await apiClient.get<{ data: PipelineStage[] }>('/deals-pipeline/stages');
  return response.data;
}

/**
 * Create new stage
 */
export async function createStage(data: StageCreateInput): Promise<PipelineStage> {
  const response = await apiClient.post<{ data: PipelineStage }>('/deals-pipeline/stages', data);
  return response.data;
}

/**
 * Update stage
 */
export async function updateStage(stageId: string, data: Partial<StageCreateInput>): Promise<PipelineStage> {
  const response = await apiClient.put<{ data: PipelineStage }>(`/deals-pipeline/stages/${stageId}`, data);
  return response.data;
}

/**
 * Delete stage
 */
export async function deleteStage(stageId: string): Promise<void> {
  await apiClient.delete(`/deals-pipeline/stages/${stageId}`);
}

// ==========================================
// ACTIVITIES
// ==========================================

/**
 * Get activities for a lead
 */
export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const response = await apiClient.get<{ data: LeadActivity[] }>(`/deals-pipeline/leads/${leadId}/activities`);
  return response.data;
}

/**
 * Add activity to lead
 */
export async function addLeadActivity(leadId: string, activity: { type: string; content: string }): Promise<LeadActivity> {
  const response = await apiClient.post<{ data: LeadActivity }>(`/deals-pipeline/leads/${leadId}/activities`, activity);
  return response.data;
}

// ==========================================
// BOOKINGS
// ==========================================

/**
 * Get bookings for a lead
 */
export async function getLeadBookings(leadId: string): Promise<Booking[]> {
  const response = await apiClient.get<{ data: Booking[] }>(`/deals-pipeline/leads/${leadId}/bookings`);
  return response.data;
}

/**
 * Create booking for lead
 */
export async function createBooking(leadId: string, booking: Partial<Booking>): Promise<Booking> {
  const response = await apiClient.post<{ data: Booking }>(`/deals-pipeline/bookings`, { ...booking, lead_id: leadId });
  return response.data;
}

// ==========================================
// STATS
// ==========================================

/**
 * Get pipeline statistics
 */
export async function getPipelineStats(): Promise<PipelineStats> {
  const response = await apiClient.get<{ data: PipelineStats }>('/deals-pipeline/stats');
  return response.data;
}
EOF

# Create hooks.ts
cat > sdk/hooks.ts << 'EOF'
/**
 * Deals Pipeline SDK Hooks
 * 
 * React hooks for the Deals Pipeline feature
 */

import { useState, useEffect, useCallback } from 'react';
import * as api from './api';
import type {
  Lead,
  PipelineStage,
  LeadActivity,
  PipelineStats,
  LeadListParams,
} from './types';

/**
 * Hook to fetch and manage leads
 */
export function useLeads(params?: LeadListParams) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getLeads(params);
      setLeads(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, loading, error, refetch: fetchLeads };
}

/**
 * Hook to fetch a single lead
 */
export function useLead(leadId: string) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!leadId) return;

    const fetchLead = async () => {
      try {
        setLoading(true);
        const data = await api.getLead(leadId);
        setLead(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [leadId]);

  return { lead, loading, error };
}

/**
 * Hook to fetch pipeline stages
 */
export function useStages() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getStages();
      setStages(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  return { stages, loading, error, refetch: fetchStages };
}

/**
 * Hook to fetch lead activities
 */
export function useLeadActivities(leadId: string) {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!leadId) return;

    try {
      setLoading(true);
      const data = await api.getLeadActivities(leadId);
      setActivities(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return { activities, loading, error, refetch: fetchActivities };
}

/**
 * Hook to fetch pipeline statistics
 */
export function usePipelineStats() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getPipelineStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
EOF

# Create index.ts
cat > sdk/index.ts << 'EOF'
/**
 * Deals Pipeline SDK
 * 
 * Main entry point for the Deals Pipeline feature SDK
 * 
 * @example
 * ```typescript
 * import { useLeads, createLead, type Lead } from '@lad/deals-pipeline-sdk';
 * ```
 */

// Export all types
export * from './types';

// Export all API functions
export * from './api';

// Export all hooks
export * from './hooks';

// Export components
export * from './components';
EOF

# Create README
cat > sdk/README.md << 'EOF'
# Deals Pipeline SDK

Feature SDK for the Deals Pipeline functionality in the LAD platform.

## Installation

This SDK is designed to be used within the LAD monorepo or imported as a workspace package.

## Usage

### Types

```typescript
import type { Lead, PipelineStage, LeadStatus } from '@lad/deals-pipeline-sdk';
```

### API Functions

```typescript
import { getLeads, createLead, updateLead } from '@lad/deals-pipeline-sdk';

// Fetch leads
const leads = await getLeads({ status: 'qualified' });

// Create a lead
const newLead = await createLead({
  company_name: 'Acme Corp',
  contact_name: 'John Doe',
  email: 'john@acme.com',
  status: 'new',
  priority: 'high',
});

// Update lead
await updateLead(lead.id, { status: 'contacted' });
```

### React Hooks

```typescript
import { useLeads, useStages, usePipelineStats } from '@lad/deals-pipeline-sdk';

function PipelineView() {
  const { leads, loading, error } = useLeads({ stage_id: stageId });
  const { stages } = useStages();
  const { stats } = usePipelineStats();

  // ...
}
```

### Components

```typescript
import { PipelineBoard } from '@lad/deals-pipeline-sdk';

function PipelinePage() {
  return <PipelineBoard />;
}
```

## Structure

- `types.ts` - TypeScript type definitions
- `api.ts` - API client functions
- `hooks.ts` - React hooks
- `components/` - React components
- `index.ts` - Main entry point

## Features

- **Lead Management**: Create, read, update, delete leads
- **Pipeline Stages**: Manage pipeline stages and lead progression
- **Activities**: Track interactions and activities
- **Bookings**: Schedule meetings and appointments
- **Statistics**: View pipeline metrics and analytics
- **Drag & Drop**: Visual kanban board with drag-and-drop
- **Filtering**: Advanced filtering and search

## API Paths

All API endpoints are prefixed with `/deals-pipeline`:

- `/deals-pipeline/leads` - Lead operations
- `/deals-pipeline/stages` - Stage operations
- `/deals-pipeline/stats` - Statistics
- `/deals-pipeline/bookings` - Booking operations

## Type Safety

All functions and hooks are fully typed with TypeScript for maximum type safety and developer experience.
EOF

echo "✅ SDK structure created successfully!"
echo ""
echo "📦 Created files:"
echo "  - sdk/package.json"
echo "  - sdk/types.ts"
echo "  - sdk/api.ts"
echo "  - sdk/hooks.ts"
echo "  - sdk/index.ts"
echo "  - sdk/README.md"
echo "  - sdk/components/ (from sync script)"
echo ""
echo "📝 Next: Review and customize the SDK files as needed"

