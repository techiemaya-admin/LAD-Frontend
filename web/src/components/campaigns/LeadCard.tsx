'use client';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Phone,
  MapPin,
  Mail,
  Linkedin,
  Building2,
  CheckCircle2,
  Globe,
} from 'lucide-react';

interface LeadCardProps {
  lead: {
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    linkedin_url?: string;
    company?: string;
    title?: string;
    status?: string;
    city?: string;
    state?: string;
    country?: string;
    website?: string;
    photo_url?: string;
    profile_image?: string;
    [key: string]: any;
  };
  index?: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onViewDetails?: (lead: any) => void;
  onViewEmployees?: (lead: any) => void;
}

export default function LeadCard({
  lead,
  index = 0,
  isSelected = false,
  onSelect,
  onViewDetails,
  onViewEmployees,
}: LeadCardProps) {
  if (!lead) return null;

  const leadId = lead.id || index;
  const leadName = lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Lead';
  const leadPhoto = lead.photo_url || lead.profile_image;

  const locationParts = [
    lead.city,
    lead.state,
    lead.country,
  ].filter(Boolean);
  const locationLabel = locationParts.join(', ');

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'stopped': return 'destructive';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Card
      onClick={onSelect}
      className={`
        flex-1 min-h-full flex flex-col transition-all duration-200 rounded-xl overflow-hidden relative
        ${isSelected 
          ? 'border-2 border-[#0b1957] shadow-lg' 
          : 'border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
        }
        bg-white cursor-pointer
        ${isSelected ? 'before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[#0b1957] before:z-10' : ''}
      `}
    >
      <CardContent className="flex-grow p-0 relative z-20">
        {/* Header */}
        <div className="bg-white p-6 relative">
          <div className="flex items-start gap-4 relative">
            <div className="relative flex-shrink-0">
              <Avatar
                className={`w-12 h-12 ${isSelected ? 'border-[3px] border-[#0b1957]' : 'border-2 border-gray-200'}`}
              >
                <AvatarImage src={leadPhoto} alt={leadName} />
                <AvatarFallback className="bg-[#0b1957] text-white">
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0b1957] flex items-center justify-center border-2 border-white shadow-md z-30">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 min-h-[56px] flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewDetails) {
                      onViewDetails(lead);
                    }
                  }}
                  className="font-bold text-lg leading-snug text-black cursor-pointer transition-colors line-clamp-2 hover:text-[#0b1957] hover:underline"
                >
                  {leadName}
                </h3>
                {lead.title && (
                  <p className="text-slate-500 text-xs mt-1">
                    {lead.title}
                  </p>
                )}
              </div>
              {lead.status && (
                <Badge variant={getStatusColor(lead.status) as any} className="capitalize text-xs ml-2">
                  {lead.status}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {/* Body */}
        <div className="p-6 pt-4">
          <div className="mb-0">
            {/* Company */}
            {lead.company && (
              <div className="min-h-[24px] mb-2">
                <Badge variant="outline" className="font-bold h-6 gap-1">
                  <Building2 className="w-4 h-4" />
                  {lead.company}
                </Badge>
              </div>
            )}
            {/* Contact + location row */}
            <div className="flex flex-col gap-2 mb-3">
              {/* Phone */}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-[18px] h-[18px] text-[#0b1957]" />
                  <span className="text-[#0b1957] text-sm font-semibold">
                    {lead.phone}
                  </span>
                </div>
              )}
              {/* Email */}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-[18px] h-[18px] text-[#0b1957]" />
                  <span className="text-[#0b1957] text-sm font-semibold">
                    {lead.email}
                  </span>
                </div>
              )}
              {/* Location */}
              {locationLabel && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-[18px] h-[18px] text-[#0b1957]" />
                  <span className="text-[#0b1957] text-sm">
                    {locationLabel}
                  </span>
                </div>
              )}
            </div>
            {/* Links row */}
            {(lead.website || lead.linkedin_url) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {lead.website && (
                  <Badge
                    variant="outline"
                    className="bg-gray-50 text-[#0b1957] border-gray-300 hover:border-[#0b1957] cursor-pointer gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(lead.website, '_blank');
                    }}
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </Badge>
                )}
                {lead.linkedin_url && (
                  <Badge
                    variant="outline"
                    className="bg-gray-50 text-[#0077b5] border-gray-300 hover:border-[#0077b5] cursor-pointer gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(lead.linkedin_url, '_blank');
                    }}
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      {/* Footer actions */}
      {onViewEmployees && lead.company && (
        <div className="px-6 pb-6 pt-0 flex items-center justify-center gap-4">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (onViewEmployees) {
                onViewEmployees(lead);
              }
            }}
            className="bg-gradient-to-br from-[#00d2ff] to-[#3a7bd5] text-white font-bold text-sm px-9 py-2 h-[38px] min-w-[160px] rounded-full shadow-[0_4px_12px_rgba(0,210,255,0.4)] transition-all duration-300 hover:from-[#3a7bd5] hover:to-[#2a5db0] hover:-translate-y-0.5"
          >
            View Employees
          </Button>
        </div>
      )}
    </Card>
  );
}
