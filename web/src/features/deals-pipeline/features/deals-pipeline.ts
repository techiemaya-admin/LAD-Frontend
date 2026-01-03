/**
 * Deals Pipeline Features Export
 * Main entry point for deals-pipeline feature module
 */

// API Types and Functions
export type { 
  StudentListFilter, 
  StudentData, 
  StudentWithLead, 
  StudentCreateData, 
  StudentUpdateData 
} from '../api/students';
export { StudentsApi } from '../api/students';

// Hooks
export { useStudents, useStudent, useStudentActions } from '../hooks/useStudents';