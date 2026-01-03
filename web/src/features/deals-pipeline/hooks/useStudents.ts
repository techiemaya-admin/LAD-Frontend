/**
 * Students Hooks
 * React hooks for managing student data and operations
 */

import { useState, useEffect } from 'react';
import { StudentsApi, StudentWithLead, StudentListFilter, StudentCreateData, StudentUpdateData } from '../api/students';
import { useAuth } from '@/contexts/AuthContext';

export function useStudents(filters?: StudentListFilter) {
  const [data, setData] = useState<StudentWithLead[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  // For now, we'll use a default campaign ID since we don't have campaign context
  // This should be updated when campaign selection is implemented
  const campaignId = 'default'; // TODO: Get from campaign context

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const students = await StudentsApi.getStudents(campaignId, filters);
      setData(students);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch students'));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      fetchStudents();
    }
  }, [campaignId, filters?.search, filters?.stage, filters?.education_level, filters?.counsellor_id, filters?.status]);

  const refetch = () => {
    fetchStudents();
  };

  return {
    data,
    loading,
    error,
    refetch
  };
}

export function useStudent(studentId: string) {
  const [data, setData] = useState<StudentWithLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const campaignId = 'default'; // TODO: Get from campaign context

  const fetchStudent = async () => {
    if (!studentId || !campaignId) return;

    try {
      setLoading(true);
      setError(null);
      const student = await StudentsApi.getStudent(campaignId, studentId);
      setData(student);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch student'));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [studentId, campaignId]);

  const refetch = () => {
    fetchStudent();
  };

  return {
    data,
    loading,
    error,
    refetch
  };
}

export function useStudentActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const campaignId = 'default'; // TODO: Get from campaign context

  const createStudent = async (data: StudentCreateData) => {
    try {
      setLoading(true);
      setError(null);
      const student = await StudentsApi.createStudent(campaignId, data);
      return student;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create student');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateStudent = async (studentId: string, data: StudentUpdateData) => {
    try {
      setLoading(true);
      setError(null);
      const student = await StudentsApi.updateStudent(campaignId, studentId, data);
      return student;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update student');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (studentId: string) => {
    try {
      setLoading(true);
      setError(null);
      await StudentsApi.deleteStudent(campaignId, studentId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete student');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateStudentStage = async (studentId: string, stage: string, notes?: string) => {
    try {
      setLoading(true);
      setError(null);
      const student = await StudentsApi.updateStudentStage(campaignId, studentId, stage, notes);
      return student;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update student stage');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createStudent,
    updateStudent,
    deleteStudent,
    updateStudentStage,
    loading,
    error
  };
}