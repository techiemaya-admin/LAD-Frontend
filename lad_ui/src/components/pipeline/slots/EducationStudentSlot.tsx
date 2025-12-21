'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface StudentData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  
  // Academic fields
  current_education_level?: string;
  current_institution?: string;
  gpa?: number;
  graduation_year?: number;
  
  // Target fields
  target_degree?: string;
  target_major?: string;
  target_universities?: string[];
  target_countries?: string[];
  
  // Test scores
  sat_score?: number;
  act_score?: number;
  toefl_score?: number;
  ielts_score?: number;
  gre_score?: number;
  gmat_score?: number;
  
  // Preferences
  budget_range?: string;
  preferred_intake?: string;
  scholarship_interest?: boolean;
}

interface EducationStudentSlotProps {
  student: StudentData;
  onUpdate?: (updates: Partial<StudentData>) => void;
  readonly?: boolean;
}

export default function EducationStudentSlot({ student, onUpdate, readonly = false }: EducationStudentSlotProps) {
  const handleFieldChange = (field: string, value: any) => {
    if (!readonly && onUpdate) {
      onUpdate({ [field]: value });
    }
  };

  return (
    <Card className="h-full overflow-auto">
      <CardHeader>
        <CardTitle>Academic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Education */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Current Education</h3>
          
          <div className="space-y-2">
            <Label htmlFor="current_education_level">Education Level</Label>
            <Select
              value={student.current_education_level || ''}
              onValueChange={(value) => handleFieldChange('current_education_level', value)}
              disabled={readonly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high_school">High School</SelectItem>
                <SelectItem value="bachelors">Bachelor's</SelectItem>
                <SelectItem value="masters">Master's</SelectItem>
                <SelectItem value="phd">PhD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_institution">Current Institution</Label>
            <Input
              id="current_institution"
              value={student.current_institution || ''}
              onChange={(e) => handleFieldChange('current_institution', e.target.value)}
              disabled={readonly}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gpa">GPA</Label>
              <Input
                id="gpa"
                type="number"
                step="0.01"
                max="4.0"
                value={student.gpa || ''}
                onChange={(e) => handleFieldChange('gpa', parseFloat(e.target.value))}
                disabled={readonly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="graduation_year">Graduation Year</Label>
              <Input
                id="graduation_year"
                type="number"
                value={student.graduation_year || ''}
                onChange={(e) => handleFieldChange('graduation_year', parseInt(e.target.value))}
                disabled={readonly}
              />
            </div>
          </div>
        </div>

        {/* Target Education */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Target Program</h3>
          
          <div className="space-y-2">
            <Label htmlFor="target_degree">Target Degree</Label>
            <Input
              id="target_degree"
              value={student.target_degree || ''}
              onChange={(e) => handleFieldChange('target_degree', e.target.value)}
              disabled={readonly}
              placeholder="e.g., Master of Science"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_major">Major/Specialization</Label>
            <Input
              id="target_major"
              value={student.target_major || ''}
              onChange={(e) => handleFieldChange('target_major', e.target.value)}
              disabled={readonly}
              placeholder="e.g., Computer Science"
            />
          </div>

          {student.target_universities && student.target_universities.length > 0 && (
            <div className="space-y-2">
              <Label>Target Universities</Label>
              <div className="flex flex-wrap gap-2">
                {student.target_universities.map((uni, index) => (
                  <Badge key={index} variant="outline">
                    {uni}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {student.target_countries && student.target_countries.length > 0 && (
            <div className="space-y-2">
              <Label>Target Countries</Label>
              <div className="flex flex-wrap gap-2">
                {student.target_countries.map((country, index) => (
                  <Badge key={index} variant="outline">
                    {country}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Test Scores */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Test Scores</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {student.sat_score && (
              <div className="space-y-2">
                <Label>SAT Score</Label>
                <Badge variant="secondary">{student.sat_score}</Badge>
              </div>
            )}

            {student.act_score && (
              <div className="space-y-2">
                <Label>ACT Score</Label>
                <Badge variant="secondary">{student.act_score}</Badge>
              </div>
            )}

            {student.toefl_score && (
              <div className="space-y-2">
                <Label>TOEFL Score</Label>
                <Badge variant="secondary">{student.toefl_score}</Badge>
              </div>
            )}

            {student.ielts_score && (
              <div className="space-y-2">
                <Label>IELTS Score</Label>
                <Badge variant="secondary">{student.ielts_score}</Badge>
              </div>
            )}

            {student.gre_score && (
              <div className="space-y-2">
                <Label>GRE Score</Label>
                <Badge variant="secondary">{student.gre_score}</Badge>
              </div>
            )}

            {student.gmat_score && (
              <div className="space-y-2">
                <Label>GMAT Score</Label>
                <Badge variant="secondary">{student.gmat_score}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Preferences</h3>
          
          <div className="space-y-2">
            <Label htmlFor="budget_range">Budget Range</Label>
            <Input
              id="budget_range"
              value={student.budget_range || ''}
              onChange={(e) => handleFieldChange('budget_range', e.target.value)}
              disabled={readonly}
              placeholder="e.g., $20,000 - $40,000/year"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred_intake">Preferred Intake</Label>
            <Select
              value={student.preferred_intake || ''}
              onValueChange={(value) => handleFieldChange('preferred_intake', value)}
              disabled={readonly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select intake" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fall">Fall</SelectItem>
                <SelectItem value="spring">Spring</SelectItem>
                <SelectItem value="summer">Summer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {student.scholarship_interest && (
            <div className="space-y-2">
              <Badge variant="default">Interested in Scholarships</Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
