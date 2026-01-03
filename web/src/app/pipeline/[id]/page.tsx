"use client";

import React, { JSX } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, GraduationCap, BookOpen } from 'lucide-react';

// Force dynamic rendering for this page due to Redux usage
export const dynamic = 'force-dynamic';

export default function PipelineDetailPage(): JSX.Element {
  const { id } = useParams();
  const router = useRouter();
  const { hasFeature } = useAuth();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Determine if this is education vertical
  const isEducation = hasFeature('education_vertical');
  
  // Dynamic labels based on vertical
  const labels = {
    entity: isEducation ? 'Student' : 'Lead',
    entityPlural: isEducation ? 'Students' : 'Leads',
    pipeline: isEducation ? 'Admissions Pipeline' : 'Pipeline',
    owner: isEducation ? 'Counsellor' : 'Owner',
    deal: isEducation ? 'Application' : 'Deal',
    value: isEducation ? 'Program Fee' : 'Value'
  };

  useEffect(() => {
    (async () => {    
      try {
        await getCurrentUser();
        setAuthed(true);
      } catch {
        setAuthed(false);
        const redirect = encodeURIComponent(`/pipeline/${id}`);
        router.replace(`/login?redirect_url=${redirect}`);
      }
    })();
  }, [router, id]);

  useEffect(() => {
    // TODO: Implement actual lead/student data fetching
    // For now, using mock data structure
    if (authed) {
      setLoading(true);
      // This would be replaced with actual API call
      // Example: useStudent(id) or useLead(id) hook
      setTimeout(() => {
        setLeadData({
          id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@email.com',
          phone: '+1 234 567 8900',
          status: 'qualified',
          assignedTo: 'Jane Smith',
          source: 'Website',
          createdAt: '2024-01-15T10:30:00Z',
          // Education-specific fields (only shown if education vertical)
          program: isEducation ? 'Computer Science' : undefined,
          intakeYear: isEducation ? '2024' : undefined,
          gpa: isEducation ? '3.8' : undefined,
        });
        setLoading(false);
      }, 500);
    }
  }, [authed, id, isEducation]);

  if (authed === null) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authed) return <></>;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {labels.pipeline}
        </Button>
        <div className="flex items-center gap-3">
          {isEducation ? (
            <GraduationCap className="h-8 w-8 text-blue-600" />
          ) : (
            <User className="h-8 w-8 text-blue-600" />
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {labels.entity} Profile
            </h1>
            <p className="text-gray-600">
              {leadData?.firstName} {leadData?.lastName}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">First Name</label>
                  <p className="text-base text-gray-900">{leadData?.firstName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Name</label>
                  <p className="text-base text-gray-900">{leadData?.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="text-base text-gray-900">{leadData?.email}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p className="text-base text-gray-900">{leadData?.phone}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Education-specific Information */}
          {isEducation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Academic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Program</label>
                    <p className="text-base text-gray-900">{leadData?.program}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Intake Year</label>
                    <p className="text-base text-gray-900">{leadData?.intakeYear}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">GPA</label>
                    <p className="text-base text-gray-900">{leadData?.gpa}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Information */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Current Status</label>
                <Badge variant="outline" className="mt-1">
                  {leadData?.status}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{labels.owner}</label>
                <p className="text-base text-gray-900">{leadData?.assignedTo}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Source</label>
                <p className="text-base text-gray-900">{leadData?.source}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-900">
                    {new Date(leadData?.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button className="w-full" variant="outline">
                <Phone className="h-4 w-4 mr-2" />
                {isEducation ? 'Schedule Counselling' : 'Make Call'}
              </Button>
              <Button className="w-full" variant="outline">
                Edit {labels.entity}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}