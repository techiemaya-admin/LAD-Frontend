'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
interface LeadData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  stage?: string;
  value?: number;
  tags?: string[];
  custom_fields?: Record<string, any>;
}
interface LeadDetailsSlotProps {
  lead: LeadData;
  onUpdate?: (updates: Partial<LeadData>) => void;
  readonly?: boolean;
}
export default function LeadDetailsSlot({ lead, onUpdate, readonly = false }: LeadDetailsSlotProps) {
  const handleFieldChange = (field: string, value: any) => {
    if (!readonly && onUpdate) {
      onUpdate({ [field]: value });
    }
  };
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Lead Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={lead.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            disabled={readonly}
          />
        </div>
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={lead.email || ''}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            disabled={readonly}
          />
        </div>
        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={lead.phone || ''}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            disabled={readonly}
          />
        </div>
        {/* Company */}
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={lead.company || ''}
            onChange={(e) => handleFieldChange('company', e.target.value)}
            disabled={readonly}
          />
        </div>
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={lead.title || ''}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            disabled={readonly}
          />
        </div>
        {/* Deal Value */}
        {lead.value !== undefined && (
          <div className="space-y-2">
            <Label htmlFor="value">Deal Value</Label>
            <Input
              id="value"
              type="number"
              value={lead.value}
              onChange={(e) => handleFieldChange('value', parseFloat(e.target.value))}
              disabled={readonly}
            />
          </div>
        )}
        {/* Tags */}
        {lead.tags && lead.tags.length > 0 && (
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {lead.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {/* Stage */}
        {lead.stage && (
          <div className="space-y-2">
            <Label>Stage</Label>
            <Badge variant="default">{lead.stage}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}