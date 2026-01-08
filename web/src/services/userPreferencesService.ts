import { getUserSettings, updateUserSettings } from './userService';
import { logger } from '../lib/logger';

/**
 * User Preferences Service
 * Integrates with existing user preferences backend system
 * Handles pipeline board preferences as part of user settings
 */

interface VisibleColumns {
  name: boolean;
  stage: boolean;
  status: boolean;
  assignee: boolean;
  amount: boolean;
  closeDate: boolean;
  source: boolean;
  priority: boolean;
  tags: boolean;
  company: boolean;
  phone: boolean;
  email: boolean;
  description: boolean;
  createdAt: boolean;
  updatedAt: boolean;
}

interface DateRange {
  start: string | null;
  end: string | null;
}

interface Filters {
  statuses: string[];
  priorities: string[];
  sources: string[];
  assignees: string[];
  dateRange: DateRange;
}

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

interface UISettings {
  zoom: number;
  autoRefresh: boolean;
  refreshInterval: number;
  compactView: boolean;
  showCardCount: boolean;
  showStageValue: boolean;
  enableDragAndDrop: boolean;
}

interface PipelinePreferences {
  viewMode: 'kanban' | 'list';
  visibleColumns: VisibleColumns;
  filters: Filters;
  sortConfig: SortConfig;
  uiSettings: UISettings;
}

interface UserSettings {
  [key: string]: unknown;
  preferences?: {
    general?: UserSettings;
    [key: string]: unknown;
  };
}

class UserPreferencesService {
  // Get user's pipeline preferences from existing user settings
  async getPipelinePreferences(): Promise<PipelinePreferences> {
    try {
      const userSettings = await getUserSettings() as UserSettings;
      logger.debug('Raw user settings from API keys:', Object.keys(userSettings));
      
      // Log all keys that start with 'pipeline.'
      const pipelineKeys = Object.keys(userSettings).filter(key => key.startsWith('pipeline.'));
      logger.debug('Found pipeline keys directly:', pipelineKeys);
      
      const pipelinePrefs = this.extractPipelinePreferences(userSettings);
      logger.debug('Extracted pipeline preferences');
      
      const merged = this.mergeWithDefaults(pipelinePrefs);
      logger.debug('Final merged preferences');
      
      return merged;
    } catch (error) {
      logger.warn('Failed to load user preferences, using defaults', error);
      return this.getDefaultPreferences();
    }
  }

  // Save user's pipeline preferences using existing user settings API
  async savePipelinePreferences(preferences: PipelinePreferences): Promise<PipelinePreferences> {
    try {
      logger.debug('Saving preferences');
      const pipelineKeys = this.flattenPipelinePreferences(preferences);
      logger.debug('Flattened preferences for backend');
      
      await updateUserSettings(pipelineKeys);
      logger.debug('Backend save response received');
      
      return preferences;
    } catch (error) {
      logger.error('Failed to save user preferences', error);
      throw error;
    }
  }

  // Extract pipeline preferences from user settings
  extractPipelinePreferences(userSettings: UserSettings): Partial<PipelinePreferences> {
    const pipelineKeys: Record<string, unknown> = {};
    
    // Handle nested structure from backend OR flat structure
    let settingsToSearch: UserSettings = userSettings;
    
    // Check if settings are nested under preferences.general
    if (userSettings.preferences && userSettings.preferences.general) {
      settingsToSearch = userSettings.preferences.general as UserSettings;
      logger.debug('Found nested preferences structure');
    } else if (userSettings.preferences) {
      settingsToSearch = userSettings.preferences as UserSettings;
      logger.debug('Found preferences structure');
    } else {
      // Settings might be flat at root level (from getUserPreferences backend call)
      settingsToSearch = userSettings;
      logger.debug('Using flat structure from root level');
    }
    
    logger.debug('Searching for pipeline keys');
    
    // Extract all pipeline-related keys
    Object.keys(settingsToSearch).forEach(key => {
      if (key.startsWith('pipeline.')) {
        const nestedKey = key.replace('pipeline.', '');
        this.setNestedValue(pipelineKeys, nestedKey, settingsToSearch[key]);
        logger.debug(`Found pipeline key: ${key}`);
      }
    });
    
    logger.debug(`Total pipeline keys extracted: ${Object.keys(pipelineKeys).length}`);
    return pipelineKeys as Partial<PipelinePreferences>;
  }

  // Flatten pipeline preferences for storage
  flattenPipelinePreferences(preferences: PipelinePreferences): Record<string, string> {
    const flattened: Record<string, string> = {};
    
    const flatten = (obj: Record<string, unknown>, prefix = 'pipeline.'): void => {
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const newKey = prefix + key;
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value as Record<string, unknown>, newKey + '.');
        } else {
          flattened[newKey] = JSON.stringify(value);
        }
      });
    };
    
    flatten(preferences as Record<string, unknown>);
    return flattened;
  }

  // Helper to set nested object values
  setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    if (!lastKey) return;
    
    const target = keys.reduce((current: Record<string, unknown>, key: string) => {
      if (!current[key]) current[key] = {};
      return current[key] as Record<string, unknown>;
    }, obj);
    
    try {
      target[lastKey] = typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      target[lastKey] = value;
    }
  }

  // Get default preferences structure
  getDefaultPreferences(): PipelinePreferences {
    return {
      viewMode: 'kanban', // 'kanban' | 'list'
      visibleColumns: {
        name: true,
        stage: true,
        status: true,
        assignee: true,
        amount: true,
        closeDate: true,
        source: true,
        priority: true,
        tags: false,
        company: false,
        phone: false,
        email: false,
        description: false,
        createdAt: false,
        updatedAt: false
      },
      filters: {
        statuses: [],
        priorities: [],
        sources: [],
        assignees: [],
        dateRange: {
          start: null,
          end: null
        }
      },
      sortConfig: {
        field: 'createdAt',
        direction: 'desc'
      },
      uiSettings: {
        zoom: 1.0,
        autoRefresh: true,
        refreshInterval: 30, // seconds
        compactView: false,
        showCardCount: true,
        showStageValue: true,
        enableDragAndDrop: true
      }
    };
  }

  // Merge user preferences with defaults (for missing fields)
  mergeWithDefaults(userPreferences: Partial<PipelinePreferences>): PipelinePreferences {
    const defaults = this.getDefaultPreferences();
    
    return {
      ...defaults,
      ...userPreferences,
      visibleColumns: {
        ...defaults.visibleColumns,
        ...(userPreferences.visibleColumns || {})
      },
      filters: {
        ...defaults.filters,
        ...(userPreferences.filters || {}),
        dateRange: {
          ...defaults.filters.dateRange,
          ...(userPreferences.filters?.dateRange || {})
        }
      },
      sortConfig: {
        ...defaults.sortConfig,
        ...(userPreferences.sortConfig || {})
      },
      uiSettings: {
        ...defaults.uiSettings,
        ...(userPreferences.uiSettings || {})
      }
    };
  }

  
  // Auto-save preferences with debouncing
  debouncedSave: ReturnType<typeof setTimeout> | null = null;
  
  autoSavePipelinePreferences(preferences: PipelinePreferences, delay = 2000): void {
    if (this.debouncedSave) {
      clearTimeout(this.debouncedSave);
    }
    
    this.debouncedSave = setTimeout(() => {
      this.savePipelinePreferences(preferences)
        .catch(error => {
          logger.error('Auto-save preferences failed', error);
        });
    }, delay);
  }
}

export default new UserPreferencesService();
