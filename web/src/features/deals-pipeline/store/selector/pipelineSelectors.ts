import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../../../store/store';
import { Stage } from '../slices/pipelineSlice';
import { Lead } from '../../../../components/leads/types';
import { User } from '../../../../store/slices/usersSlice';
import { logger } from '@/lib/logger';

// Import selectors
import { selectStages } from '../slices/pipelineSlice';
import { selectLeads } from '../slices/leadsSlice';
import { selectUsers } from '../../../../store/slices/usersSlice';
import { 
  selectPipelineActiveFilters, 
  selectPipelineSearchQuery, 
  selectPipelineSortConfig 
} from '../../../../store/slices/uiSlice';

// ============ TYPE DEFINITIONS ============

interface StageWithName extends Stage {
  id: string;
  name: string;
  order: number;
}

interface LeadsByStage {
  [stageKey: string]: {
    stage: StageWithName;
    leads: Lead[];
  };
}

interface StagePriorityCounts {
  high: number;
  medium: number;
  low: number;
}

interface StageData extends StageWithName {
  leads: Lead[];
  leadCount: number;
  totalValue: number;
  priority: StagePriorityCounts;
}

interface PipelineBoardData {
  stages: StageData[];
  totalLeads: number;
  totalValue: number;
}

interface LeadWithAssignee extends Lead {
  assigneeName: string;
  assigneeAvatar: string | null;
}

interface StageMetrics {
  stageId: string;
  stageName: string;
  leadCount: number;
  conversionRate: number;
}

// ============ PIPELINE/STAGES SELECTORS ============

// Get stages with name property added (preserving raw data + adding transformation)
export const selectStagesWithNames = createSelector(
  [selectStages],
  (stages: Stage[]): StageWithName[] => {
    // Ensure stages is always an array
    const safeStages = Array.isArray(stages) ? stages : [];
    return safeStages.map(stage => ({
      ...stage,
      id: stage.key, // Map key to id for consistency
      name: stage.label || (stage as any).name || (stage as any).stageName || (stage as any).title || 'Untitled Stage',
      order: stage.display_order || (stage as any).order || 0 // Add order property for UI sorting
    }));
  }
);

// Get stage by ID (using key as id)
export const selectStageById = createSelector(
  [selectStages, (_state: RootState, stageKey: string) => stageKey],
  (stages: Stage[], stageKey: string): Stage | null => {
    const safeStages = Array.isArray(stages) ? stages : [];
    return safeStages.find(stage => stage.key === stageKey) || null;
  }
);

// ============ LEADS SELECTORS ============

// Get lead by ID
export const selectLeadById = createSelector(
  [selectLeads, (_state: RootState, leadId: string | number) => leadId],
  (leads: Lead[], leadId: string | number): Lead | null => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    return safeLeads.find(lead => lead.id === leadId) || null;
  }
);

// Get leads by stage ID (using key as stage identifier)
export const selectLeadsByStageId = createSelector(
  [selectLeads, (_state: RootState, stageKey: string) => stageKey],
  (leads: Lead[], stageKey: string): Lead[] => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    // Leads reference stages by 'stage' property which matches stage.key
    return safeLeads.filter(lead => lead.stage === stageKey);
  }
);

// ============ COMBINED PIPELINE SELECTORS ============

