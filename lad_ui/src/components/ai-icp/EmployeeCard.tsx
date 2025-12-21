/**
 * Employee Card Component
 * Display employee information from Apollo.io search results
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  Linkedin, 
  Loader2,
  Lock,
  Unlock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApolloEmployee } from '@/services/apolloLeadsService';

interface EmployeeCardProps {
  employee: ApolloEmployee;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onRevealContact?: (type: 'email' | 'phone') => void;
  revealingEmail?: boolean;
  revealingPhone?: boolean;
  className?: string;
}

export function EmployeeCard({
  employee,
  selected = false,
  onSelect,
  onRevealContact,
  revealingEmail = false,
  revealingPhone = false,
  className
}: EmployeeCardProps) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const fullName = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim();

  return (
    <Card className={cn('hover:shadow-lg transition-all', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Avatar className="h-12 w-12 border-2 border-muted">
              {employee.photo_url && !imageError ? (
                <AvatarImage 
                  src={employee.photo_url} 
                  alt={fullName}
                  onError={() => setImageError(true)}
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-green-500 to-teal-600 text-white">
                {getInitials(fullName || 'N/A')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">
                {fullName || 'Unknown'}
              </h3>
              {employee.title && (
                <p className="text-sm text-muted-foreground truncate">
                  {employee.title}
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
        {/* Company Info */}
        {employee.company_name && (
          <div className="flex items-center space-x-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{employee.company_name}</span>
          </div>
        )}

        {/* Contact Information */}
        <div className="space-y-2">
          {/* Email */}
          {employee.email ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{employee.email}</span>
              </div>
              {employee.revealed && (
                <Badge variant="outline" className="ml-2 text-xs">
                  <Unlock className="h-3 w-3 mr-1" />
                  Revealed
                </Badge>
              )}
            </div>
          ) : onRevealContact && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRevealContact('email')}
              disabled={revealingEmail}
              className="w-full"
            >
              {revealingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revealing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Reveal Email (8 credits)
                </>
              )}
            </Button>
          )}

          {/* Phone */}
          {employee.phone ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">{employee.phone}</span>
              </div>
              {employee.revealed && (
                <Badge variant="outline" className="ml-2 text-xs">
                  <Unlock className="h-3 w-3 mr-1" />
                  Revealed
                </Badge>
              )}
            </div>
          ) : onRevealContact && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRevealContact('phone')}
              disabled={revealingPhone}
              className="w-full"
            >
              {revealingPhone ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revealing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Reveal Phone (8 credits)
                </>
              )}
            </Button>
          )}
        </div>

        {/* LinkedIn */}
        {employee.linkedin_url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(employee.linkedin_url, '_blank')}
            className="w-full"
          >
            <Linkedin className="h-4 w-4 mr-2" />
            View LinkedIn Profile
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Employee Grid Component
 */
interface EmployeeGridProps {
  employees: ApolloEmployee[];
  selectedEmployees?: Set<string>;
  onSelectEmployee?: (employeeId: string, selected: boolean) => void;
  onRevealContact?: (employeeId: string, type: 'email' | 'phone') => void;
  revealingContacts?: Map<string, 'email' | 'phone'>;
  loading?: boolean;
  className?: string;
}

export function EmployeeGrid({
  employees,
  selectedEmployees = new Set(),
  onSelectEmployee,
  onRevealContact,
  revealingContacts = new Map(),
  loading = false,
  className
}: EmployeeGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No employees found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Try adjusting your search criteria or search within companies first
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
      className
    )}>
      {employees.map((employee) => (
        <EmployeeCard
          key={employee.id}
          employee={employee}
          selected={selectedEmployees.has(employee.id)}
          onSelect={onSelectEmployee ? (selected) => onSelectEmployee(employee.id, selected) : undefined}
          onRevealContact={onRevealContact ? (type) => onRevealContact(employee.id, type) : undefined}
          revealingEmail={revealingContacts.get(employee.id) === 'email'}
          revealingPhone={revealingContacts.get(employee.id) === 'phone'}
        />
      ))}
    </div>
  );
}
