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

  console.log("sortCallLogs - sortConfig:", sortConfig); // DEBUG
  
  return [...items].sort((a, b) => {
    let aVal: any = a[sortConfig.field];
    let bVal: any = b[sortConfig.field];

    console.log(`Comparing ${sortConfig.field}:`, aVal, "vs", bVal); // DEBUG

    // Handle null/undefined
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    // Handle tag fields with priority cycling (hot → warm → cold)
    if (sortConfig.field === "tag" || sortConfig.field === "tags") {
      // Create dynamic priority based on which tag is prioritized (tagFilter)
      let tagPriority: Record<string, number>;
      
      if (sortConfig.tagFilter === "hot") {
        tagPriority = { hot: 3, warm: 2, cold: 1 };
      } else if (sortConfig.tagFilter === "warm") {
        tagPriority = { warm: 3, hot: 2, cold: 1 };
      } else if (sortConfig.tagFilter === "cold") {
        tagPriority = { cold: 3, hot: 2, warm: 1 };
      } else {
        tagPriority = { hot: 3, warm: 2, cold: 1 };
      }
      
      const aPriority = tagPriority[String(aVal).toLowerCase()] || 0;
      const bPriority = tagPriority[String(bVal).toLowerCase()] || 0;
      
      console.log(`Tag priorities for ${aVal}/${bVal}:`, aPriority, bPriority); // DEBUG
      
      // Sort by priority (high to low)
      return bPriority - aPriority;
    }

    // Handle date fields
    if (sortConfig.field === "startedAt") {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    // Handle numeric fields (duration, cost)
    if (sortConfig.field === "duration" || sortConfig.field === "cost") {
      const aNum = typeof aVal === "number" ? aVal : parseFloat(String(aVal)) || 0;
      const bNum = typeof bVal === "number" ? bVal : parseFloat(String(bVal)) || 0;
      return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
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
  if (field === "tag" || field === "tags") {
    // If not currently sorting by tags, start with hot
    if (currentSort?.field !== field) {
      return { field, direction: "asc", tagFilter: "hot" };
    }
    
    // Cycle through: hot → warm → cold → none
    if (currentSort?.tagFilter === "hot") {
      return { field, direction: "asc", tagFilter: "warm" };
    }
    if (currentSort?.tagFilter === "warm") {
      return { field, direction: "asc", tagFilter: "cold" };
    }
    if (currentSort?.tagFilter === "cold") {
      return null; // Clear sort, return to unsorted
    }
    
    // Default: start with hot if no tagFilter set
    return { field, direction: "asc", tagFilter: "hot" };
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
