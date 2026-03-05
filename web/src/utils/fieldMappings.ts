/**
 * Field Mapping Utilities
 * Handles conversion between database snake_case and UI camelCase field names
 */
/**
 * Maps database field names (snake_case) to UI field names (camelCase)
 */
export const DB_TO_UI_FIELD_MAP: Record<string, string> = {
  // Date fields
  'close_date': 'closeDate',
  'due_date': 'dueDate', 
  'expected_close_date': 'expectedCloseDate',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  'last_activity': 'lastActivity',
  'last_message_time': 'lastMessageTime',
  // Other common fields
  'assigned_to_id': 'assignedToId',
  'created_by_id': 'createdById',
  'organization_id': 'organizationId',
  'job_title': 'jobTitle',
  'lead_type': 'leadType',
  'last_message': 'lastMessage',
  'owner_id': 'ownerId',
  'deal_recommendation': 'dealRecommendation',
  'engagement_label': 'engagementLabel',
  'engagement_comparison': 'engagementComparison',
  'is_archived': 'isArchived',
  'is_deleted': 'isDeleted'
};
/**
 * Maps UI field names (camelCase) to database field names (snake_case)
 */
export const UI_TO_DB_FIELD_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(DB_TO_UI_FIELD_MAP).map(([db, ui]) => [ui, db])
);
/**
 * Date fields that need special formatting
 */
export const DATE_FIELDS: string[] = [
  'closeDate', 'close_date',
  'dueDate', 'due_date',
  'expectedCloseDate', 'expected_close_date', 
  'createdAt', 'created_at',
  'updatedAt', 'updated_at',
  'lastActivity', 'last_activity',
  'lastMessageTime', 'last_message_time'
];
/**
 * Normalize a single object's field names from snake_case to camelCase
 * @param obj - Object with potentially snake_case field names
 * @returns Object with camelCase field names
 */
export const normalizeFieldNames = <T extends Record<string, unknown>>(obj: T | null | undefined): T => {
  if (!obj || typeof obj !== 'object') return obj as T;
  const normalized = { ...obj } as T;
  // Add camelCase versions of snake_case fields
  Object.entries(DB_TO_UI_FIELD_MAP).forEach(([dbField, uiField]) => {
    if (obj[dbField] !== undefined) {
      (normalized as Record<string, unknown>)[uiField] = obj[dbField];
    }
  });
  return normalized;
};
/**
 * Normalize an array of objects' field names
 * @param items - Array of objects to normalize
 * @returns Array of objects with normalized field names
 */
export const normalizeArrayFieldNames = <T extends Record<string, unknown>>(items: T[] | null | undefined): T[] => {
  if (!Array.isArray(items)) return items || [];
  return items.map(normalizeFieldNames);
};
/**
 * Check if a field is a date field
 * @param fieldName - Field name to check
 * @returns True if it's a date field
 */
export const isDateField = (fieldName: string): boolean => {
  return DATE_FIELDS.includes(fieldName);
};
/**
 * Get the value of a field, trying both camelCase and snake_case versions
 * @param obj - Object to get value from
 * @param fieldName - Field name (camelCase preferred)
 * @returns Field value or undefined
 */
export const getFieldValue = <T = unknown>(obj: Record<string, unknown> | null | undefined, fieldName: string): T | undefined => {
  if (!obj) return undefined;
  // Try camelCase first
  if (obj[fieldName] !== undefined) {
    return obj[fieldName] as T;
  }
  // Try snake_case version
  const snakeCaseField = UI_TO_DB_FIELD_MAP[fieldName];
  if (snakeCaseField && obj[snakeCaseField] !== undefined) {
    return obj[snakeCaseField] as T;
  }
  return undefined;
};