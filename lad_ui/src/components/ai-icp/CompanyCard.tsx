/**
 * Company Card Component
 * Display company information from Apollo.io search results
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Building2, 
  MapPin, 
  Users, 
  Phone, 
  Globe, 
  Linkedin, 
  ExternalLink,
  Loader2,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApolloCompany } from '@/services/apolloLeadsService';

interface CompanyCardProps {
  company: ApolloCompany;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onViewDetails?: () => void;
  className?: string;
}

export function CompanyCard({
  company,
  selected = false,
  onSelect,
  onViewDetails,
  className
}: CompanyCardProps) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatEmployeeCount = (count?: number) => {
    if (!count) return 'N/A';
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <Card className={cn('hover:shadow-lg transition-all', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Avatar className="h-12 w-12 border-2 border-muted">
              {company.logo_url && !imageError ? (
                <AvatarImage 
                  src={company.logo_url} 
                  alt={company.name}
                  onError={() => setImageError(true)}
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {getInitials(company.name || company.company_name || 'CO')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">
                {company.name || company.company_name}
              </h3>
              {company.industry && (
                <p className="text-sm text-muted-foreground truncate">
                  {company.industry}
                </p>
              )}
            </div>
          </div>

          {onSelect && (
            <Checkbox
              checked={selected}
              onCheckedChange={onSelect}
              className="ml-2"
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          {company.employee_count && (
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {formatEmployeeCount(company.employee_count)} employees
            </Badge>
          )}
          {company.location && (
            <Badge variant="secondary" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {company.location}
            </Badge>
          )}
          {company.revenue && (
            <Badge variant="secondary" className="text-xs">
              ${company.revenue}
            </Badge>
          )}
        </div>

        {/* Description */}
        {company.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {company.description}
          </p>
        )}

        {/* AI Summary */}
        {company.summary && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">AI Insights:</p>
            <p className="text-sm line-clamp-3">{company.summary}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            {company.linkedin_url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(company.linkedin_url, '_blank')}
                title="LinkedIn Profile"
              >
                <Linkedin className="h-4 w-4" />
              </Button>
            )}
            {(company.website || company.domain) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(
                  company.website || `https://${company.domain}`, 
                  '_blank'
                )}
                title="Website"
              >
                <Globe className="h-4 w-4" />
              </Button>
            )}
            {company.phone && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => window.open(`tel:${company.phone}`, '_blank')}
                title="Call"
              >
                <Phone className="h-4 w-4" />
              </Button>
            )}
          </div>

          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
            >
              <Eye className="h-4 w-4 mr-2" />
              Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Company Grid Component
 */
interface CompanyGridProps {
  companies: ApolloCompany[];
  selectedCompanies?: Set<string>;
  onSelectCompany?: (companyId: string, selected: boolean) => void;
  onViewCompanyDetails?: (company: ApolloCompany) => void;
  loading?: boolean;
  className?: string;
}

export function CompanyGrid({
  companies,
  selectedCompanies = new Set(),
  onSelectCompany,
  onViewCompanyDetails,
  loading = false,
  className
}: CompanyGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No companies found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Try adjusting your search criteria
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
      className
    )}>
      {companies.map((company) => (
        <CompanyCard
          key={company.id}
          company={company}
          selected={selectedCompanies.has(company.id)}
          onSelect={onSelectCompany ? (selected) => onSelectCompany(company.id, selected) : undefined}
          onViewDetails={onViewCompanyDetails ? () => onViewCompanyDetails(company) : undefined}
        />
      ))}
    </div>
  );
}
