'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStudent, useStudentMutations, StudentWithLead, UpdateStudentPayload } from '@/features/deals-pipeline/features/deals-pipeline';
import { RequireFeature } from '@/components/RequireFeature';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Trash2, Edit2, X } from 'lucide-react';
import SlotBasedPipelineBoard from '@/features/deals-pipeline/components/SlotBasedPipelineBoard';

interface StudentDetailPageProps {
  params: { id: string };
}

export default function StudentDetailPage({ params }: StudentDetailPageProps) {
  const router = useRouter();
  const { id } = params;
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  
  const { data: student, loading, error, refetch } = useStudent(id);
  const { updateStudent, deleteStudent, loading: mutationLoading } = useStudentMutations();

  // Initialize edited data when student loads
  useEffect(() => {
    if (student && !editedData) {
      setEditedData(student);
    }
  }, [student, editedData]);

  const handleUpdate = (updates: Partial<any>) => {
    setEditedData((prev: any) => ({
      ...prev,
      ...updates,
      student: {
        ...prev?.student,
        ...updates,
      },
    }));
  };

  const handleSave = async () => {
    if (!editedData) return;

    try {
      // Extract education-specific fields
      const payload: UpdateStudentPayload = {
        name: editedData.name,
        email: editedData.email,
        phone: editedData.phone,
        company: editedData.company,
        value: editedData.value,
        stage: editedData.stage,
        status: editedData.status,
        source: editedData.source,
        priority: editedData.priority,
        
        // Education fields
        current_education_level: editedData.student?.current_education_level,
        current_institution: editedData.student?.current_institution,
        gpa: editedData.student?.gpa,
        graduation_year: editedData.student?.graduation_year,
        target_degree: editedData.student?.target_degree,
        target_major: editedData.student?.target_major,
        target_universities: editedData.student?.target_universities,
        target_countries: editedData.student?.target_countries,
        sat_score: editedData.student?.sat_score,
        act_score: editedData.student?.act_score,
        toefl_score: editedData.student?.toefl_score,
        ielts_score: editedData.student?.ielts_score,
        gre_score: editedData.student?.gre_score,
        gmat_score: editedData.student?.gmat_score,
        budget_range: editedData.student?.budget_range,
        preferred_intake: editedData.student?.preferred_intake,
        scholarship_interest: editedData.student?.scholarship_interest,
      };

      await updateStudent(id, payload);
      await refetch();
      setIsEditMode(false);
      
      // Show success toast
      showToast('Student updated successfully', 'success');
    } catch (err) {
      const error = err as Error;
      showToast(`Failed to update: ${error.message}`, 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteStudent(id);
      showToast('Student deleted successfully', 'success');
      router.push('/pipeline/students');
    } catch (err) {
      const error = err as Error;
      showToast(`Failed to delete: ${error.message}`, 'error');
    }
  };

  const handleCancel = () => {
    setEditedData(student);
    setIsEditMode(false);
  };

  // Simple toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const toast = document.createElement('div');
    toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg fixed bottom-4 right-4 z-50 max-w-sm`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  if (loading) {
    return (
      <RequireFeature featureKey="education_vertical">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </RequireFeature>
    );
  }

  if (error || !student) {
    return (
      <RequireFeature featureKey="education_vertical">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Student Not Found</h2>
            <p className="text-gray-600 mb-6">{error?.message || 'The student you are looking for does not exist.'}</p>
            <Button onClick={() => router.push('/pipeline/students')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Students
            </Button>
          </div>
        </div>
      </RequireFeature>
    );
  }

  return (
    <RequireFeature featureKey="education_vertical">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/pipeline/students')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                  <p className="text-sm text-gray-600">{student.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleCancel}
                      disabled={mutationLoading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={mutationLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {mutationLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleDelete}
                      disabled={mutationLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <Button
                      onClick={() => setIsEditMode(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Slot-Based Content */}
        <div className="h-[calc(100vh-88px)]">
          <SlotBasedPipelineBoard
            vertical="education"
            leadData={editedData || student}
            onUpdate={handleUpdate}
            readonly={!isEditMode}
          />
        </div>
      </div>
    </RequireFeature>
  );
}
