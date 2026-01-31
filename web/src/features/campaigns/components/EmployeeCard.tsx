'use client';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  User,
  Mail,
  Phone,
  Lock,
  CheckCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Linkedin,
  Loader2,
} from 'lucide-react';
interface EmployeeCardProps {
  employee: {
    id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    email?: string;
    phone?: string;
    linkedin_url?: string;
    enriched_email?: string | null;
    enriched_linkedin_url?: string | null;
    photo_url?: string;
    profile_image?: string;
    is_inbound?: boolean; // Flag to identify inbound leads
    [key: string]: any;
  };
  employeeViewMode?: 'grid' | 'list';
  revealedContacts?: Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean }>;
  revealingContacts?: Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean }>;
  handleRevealPhone?: (employee: any) => void;
  handleRevealEmail?: (employee: any) => void;
  handleRevealLinkedIn?: (employee: any) => void;
  onViewSummary?: (employee: any) => void;
  profileSummary?: string | null;
  hideUnlockFeatures?: boolean; // New prop to hide unlock buttons for inbound campaigns
}
export default function EmployeeCard({
  employee,
  employeeViewMode = 'grid',
  revealedContacts = {},
  revealingContacts = {},
  handleRevealPhone,
  handleRevealEmail,
  handleRevealLinkedIn,
  onViewSummary,
  profileSummary,
  hideUnlockFeatures = false, // Default to false
}: EmployeeCardProps) {
  const [summaryExpanded, setSummaryExpanded] = React.useState(false);
  if (!employee) return null;
  const idKey = employee.id || employee.name || '';
  const employeeName = employee.name || 
    `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
    'Unknown';
  const phoneRevealed = revealedContacts[idKey]?.phone;
  const emailRevealed = revealedContacts[idKey]?.email || Boolean(employee.enriched_email);
  const linkedinRevealed = revealedContacts[idKey]?.linkedin || Boolean(employee.enriched_linkedin_url || employee.linkedin_url);
  const phoneLoading = revealingContacts[idKey]?.phone;
  const emailLoading = revealingContacts[idKey]?.email;
  const linkedinLoading = revealingContacts[idKey]?.linkedin;
  
  // Get actual values to display (prioritize enriched data)
  const displayEmail = employee.enriched_email || employee.email;
  const displayLinkedIn = employee.enriched_linkedin_url || employee.linkedin_url;
  
  // Determine if unlock features should be shown
  // Hide if: hideUnlockFeatures is true OR employee is marked as inbound
  const shouldHideUnlock = hideUnlockFeatures || employee.is_inbound === true;
  return (
    <Card
      className={`
        flex-1 min-h-full bg-white rounded-xl border border-gray-200 shadow-sm
        transition-all duration-300 ease-in-out relative overflow-hidden
        hover:shadow-lg hover:border-[#0b1957]
        ${employeeViewMode === 'grid' ? 'hover:-translate-y-1' : 'hover:-translate-y-0.5'}
      `}
    >
      <CardContent className={employeeViewMode === 'grid' ? 'p-6' : 'p-5'}>
        <div
          className={`
            flex items-center w-full
            ${employeeViewMode === 'grid' 
              ? 'flex-col gap-3 justify-center' 
              : 'flex-row gap-8 justify-between'
            }
          `}
        >
          {/* Avatar - Top (for grid view) */}
          {employeeViewMode === 'grid' && (
            <div className="flex justify-center mb-4 w-full">
              <Avatar className="w-[90px] h-[90px] border-4 border-[#0b1957] shadow-md flex-shrink-0">
                <AvatarImage src={employee.photo_url} alt={employeeName} />
                <AvatarFallback className="bg-gray-200">
                  <User className="w-12 h-12 text-gray-500" />
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          {/* Name & Title - Center aligned for grid */}
          <div
            className={`
              flex flex-col gap-2 w-full
              ${employeeViewMode === 'grid' ? 'items-center text-center' : 'items-start text-left'}
            `}
          >
            {/* Avatar for list view */}
            {employeeViewMode === 'list' && (
              <Avatar className="w-20 h-20 border-3 border-[#0b1957] shadow-lg flex-shrink-0 mb-2">
                <AvatarImage src={employee.photo_url} alt={employeeName} />
                <AvatarFallback className="bg-gray-200">
                  <User className="w-10 h-10 text-gray-500" />
                </AvatarFallback>
              </Avatar>
            )}
            <h3
              className={`
                font-bold text-[1.05rem] text-[#0b1957] leading-tight w-full
                ${employeeViewMode === 'grid' ? 'break-words' : 'whitespace-nowrap overflow-hidden text-ellipsis'}
              `}
            >
              {employeeName}
            </h3>
            {employee.title && (
              <Badge
                variant="default"
                className={`
                  font-semibold text-xs h-[26px] max-w-fit px-3
                  ${employeeViewMode === 'grid' ? 'self-center' : 'self-start'}
                `}
              >
                {employee.title}
              </Badge>
            )}
          </div>
          {/* Contact info - Below name/title for grid */}
          <div
            className={`
              flex flex-col gap-3 w-full items-start
              ${employeeViewMode === 'grid' ? 'mt-2' : ''}
            `}
          >
            {/* Phone */}
            <div className="flex items-center gap-2 w-full">
              <div className="bg-[#0b1957] rounded-full p-1.5 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <span
                className={`
                  text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap
                  ${shouldHideUnlock || phoneRevealed 
                    ? 'text-[#0b1957] font-semibold select-text' 
                    : 'text-gray-600 tracking-wide blur-sm select-none'
                  }
                `}
              >
                {shouldHideUnlock ? (employee.phone || 'Not provided') : (phoneRevealed ? (employee.phone || '+971 50 123 4567') : '+971 50 123 4567')}
              </span>
              {!shouldHideUnlock && handleRevealPhone && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (handleRevealPhone) {
                            handleRevealPhone(employee);
                          }
                        }}
                        disabled={phoneLoading || phoneRevealed}
                        className="bg-gray-50 border border-gray-200 hover:bg-gray-50 hover:border-[#0b1957] p-1.5 h-7 w-7 flex-shrink-0"
                      >
                        {phoneLoading ? (
                          <Loader2 className="h-5 w-5 text-[#0b1957] animate-spin" />
                        ) : phoneRevealed ? (
                          <CheckCircle className="h-5 w-5 text-[#0b1957]" />
                        ) : (
                          <Lock className="h-5 w-5 text-[#0b1957]" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {phoneRevealed
                          ? 'Phone number revealed'
                          : 'Click to reveal phone number'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {/* Email */}
            <div className="flex items-center gap-2 w-full">
              <div className="bg-[#0b1957] rounded-full p-1.5 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span
                className={`
                  text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap
                  ${shouldHideUnlock || emailRevealed 
                    ? 'text-[#0b1957] font-semibold select-text' 
                    : 'text-gray-600 tracking-wide blur-sm select-none'
                  }
                `}
              >
                {shouldHideUnlock ? (displayEmail || 'Not provided') : (emailRevealed ? (displayEmail || 'name@company.com') : 'name@company.com')}
              </span>
              {!shouldHideUnlock && handleRevealEmail && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (handleRevealEmail) {
                            handleRevealEmail(employee);
                          }
                        }}
                        disabled={emailLoading || emailRevealed}
                        className="bg-gray-50 border border-gray-200 hover:bg-gray-50 hover:border-[#0b1957] p-1.5 h-7 w-7 flex-shrink-0"
                      >
                        {emailLoading ? (
                          <Loader2 className="h-5 w-5 text-[#0b1957] animate-spin" />
                        ) : emailRevealed ? (
                          <CheckCircle className="h-5 w-5 text-[#0b1957]" />
                        ) : (
                          <Lock className="h-5 w-5 text-[#0b1957]" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {emailRevealed
                          ? 'Email address revealed'
                          : 'Click to reveal email address'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* LinkedIn */}
            <div className="flex items-center gap-2 w-full">
              <div className="bg-[#0077b5] rounded-full p-1.5 flex items-center justify-center flex-shrink-0">
                <Linkedin className="w-4 h-4 text-white" />
              </div>
              {(shouldHideUnlock || linkedinRevealed) ? (
                <a
                  href={
                    (displayLinkedIn || '').startsWith('http')
                      ? displayLinkedIn
                      : `https://${displayLinkedIn}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap
                    text-[#0077b5] font-semibold select-text cursor-pointer
                    no-underline hover:underline
                  `}
                >
                  {shouldHideUnlock 
                    ? (displayLinkedIn ? 'LinkedIn Profile' : 'Not provided')
                    : 'LinkedIn Profile'}
                </a>
              ) : (
                <span
                  className="text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-gray-600 tracking-wide blur-sm select-none"
                >
                  linkedin.com/in/...
                </span>
              )}
              {!shouldHideUnlock && handleRevealLinkedIn && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (handleRevealLinkedIn) {
                            handleRevealLinkedIn(employee);
                          }
                        }}
                        disabled={linkedinLoading || linkedinRevealed}
                        className="bg-gray-50 border border-gray-200 hover:bg-gray-50 hover:border-[#0077b5] p-1.5 h-7 w-7 flex-shrink-0"
                      >
                        {linkedinLoading ? (
                          <Loader2 className="h-5 w-5 text-[#0077b5] animate-spin" />
                        ) : linkedinRevealed ? (
                          <CheckCircle className="h-5 w-5 text-[#0077b5]" />
                        ) : (
                          <Lock className="h-5 w-5 text-[#0077b5]" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {linkedinRevealed
                          ? 'LinkedIn profile revealed'
                          : 'Click to reveal LinkedIn profile'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          {/* Profile Summary Section */}
          {profileSummary && (
            <div className="w-full mt-4">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setSummaryExpanded(!summaryExpanded);
                }}
                className={`
                  w-full border-[#0b1957] text-[#0b1957] font-semibold text-sm py-2
                  hover:border-[#0b1957] hover:bg-[#0b1957]/5
                  ${summaryExpanded ? 'mb-2' : ''}
                `}
              >
                <FileText className="w-4 h-4 mr-2" />
                {summaryExpanded ? 'Hide Summary' : 'View Summary'}
                {summaryExpanded ? (
                  <ChevronUp className="w-4 h-4 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-2" />
                )}
              </Button>
              <div
                className={`
                  overflow-hidden transition-all duration-300 ease-in-out
                  ${summaryExpanded ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'}
                `}
              >
                <div className="p-4 bg-[#F8F9FE] rounded-lg border border-[#E2E8F0]">
                  <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">
                    {profileSummary}
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* View Summary Button (if no summary available yet) */}
          {!profileSummary && onViewSummary && (
            <div className="w-full mt-4">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewSummary(employee);
                }}
                className="w-full border-[#0b1957] text-[#0b1957] font-semibold text-sm py-2 hover:border-[#0b1957] hover:bg-[#0b1957]/5"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Summary
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
