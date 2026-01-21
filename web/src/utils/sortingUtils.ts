/**
 * Sorting utilities for call logs table
 * Supports sorting by multiple fields with ASC/DESC direction
 */

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: string;
  direction: SortDirection;
  tagFilter?: "hot" | "warm" | "cold"; // For cycling through tag priorities
}

export interface CallLogForSorting {
  id: string;
  startedAt?: string;
  duration?: number;
  lead_name?: string;
  [key: string]: any;
}

/**
 * Sort call logs by specified field
 * Handles null/undefined values gracefully
 * Special handling for tag-based sorting with priority order
 */
export function sortCallLogs<T extends CallLogForSorting>(
  items: T[],
  sortConfig: SortConfig | null
): T[] {
  if (!sortConfig) return items;

  return [...items].sort((a, b) => {
    let aVal: any = a[sortConfig.field];
    let bVal: any = b[sortConfig.field];

    // Handle null/undefined
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    // Handle tag fields with priority cycling (hot → warm → cold)
    if (sortConfig.field === "tags" || sortConfig.field === "tag") {
      const tagPriority: Record<string, number> = {
        hot: 3,
        warm: 2,
        cold: 1,
      };
      
      const aPriority = tagPriority[String(aVal).toLowerCase()] || 0;
      const bPriority = tagPriority[String(bVal).toLowerCase()] || 0;
      
      // If tagFilter is set, prioritize that tag first
      if (sortConfig.tagFilter) {
        const filterPriority = tagPriority[sortConfig.tagFilter] || 0;
        
        // Items matching the filter tag go first
        const aIsFilter = aPriority === filterPriority ? 1 : 0;
        const bIsFilter = bPriority === filterPriority ? 1 : 0;
        
        if (aIsFilter !== bIsFilter) {
          return bIsFilter - aIsFilter; // Filter match goes first
        }
      }
      
      // Then sort by priority (high to low)
      return bPriority - aPriority;
    }

    // Handle date fields
    if (sortConfig.field === "startedAt") {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    // Handle numeric fields
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    // Handle string fields
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    const cmp = aStr.localeCompare(bStr);
    return sortConfig.direction === "asc" ? cmp : -cmp;
  });
}

/**
 * Toggle sort direction
 * For tags: cycles through hot → warm → cold → none
 * For other fields: toggles between asc and desc
 */
export function toggleSortDirection(
  currentSort: SortConfig | null,
  field: string
): SortConfig | null {
  // Special handling for tag sorting - cycle through lead temperatures
  if (field === "tags" || field === "tag") {
    // If not currently sorting by tags, start with hot
    if (currentSort?.field !== field) {
      return { field, direction: "asc", tagFilter: "hot" };
    }
    
    // Cycle through: hot → warm → cold → none
    if (currentSort.tagFilter === "hot") {
      return { field, direction: "asc", tagFilter: "warm" };
    }
    if (currentSort.tagFilter === "warm") {
      return { field, direction: "asc", tagFilter: "cold" };
    }
    if (currentSort.tagFilter === "cold") {
      return null; // Clear sort, return to unsorted
    }
  }

  // Standard toggle for other fields
  if (currentSort?.field === field) {
    return {
      field,
      direction: currentSort.direction === "asc" ? "desc" : "asc",
    };
  }
  return { field, direction: "asc" };
}
