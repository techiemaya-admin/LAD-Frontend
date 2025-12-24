'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, MapPin, Phone, Globe, Linkedin, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SearchResult {
  id?: string;
  companyName?: string;
  name?: string;
  username?: string;
  location?: string;
  phone?: string;
  website?: string;
  linkedinProfile?: string;
  linkedin_url?: string;
  industry?: string;
  employeeCount?: number | string;
  logoUrl?: string;
  logo?: string;
  profileImage?: string;
  companyLogo?: string;
  headline?: string;
  [key: string]: any;
}

interface SearchResultsCardsProps {
  results: SearchResult[];
  onCompanyClick?: (company: SearchResult) => void;
}

export default function SearchResultsCards({ results, onCompanyClick }: SearchResultsCardsProps) {
  if (!results || results.length === 0) {
    return null;
  }

  const getCompanyName = (result: SearchResult) => {
    return result.companyName || result.name || result.username || 'Unknown Company';
  };

  const getCompanyLogo = (result: SearchResult) => {
    return result.logoUrl || result.logo || result.profileImage || result.companyLogo;
  };

  const getLinkedInUrl = (result: SearchResult) => {
    return result.linkedinProfile || result.linkedin_url;
  };

  return (
    <div className="mt-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Found {results.length} {results.length === 1 ? 'Result' : 'Results'}
        </h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {results.map((result, index) => {
          const companyName = getCompanyName(result);
          const logo = getCompanyLogo(result);
          const linkedInUrl = getLinkedInUrl(result);
          
          return (
            <Card
              key={result.id || index}
              className="hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 rounded-xl overflow-hidden"
              onClick={() => onCompanyClick?.(result)}
            >
              <CardContent className="p-0">
                {/* Company Header */}
                <div className="bg-white p-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-14 h-14 border-2 border-gray-200">
                      <AvatarImage src={logo} alt={companyName} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        <Building2 className="w-7 h-7" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base text-gray-900 line-clamp-2 leading-tight">
                        {companyName}
                      </h4>
                      {result.headline && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {result.headline}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Details */}
                <div className="p-4 space-y-3">
                  {/* Industry */}
                  {result.industry && (
                    <div>
                      <Badge variant="outline" className="text-xs font-semibold">
                        {result.industry}
                      </Badge>
                    </div>
                  )}

                  {/* Location */}
                  {result.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{result.location}</span>
                    </div>
                  )}

                  {/* Phone */}
                  {result.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{result.phone}</span>
                    </div>
                  )}

                  {/* Employee Count */}
                  {result.employeeCount && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span>
                        {typeof result.employeeCount === 'number' 
                          ? result.employeeCount.toLocaleString() 
                          : result.employeeCount}{' '}
                        employees
                      </span>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    {result.website && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(result.website, '_blank');
                        }}
                      >
                        <Globe className="w-4 h-4 text-gray-600" />
                      </Button>
                    )}
                    {linkedInUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(linkedInUrl, '_blank');
                        }}
                      >
                        <Linkedin className="w-4 h-4 text-blue-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