// Main selector for PipelineBoard: groups leads by stages
export const selectLeadsByStage = createSelector(
  [selectStagesWithNames, selectLeads],
  (stages: StageWithName[], leads: Lead[]): LeadsByStage => {
    // Ensure both stages and leads are arrays
    const safeStages = Array.isArray(stages) ? stages : [];
    const safeLeads = Array.isArray(leads) ? leads : [];
    
    console.log('[Selector] Computing leadsByStage with:', {
      stages: safeStages.length,
      leads: safeLeads.length,
      timestamp: Date.now(),
      leadsWithStages: safeLeads.map(l => ({ id: l.id, name: l.name, stage: l.stage }))
    });
    
    const leadsByStage: LeadsByStage = {};
    
    // Initialize with all stages (even empty ones)
    // Use stage.key as the key since that's what leads reference
    safeStages.forEach(stage => {
      leadsByStage[stage.key] = {
        stage,
        leads: []
      };
    });
    
    // Group leads by stage (lead.stage matches stage.key)
    safeLeads.forEach(lead => {
      if (lead && lead.stage && leadsByStage[lead.stage]) {
        leadsByStage[lead.stage].leads.push(lead);
      } else if (lead && lead.stage) {
        // Handle leads with unknown stage key (shouldn't happen but defensive)
        console.warn(`Lead ${lead.id} has unknown stage: ${lead.stage}`);
      }
    });
    
    const distribution = Object.keys(leadsByStage).map(key => ({
      stage: key,
      leadCount: leadsByStage[key].leads.length,
      leadIds: leadsByStage[key].leads.map(l => l.id)
    }));
    
    console.log('[Selector] Final leadsByStage distribution:', distribution);
    console.log('[Selector] Raw stage distribution from leads:', safeLeads.reduce((acc, lead) => {
      acc[lead.stage || 'unknown'] = (acc[lead.stage || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));
    
    return leadsByStage;
  }
);

// Get pipeline board data with counts and statistics
export const selectPipelineBoardData = createSelector(
  [selectLeadsByStage, selectStagesWithNames, selectLeads],
  (leadsByStage: LeadsByStage, stages: StageWithName[], allLeads: Lead[]): PipelineBoardData => {
    const stageData: StageData[] = stages.map(stage => {
      const stageLeads = leadsByStage[stage.key]?.leads || []; // Use stage.key instead of stage.id
      
      return {
        ...stage,
        leads: stageLeads,
        leadCount: stageLeads.length,
        totalValue: stageLeads.reduce((sum, lead) => {
          const value = (lead as any).value || (lead as any).amount || 0;
          return sum + (typeof value === 'number' ? value : parseFloat(String(value)) || 0);
        }, 0),
        priority: {
          high: stageLeads.filter(lead => (lead as any).priority === 'high').length,
          medium: stageLeads.filter(lead => (lead as any).priority === 'medium').length,
          low: stageLeads.filter(lead => (lead as any).priority === 'low').length
        }
      };
    });
    
    return {
      stages: stageData,
      totalLeads: allLeads.length,
      totalValue: allLeads.reduce((sum, lead) => {
        const value = (lead as any).value || (lead as any).amount || 0;
        return sum + (typeof value === 'number' ? value : parseFloat(String(value)) || 0);
      }, 0)
    };
  }
);

// ============ FILTERING SELECTORS WITH UI STATE ============

interface PipelineActiveFilters {
  stages?: string[];
  statuses?: string[];
  priorities?: string[];
  sources?: string[];
  assignees?: string[];
  tags?: string[];
}

// Get filtered leads based on UI filters and search query
export const selectFilteredLeadsFromUI = createSelector(
  [selectLeads, selectPipelineActiveFilters, selectPipelineSearchQuery],
  (leads: Lead[], activeFilters: PipelineActiveFilters, searchQuery: string): Lead[] => {
    let filteredLeads = [...leads];
    
    // Search query filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredLeads = filteredLeads.filter(lead =>
        (lead.name || '').toLowerCase().includes(query) ||
        ((lead as any).email || '').toLowerCase().includes(query) ||
        ((lead as any).company || '').toLowerCase().includes(query) ||
        ((lead as any).phone || (lead as any).phoneNumber || '').toLowerCase().includes(query) ||
        ((lead as any).description || (lead as any).bio || '').toLowerCase().includes(query)
      );
    }
    
    // Stages filter
    if (activeFilters.stages && activeFilters.stages.length > 0) {
      filteredLeads = filteredLeads.filter(lead => 
        lead.stage && activeFilters.stages!.includes(lead.stage)
      );
    }
    
    // Status filter
    if (activeFilters.statuses && activeFilters.statuses.length > 0) {
      filteredLeads = filteredLeads.filter(lead => 
        (lead as any).status && activeFilters.statuses!.includes((lead as any).status)
      );
    }
    
    // Priority filter
    if (activeFilters.priorities && activeFilters.priorities.length > 0) {
      filteredLeads = filteredLeads.filter(lead => 
        (lead as any).priority && activeFilters.priorities!.includes((lead as any).priority)
      );
    }
    
    // Source filter
    if (activeFilters.sources && activeFilters.sources.length > 0) {
      filteredLeads = filteredLeads.filter(lead => 
        (lead as any).source && activeFilters.sources!.includes((lead as any).source)
      );
    }
    
    // Assignees filter
    if (activeFilters.assignees && activeFilters.assignees.length > 0) {
      filteredLeads = filteredLeads.filter(lead => {
        const assigneeId = (lead as any).assignee || (lead as any).assigned_to_id;
        return assigneeId && activeFilters.assignees!.includes(String(assigneeId));
      });
    }
    
    // Tags filter
    if (activeFilters.tags && activeFilters.tags.length > 0) {
      filteredLeads = filteredLeads.filter(lead => {
        const leadTags = (lead as any).tags || [];
        return activeFilters.tags!.some(tag => leadTags.includes(tag));
      });
    }
    
    return filteredLeads;
  }
);

interface PipelineSortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// Get filtered leads grouped by stage (using UI state)
export const selectFilteredLeadsByStageFromUI = createSelector(
  [selectStagesWithNames, selectFilteredLeadsFromUI, selectPipelineSortConfig],
  (stages: StageWithName[], filteredLeads: Lead[], sortConfig: PipelineSortConfig): LeadsByStage => {
    const leadsByStage: LeadsByStage = {};
    
    // Initialize with all stages
    stages.forEach(stage => {
      leadsByStage[stage.key] = {
        stage,
        leads: []
      };
    });
    
    // Group filtered leads by stage
    filteredLeads.forEach(lead => {
      if (lead.stage && leadsByStage[lead.stage]) {
        leadsByStage[lead.stage].leads.push(lead);
      }
    });
    
    // Sort leads within each stage
    Object.keys(leadsByStage).forEach(stageKey => {
      const { field, direction } = sortConfig;
      leadsByStage[stageKey].leads.sort((a, b) => {
        let aValue: any = (a as any)[field];
        let bValue: any = (b as any)[field];
        
        // Handle different field types
        if (field === 'createdAt' || field === 'updatedAt' || field === 'created_at' || field === 'updated_at') {
          aValue = new Date(aValue || 0).getTime();
          bValue = new Date(bValue || 0).getTime();
        } else if (field === 'amount' || field === 'value') {
          aValue = parseFloat(String(aValue || 0));
          bValue = parseFloat(String(bValue || 0));
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = (bValue || '').toString().toLowerCase();
        }
        
        if (direction === 'desc') {
          return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
      });
    });
    
    return leadsByStage;
  }
);

// ============ USER/ASSIGNEE SELECTORS ============

// Get leads with assignee names populated from users slice
export const selectLeadsWithAssigneeNames = createSelector(
  [selectLeads, selectUsers],
  (leads: Lead[], users: User[]): LeadWithAssignee[] => {
    return leads.map(lead => {
      const assigneeId = (lead as any).assignee || (lead as any).assigned_to_id;
      if (assigneeId) {
        const assignee = users.find(u => 
          u.id === assigneeId || u._id === assigneeId || 
          String(u.id) === String(assigneeId) || String(u._id) === String(assigneeId)
        );
        return {
          ...lead,
          assigneeName: assignee?.name || 'Former User',
          assigneeAvatar: (assignee as any)?.avatar || null
        } as LeadWithAssignee;
      }
      return {
        ...lead,
        assigneeName: 'Unassigned',
        assigneeAvatar: null
      } as LeadWithAssignee;
    });
  }
);

// Get filtered leads with assignee names
export const selectFilteredLeadsWithAssigneeNames = createSelector(
  [selectFilteredLeadsFromUI, selectUsers],
  (filteredLeads: Lead[], users: User[]): LeadWithAssignee[] => {
    return filteredLeads.map(lead => {
      const assigneeId = (lead as any).assignee || (lead as any).assigned_to_id;
      if (assigneeId) {
        const assignee = users.find(u => 
          u.id === assigneeId || u._id === assigneeId || 
          String(u.id) === String(assigneeId) || String(u._id) === String(assigneeId)
        );
        return {
          ...lead,
          assigneeName: assignee?.name || 'Former User',
          assigneeAvatar: (assignee as any)?.avatar || null
        } as LeadWithAssignee;
      }
      return {
        ...lead,
        assigneeName: 'Unassigned',
        assigneeAvatar: null
      } as LeadWithAssignee;
    });
  }
);

// Main selector for PipelineBoard with UI filters applied
export const selectPipelineBoardDataWithFilters = createSelector(
  [selectFilteredLeadsByStageFromUI, selectStagesWithNames, selectFilteredLeadsFromUI, selectUsers],
  (
    leadsByStage: LeadsByStage, 
    stages: StageWithName[], 
    allFilteredLeads: Lead[], 
    users: User[]
  ): PipelineBoardData => {
    const stageData: StageData[] = stages.map(stage => {
      const stageLeads = leadsByStage[stage.key]?.leads || [];
      
      // Add assignee names to leads
      const leadsWithAssignees: LeadWithAssignee[] = stageLeads.map(lead => {
        const assigneeId = (lead as any).assignee || (lead as any).assigned_to_id;
        if (assigneeId) {
          const assignee = users.find(u => 
            u.id === assigneeId || u._id === assigneeId || 
            String(u.id) === String(assigneeId) || String(u._id) === String(assigneeId)
          );
          return {
            ...lead,
            assigneeName: assignee?.name || 'Former User',
            assigneeAvatar: (assignee as any)?.avatar || null
          } as LeadWithAssignee;
        }
        return {
          ...lead,
          assigneeName: 'Unassigned',
          assigneeAvatar: null
        } as LeadWithAssignee;
      });
      
      return {
        ...stage,
        leads: leadsWithAssignees,
        leadCount: leadsWithAssignees.length,
        totalValue: leadsWithAssignees.reduce((sum, lead) => {
          const amount = (lead as any).amount || (lead as any).value;
          return sum + (parseFloat(String(amount)) || 0);
        }, 0),
        priority: {
          high: leadsWithAssignees.filter(lead => (lead as any).priority === 'high').length,
          medium: leadsWithAssignees.filter(lead => (lead as any).priority === 'medium').length,
          low: leadsWithAssignees.filter(lead => (lead as any).priority === 'low').length
        }
      };
    });
    
    return {
      stages: stageData,
      totalLeads: allFilteredLeads.length,
      totalValue: allFilteredLeads.reduce((sum, lead) => {
        const amount = (lead as any).amount || (lead as any).value;
        return sum + (parseFloat(String(amount)) || 0);
      }, 0)
    };
  }
);

// ============ ANALYTICS SELECTORS ============

// Get pipeline conversion metrics
export const selectPipelineMetrics = createSelector(
  [selectStagesWithNames, selectLeads],
  (stages: StageWithName[], leads: Lead[]): StageMetrics[] => {
    const stageMetrics: StageMetrics[] = stages.map((stage, index) => {
      const stageLeads = leads.filter(lead => lead.stage === stage.key);
      const nextStage = stages[index + 1];
      const nextStageLeads = nextStage ? 
        leads.filter(lead => lead.stage === nextStage.key) : [];
      
      return {
        stageId: stage.key, // Use stage.key for consistency
        stageName: stage.name,
        leadCount: stageLeads.length,
        conversionRate: nextStage && stageLeads.length > 0 ? 
          (nextStageLeads.length / stageLeads.length) * 100 : 0
      };
    });
    
    return stageMetrics;
  }
);

// Get recent activity (for future dashboard use)
export const selectRecentActivity = createSelector(
  [selectLeads],
  (leads: Lead[]): Lead[] => {
    return leads
      .filter(lead => (lead as any).updatedAt || (lead as any).updated_at)
      .sort((a, b) => {
        const aDate = new Date((a as any).updatedAt || (a as any).updated_at || 0).getTime();
        const bDate = new Date((b as any).updatedAt || (b as any).updated_at || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 10);
  }
);

