import { safeStorage } from '../utils/storage';
import { getApiUrl, defaultFetchOptions } from '../config/api';
import { User } from '../store/slices/usersSlice';

// Remove mockUserSettings, use API for user preferences

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return safeStorage.getItem('token') || safeStorage.getItem('auth_token');
}

const DEFAULT_FETCH_TIMEOUT_MS = 20000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = DEFAULT_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getUserSettings(): Promise<Record<string, unknown>> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetchWithTimeout(getApiUrl('/api/users/settings'), {
    ...defaultFetchOptions(),
    headers: {
      ...defaultFetchOptions().headers,
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get user settings');
  }

  return await response.json();
}

export async function updateUserSettings(settings: Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  // Backend accepts both flat and nested formats, so send as-is
  const response = await fetchWithTimeout(getApiUrl('/api/users/settings'), {
    ...defaultFetchOptions(),
    method: 'PUT',
    headers: {
      ...defaultFetchOptions().headers,
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(settings)
  });

  if (!response.ok) {
    throw new Error('Failed to update user settings');
  }

  return await response.json();
}

// Pipeline Preferences Helper Functions
interface PipelinePreferences {
  viewMode: 'kanban' | 'list';
  visibleColumns: Record<string, boolean>;
  filters: {
    statuses: string[];
    priorities: string[];
    sources: string[];
    assignees: string[];
    dateRange: { start: string | null; end: string | null };
  };
  sortConfig: {
    field: string;
    direction: 'asc' | 'desc';
  };
  uiSettings: {
    zoom: number;
    autoRefresh: boolean;
    refreshInterval: number;
    compactView: boolean;
    showCardCount: boolean;
    showStageValue: boolean;
    enableDragAndDrop: boolean;
  };
}

export async function getPipelinePreferences(): Promise<PipelinePreferences> {
  try {
    const token = getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetchWithTimeout(getApiUrl('/api/deal-pipeline/settings'), {
      ...defaultFetchOptions(),
      headers: {
        ...defaultFetchOptions().headers,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get pipeline settings');
    }

    const result = await response.json();
    const settings = result.settings || {};
    
    // Return the settings directly since backend now returns the correct structure
    return settings;
  } catch (error) {
    return getPipelineDefaults();
  }
}

export async function savePipelinePreferences(preferences: PipelinePreferences): Promise<PipelinePreferences> {
  try {
    const token = getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    // Send preferences as structured object (not flattened)
    const response = await fetchWithTimeout(getApiUrl('/api/deal-pipeline/settings'), {
      ...defaultFetchOptions(),
      method: 'PUT',
      headers: {
        ...defaultFetchOptions().headers,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(preferences)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to save pipeline preferences: ${response.status} ${response.statusText} - ${errorText}`);
    }

    await response.json();
    
    return preferences;
  } catch (error) {
    console.error('Failed to save pipeline preferences:', error);
    throw error;
  }
}

// Helper: Extract pipeline preferences from user settings
function extractPipelinePreferences(userSettings: Record<string, unknown>): Partial<PipelinePreferences> {
  const pipelinePrefs: Record<string, unknown> = {};
  
  // Dynamically extract all pipeline.* keys from userSettings
  Object.keys(userSettings).forEach(key => {
    if (key.startsWith('pipeline.')) {
      // Remove 'pipeline.' prefix to get the nested path
      const path = key.substring(9); // Remove 'pipeline.' (9 characters)
      const value = userSettings[key];
      
      // Set nested property dynamically
      setNestedProperty(pipelinePrefs, path, value);
    }
  });
  
  console.log('UserService: Total pipeline preferences extracted:', countNestedProperties(pipelinePrefs));
  return pipelinePrefs as Partial<PipelinePreferences>;
}

// Helper: Set nested property dynamically (e.g., 'filters.statuses' -> pipelinePrefs.filters.statuses)
function setNestedProperty(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  
  // Navigate to the parent object
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  // Set the final value
  const finalKey = keys[keys.length - 1];
  
  // Try to parse as JSON first, fall back to string value
  try {
    current[finalKey] = typeof value === 'string' ? JSON.parse(value) : value;
  } catch (e) {
    // If parsing fails, use the raw value
    current[finalKey] = value;
  }
}

// Helper: Count nested properties recursively
function countNestedProperties(obj: Record<string, unknown>): number {
  let count = 0;
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      count += countNestedProperties(obj[key] as Record<string, unknown>);
    } else {
      count++;
    }
  }
  return count;
}

// Helper: Flatten pipeline preferences for storage
function flattenPipelinePreferences(preferences: PipelinePreferences): Record<string, string> {
  const flattened: Record<string, string> = {};
  
  // Recursively flatten nested objects with 'pipeline.' prefix
  function flattenObject(obj: Record<string, unknown>, prefix = 'pipeline'): void {
    Object.keys(obj).forEach(key => {
      const fullKey = `${prefix}.${key}`;
      const value = obj[key];
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        flattenObject(value as Record<string, unknown>, fullKey);
      } else {
        // Store primitive values and arrays as JSON strings (except simple strings)
        if (typeof value === 'string' && !isJsonString(value)) {
          flattened[fullKey] = value;
        } else {
          flattened[fullKey] = JSON.stringify(value);
        }
      }
    });
  }
  
  flattenObject(preferences as unknown as Record<string, unknown>);
  return flattened;
}

// Helper: Check if a string is already JSON
function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Helper: Set nested object values
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (!lastKey) return;
  
  const target = keys.reduce((current: Record<string, unknown>, key: string) => {
    if (!current[key]) current[key] = {};
    return current[key] as Record<string, unknown>;
  }, obj);
  
  // Parse string values back to their proper types
  if (typeof value === 'string') {
    // Handle boolean strings
    if (value === 'true') {
      target[lastKey] = true;
    } else if (value === 'false') {
      target[lastKey] = false;
    } else if (value === 'null') {
      target[lastKey] = null;
    } else if (!isNaN(Number(value)) && !isNaN(parseFloat(value))) {
      // Handle numeric strings
      target[lastKey] = parseFloat(value);
    } else if (value.startsWith('[') && value.endsWith(']')) {
      // Handle array strings
      try {
        target[lastKey] = JSON.parse(value);
      } catch {
        target[lastKey] = value;
      }
    } else {
      // Regular string
      target[lastKey] = value;
    }
  } else {
    target[lastKey] = value;
  }
}

// Helper: Get default pipeline preferences
function getPipelineDefaults(): PipelinePreferences {
  return {
    viewMode: 'kanban',
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
      dateRange: { start: null, end: null }
    },
    sortConfig: {
      field: 'createdAt',
      direction: 'desc'
    },
    uiSettings: {
      zoom: 1.0,
      autoRefresh: true,
      refreshInterval: 30,
      compactView: false,
      showCardCount: true,
      showStageValue: true,
      enableDragAndDrop: true
    }
  };
}

// Helper: Merge with defaults
function mergeWithPipelineDefaults(userPreferences: Partial<PipelinePreferences>): PipelinePreferences {
  const defaults = getPipelineDefaults();
  
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

export async function getAllUsers(): Promise<User[]> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const response = await fetchWithTimeout(getApiUrl('/api/users'), {
    ...defaultFetchOptions(),
    headers: {
      ...defaultFetchOptions().headers,
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return await response.json();
}

export async function createUser(user: Partial<User>): Promise<User | { user: User; id?: string }> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const response = await fetchWithTimeout(getApiUrl('/api/users'), {
    ...defaultFetchOptions(),
    method: 'POST',
    headers: {
      ...defaultFetchOptions().headers,
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(user)
  });
  if (!response.ok) {
    let errorMsg = 'Failed to create user';
    try {
      const errData = await response.json() as { error?: string };
      if (errData && errData.error) errorMsg = errData.error;
    } catch {}
    throw new Error(errorMsg);
  }
  return await response.json();
}

export async function updateUserRole(id: string, role: string, capabilities: string[]): Promise<User> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const response = await fetchWithTimeout(getApiUrl(`/api/users/${id}/role`), {
    ...defaultFetchOptions(),
    method: 'PUT',
    headers: {
      ...defaultFetchOptions().headers,
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ role, capabilities })
  });
  if (!response.ok) throw new Error('Failed to update user role');
  return await response.json();
}

export async function updateUserCapabilities(id: string, capabilities: string[]): Promise<User> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const response = await fetchWithTimeout(getApiUrl(`/api/users/${id}/capabilities`), {
    ...defaultFetchOptions(),
    method: 'PUT',
    headers: {
      ...defaultFetchOptions().headers,
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ capabilities })
  });
  if (!response.ok) throw new Error('Failed to update user capabilities');
  return await response.json();
}

export async function getRoleDefaults(): Promise<Array<{ role: { key: string; label: string }; capabilities: Array<{ key: string; label: string }> }>> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const response = await fetchWithTimeout(getApiUrl('/api/users/role-defaults'), {
    ...defaultFetchOptions(),
    headers: {
      ...defaultFetchOptions().headers,
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to fetch role defaults');
  return await response.json();
}

export async function deleteUser(id: string): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const response = await fetchWithTimeout(getApiUrl(`/api/users/${id}`), {
    ...defaultFetchOptions(),
    method: 'DELETE',
    headers: {
      ...defaultFetchOptions().headers,
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to delete user');
  await response.json();
}

// ========================
// GROUP-PAIRS MANAGEMENT (User-Lead Relationships)
// ========================

// Upsert user-lead pairs in the group-pairs table
export async function upsertUserLeadPairs(userId: string, leadIds: (string | number)[]): Promise<unknown> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  console.log(`[UserService] Upserting leads for user ID: ${userId}`, leadIds);
  console.log(`[UserService] API URL: ${getApiUrl('/api/group-pairs/upsert')}`);
  
  try {
    const response = await fetchWithTimeout(getApiUrl('/api/group-pairs/upsert'), {
      ...defaultFetchOptions(),
      method: 'POST',
      headers: {
        ...defaultFetchOptions().headers,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId, leadIds })
    });
    
    console.log(`[UserService] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[UserService] Backend error response:`, errorText);
      throw new Error(`Failed to upsert user-lead pairs: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[UserService] Successfully upserted leads:`, data);
    return data;
  } catch (error) {
    console.error(`[UserService] Error upserting leads for user ID ${userId}:`, error);
    throw error;
  }
}

// Get all leads assigned to a user from group-pairs table
export async function getUserAssignedLeads(userId: string): Promise<{ leads?: unknown[] } | unknown[]> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  console.log(`[UserService] Fetching leads for user ID: ${userId}`);
  console.log(`[UserService] API URL: ${getApiUrl(`/api/group-pairs/user/${userId}/leads`)}`);
  
  try {
    const response = await fetchWithTimeout(getApiUrl(`/api/group-pairs/user/${userId}/leads`), {
      ...defaultFetchOptions(),
      headers: {
        ...defaultFetchOptions().headers,
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`[UserService] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      // Handle 404 gracefully - endpoint may not be implemented yet
      if (response.status === 404) {
        console.warn(`[UserService] Endpoint not found (404) - returning empty array. This is expected during development.`);
        return [];
      }
      
      const errorText = await response.text();
      console.error(`[UserService] Backend error response:`, errorText);
      throw new Error(`Failed to fetch user assigned leads: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as { success?: boolean; data?: unknown[]; leads?: unknown[] } | unknown[];
    console.log(`[UserService] Successfully fetched leads:`, data);
    
    // Handle the new backend response format
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      if ('success' in data && data.success && 'data' in data && data.data) {
        return data.data; // Return the leads array from data.data
      } else if ('leads' in data) {
        return data.leads || [];
      }
    } else if (Array.isArray(data)) {
      return data; // Fallback for old format
    }
    
    console.warn(`[UserService] Unexpected response format:`, data);
    return [];
  } catch (error) {
    console.error(`[UserService] Error fetching leads for user ID ${userId}:`, error);
    throw error;
  }
}

// Get all users assigned to a lead from group-pairs table
export async function getLeadAssignedUsers(leadId: string | number): Promise<User[]> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await fetchWithTimeout(getApiUrl(`/api/group-pairs/lead/${leadId}/users`), {
    ...defaultFetchOptions(),
    headers: {
      ...defaultFetchOptions().headers,
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) throw new Error('Failed to fetch lead assigned users');
  return await response.json();
}

// Remove specific user-lead pairs
export async function removeUserLeadPairs(userId: string, leadIds: (string | number)[]): Promise<unknown> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await fetchWithTimeout(getApiUrl('/api/group-pairs/remove'), {
    ...defaultFetchOptions(),
    method: 'DELETE',
    headers: {
      ...defaultFetchOptions().headers,
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId, leadIds })
  });
  
  if (!response.ok) throw new Error('Failed to remove user-lead pairs');
  return await response.json();
}

// Legacy functions for backward compatibility
export async function assignConversationLeads(userId: string, leadIds: (string | number)[]): Promise<unknown> {
  return upsertUserLeadPairs(userId, leadIds);
}

export async function getUserConversationLeads(userId: string): Promise<{ leads: unknown[] }> {
  const result = await getUserAssignedLeads(userId);
  const leads = Array.isArray(result) ? result : (result as { leads?: unknown[] }).leads || [];
  return { leads };
}

// Auto-save with debouncing for pipeline preferences
let debouncedSave: ReturnType<typeof setTimeout> | null = null;

export function autoSavePipelinePreferences(preferences: PipelinePreferences, delay = 2000): void {
  if (debouncedSave) {
    clearTimeout(debouncedSave);
  }
  
  debouncedSave = setTimeout(() => {
    savePipelinePreferences(preferences)
      .catch(error => {
        console.error('Auto-save pipeline preferences failed:', error);
      });
  }, delay);
}

