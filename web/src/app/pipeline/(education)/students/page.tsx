'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStudents, StudentWithLead, StudentListFilter } from '@/sdk/features/deals-pipeline';
import { RequireFeature } from '@/components/RequireFeature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Search, Plus, Mail, Phone, User, MapPin } from 'lucide-react';

export default function StudentsListPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<StudentListFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: students, loading, error, refetch } = useStudents(filters);

  const handleFilterChange = (key: keyof StudentListFilter, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchQuery }));
  };

  const handleStudentClick = (studentId: string) => {
    router.push(`/pipeline/students/${studentId}`);
  };

  const handleCreateStudent = () => {
    router.push('/pipeline/students/new');
  };

  return (
    <RequireFeature featureKey="education_vertical">
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Students</h1>
                <p className="text-gray-600">Manage student admissions and counseling</p>
              </div>
            </div>
            <Button onClick={handleCreateStudent} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={handleSearch} variant="secondary">
                      Search
                    </Button>
                  </div>
                </div>

                {/* Stage Filter */}
                <Select value={filters.stage || ''} onValueChange={(value) => handleFilterChange('stage', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Stages</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="application">Application</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                  </SelectContent>
                </Select>

                {/* Education Level Filter */}
                <Select 
                  value={filters.education_level || ''} 
                  onValueChange={(value) => handleFilterChange('education_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Education Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Levels</SelectItem>
                    <SelectItem value="high_school">High School</SelectItem>
                    <SelectItem value="bachelors">Bachelor's</SelectItem>
                    <SelectItem value="masters">Master's</SelectItem>
                    <SelectItem value="phd">PhD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-600">Error loading students: {error.message}</p>
              <Button onClick={refetch} className="mt-4" variant="outline">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Students Grid */}
        {!loading && !error && students && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-12 text-center">
                  <GraduationCap className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Students Found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery || Object.keys(filters).length > 0
                      ? 'Try adjusting your filters'
                      : 'Get started by adding your first student'}
                  </p>
                  {!searchQuery && Object.keys(filters).length === 0 && (
                    <Button onClick={handleCreateStudent} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Student
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              students.map((student) => (
                <Card
                  key={student.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleStudentClick(student.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                        <Badge variant="secondary" className="mt-2">
                          {student.stage}
                        </Badge>
                      </div>
                      <User className="h-5 w-5 text-gray-400" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Contact Info */}
                    {student.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{student.email}</span>
                      </div>
                    )}
                    {student.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{student.phone}</span>
                      </div>
                    )}

                    {/* Academic Info */}
                    {student.student && (
                      <>
                        {student.student.current_education_level && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <GraduationCap className="h-4 w-4" />
                            <span className="capitalize">
                              {student.student.current_education_level.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                        {student.student.target_countries && student.student.target_countries.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate">
                              {student.student.target_countries.join(', ')}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Status */}
                    <div className="pt-3 border-t">
                      <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                        {student.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Summary */}
        {!loading && students && students.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            Showing {students.length} student{students.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </RequireFeature>
  );
}
