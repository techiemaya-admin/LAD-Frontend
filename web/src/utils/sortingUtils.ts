/**
 * Sorting utilities for call logs table
 * Supports sorting by multiple fields with ASC/DESC direction
 */

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: string;
  direction: SortDirection;
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
 * If sorting the same field, toggle direction
 * If sorting a new field, start with ASC
 */
export function toggleSortDirection(
  currentSort: SortConfig | null,
  field: string
): SortConfig {
  if (currentSort?.field === field) {
    return {
      field,
      direction: currentSort.direction === "asc" ? "desc" : "asc",
    };
  }
  return { field, direction: "asc" };
}
