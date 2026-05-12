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

/**
 * Microsoft Outlook brand glyph (inline SVG so no extra dependency is added).
 * Used on the "Official email" row to visually distinguish a corporate /
 * work address from the personal email row above it.
 *
 * Path data: Simple Icons v9 (CC0). See simpleicons.org/icons/microsoftoutlook
 */
function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="currentColor"
      className={className}
    >
      <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86 0-.45.1-.87.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.5V2.55q0-.44.3-.75.3-.3.75-.3h12.9q.44 0 .75.3.3.3.3.75V10.85l1.24.72h.01q.1.07.18.18.07.12.07.25zm-6-8.25v3h3v-3zm0 4.5v3h3v-3zm0 4.5v1.83l3.05-1.83zm-5.25-9v3h3.75v-3zm0 4.5v3h3.75v-3zm0 4.5v2.03l2.41 1.5 1.34-.8v-2.73zM9 3.75V6h2l.13.01.12.04v-2.3zM5.98 15.98q.9 0 1.6-.3.7-.32 1.19-.86.48-.55.73-1.28.25-.74.25-1.61 0-.83-.25-1.55-.24-.71-.71-1.24t-1.15-.83q-.68-.3-1.55-.3-.92 0-1.64.3-.71.3-1.2.85-.5.54-.75 1.3-.25.74-.25 1.63 0 .85.25 1.56.26.72.74 1.23.48.52 1.17.81.68.3 1.57.3zM7.5 21h12.39L12 16.08V17q0 .41-.3.7-.29.3-.7.3H7.5zm15-.13v-7.24l-5.9 3.54Z" />
    </svg>
  );
}
interface EmployeeCardProps {
  employee: {
    id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    company?: string;
    email?: string;
    phone?: string;
    linkedin_url?: string;
    enriched_email?: string | null;
    enriched_official_email?: string | null;  // ← work email via Fullenrich
    enriched_linkedin_url?: string | null;
    photo_url?: string;
    profile_image?: string;
    is_inbound?: boolean; // Flag to identify inbound leads
    [key: string]: any;
  };
  employeeViewMode?: 'grid' | 'list';
  revealedContacts?: Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean; officialEmail?: boolean }>;
  revealingContacts?: Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean; officialEmail?: boolean }>;
  handleRevealPhone?: (employee: any) => void;
  handleRevealEmail?: (employee: any) => void;
  handleRevealLinkedIn?: (employee: any) => void;
  /** Reveal the work / corporate email via Fullenrich (separate from personal email) */
  handleRevealOfficialEmail?: (employee: any) => void;
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
  handleRevealOfficialEmail,
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
  // If phone/email is already known from the DB, treat it as already revealed
  const phoneRevealed = revealedContacts[idKey]?.phone || Boolean(employee.phone);
  const emailRevealed = revealedContacts[idKey]?.email || Boolean(employee.enriched_email) || Boolean(employee.email);
  const linkedinRevealed = revealedContacts[idKey]?.linkedin || Boolean(employee.enriched_linkedin_url || employee.linkedin_url);
  const officialEmailRevealed = revealedContacts[idKey]?.officialEmail || Boolean(employee.enriched_official_email);
  const phoneLoading = revealingContacts[idKey]?.phone;
  const emailLoading = revealingContacts[idKey]?.email;
  const linkedinLoading = revealingContacts[idKey]?.linkedin;
  const officialEmailLoading = revealingContacts[idKey]?.officialEmail;

  // Get actual values to display (prioritize enriched data)
  const displayEmail = employee.enriched_email || employee.email;
  const displayLinkedIn = employee.enriched_linkedin_url || employee.linkedin_url;
  const displayOfficialEmail = employee.enriched_official_email;

  // Detect free-mail (gmail/outlook/yahoo etc) to know whether the personal
  // email is likely "personal-only" — in that case it makes sense to offer
  // an unlock for the official corporate address. Cheap client check; real
  // classification happens server-side via Fullenrich.
  const FREE_MAIL_DOMAINS = new Set([
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
    'msn.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'ymail.com',
    'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com',
    'pm.me', 'zoho.com', 'mail.com', 'gmx.com', 'fastmail.com', 'yandex.com',
    'qq.com', '163.com',
  ]);
  const personalDomain = (displayEmail || '').split('@').pop()?.toLowerCase() || '';
  const isPersonalEmailFreeMail = !!personalDomain && FREE_MAIL_DOMAINS.has(personalDomain);

  // Show the "Unlock official email" CTA when:
  //   • Unlock features are enabled,
  //   • A handler is wired,
  //   • An official email isn't already known, AND
  //   • Either no email at all OR the existing email is from a free-mail provider
  //     (so a separate corporate address is plausible)
  const showOfficialEmailRow =
    !hideUnlockFeatures &&
    !!handleRevealOfficialEmail &&
    !officialEmailRevealed &&
    (!emailRevealed || isPersonalEmailFreeMail);

  // Determine if unlock features should be shown
  // Hide if: hideUnlockFeatures is true OR employee is marked as inbound
  const shouldHideUnlock = hideUnlockFeatures || employee.is_inbound === true;
  return (
    <Card
      className={`
        flex-1 bg-white dark:bg-[#1a2a43] rounded-xl border border-gray-200 dark:border-[#262831] shadow-sm
        transition-all duration-300 ease-in-out relative
        hover:shadow-lg hover:border-[#0b1957] dark:hover:border-[#4a6cf7]
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
              <Avatar className="w-[90px] h-[90px] border-4 shadow-md flex-shrink-0">
                <AvatarImage src={employee.photo_url} alt={employeeName} />
                <AvatarFallback className="bg-gray-200 dark:bg-[#253456]">
                  <User className="w-12 h-12 text-gray-500 dark:text-[#7a8ba3]" />
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
                <AvatarFallback className="bg-gray-200 dark:bg-[#253456]">
                  <User className="w-10 h-10 text-gray-500" />
                </AvatarFallback>
              </Avatar>
            )}
            <h3
              className={`
                font-bold text-[1.05rem] text-[#0b1957] dark:text-white leading-tight w-full
                ${employeeViewMode === 'grid' ? 'line-clamp-2 break-words' : 'whitespace-nowrap overflow-hidden text-ellipsis'}
              `}
            >
              {employeeName}
            </h3>
            {(employee.title || employee.company) && (
              <div
                className={`
                  text-sm text-gray-600 dark:text-[#7a8ba3] w-full min-w-0
                  ${employeeViewMode === 'grid' ? 'text-center' : 'text-left'}
                `}
              >
                {employee.title && employee.company && (
                  <span className="line-clamp-2 break-words">{employee.title} at {employee.company}</span>
                )}
                {employee.title && !employee.company && (
                  <Badge
                    variant="default"
                    className={`
                      font-semibold text-xs h-auto py-0.5 max-w-full px-3 whitespace-normal line-clamp-2
                      ${employeeViewMode === 'grid' ? 'self-center' : 'self-start'}
                    `}
                  >
                    {employee.title}
                  </Badge>
                )}
                {!employee.title && employee.company && (
                  <span className="line-clamp-1 break-words">{employee.company}</span>
                )}
              </div>
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-[#0b1957] rounded-full p-1.5 flex items-center justify-center flex-shrink-0 cursor-default">
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">Phone</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span
                className={`
                  text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap
                  ${shouldHideUnlock || phoneRevealed 
                    ? 'text-[#0b1957] dark:text-blue-300 font-semibold select-text' 
                    : 'text-gray-600 dark:text-gray-400 tracking-wide blur-sm select-none'
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
                        className="bg-gray-50 dark:bg-[#253456] border border-gray-200 dark:border-[#262831] hover:bg-gray-50 hover:border-[#0b1957] p-1.5 h-7 w-7 flex-shrink-0"
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-[#0b1957] rounded-full p-1.5 flex items-center justify-center flex-shrink-0 cursor-default">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">Personal email</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span
                className={`
                  text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap
                  ${shouldHideUnlock || emailRevealed 
                    ? 'text-[#0b1957] dark:text-blue-300 font-semibold select-text' 
                    : 'text-gray-600 dark:text-gray-400 tracking-wide blur-sm select-none'
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
                        className="bg-gray-50 dark:bg-[#253456] border border-gray-200 dark:border-[#262831] hover:bg-gray-50 hover:border-[#0b1957] p-1.5 h-7 w-7 flex-shrink-0"
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

            {/* Official email — same visual language as the phone/email rows
                above: dark-navy mail circle + a compact lock-icon button on
                the right. Only the icon changes between locked / revealed
                (lock → check), keeping the row vertically aligned with the
                others. */}
            {(officialEmailRevealed && displayOfficialEmail) ? (
              <div className="flex items-center gap-2 w-full">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-[#0b1957] rounded-full p-1.5 flex items-center justify-center flex-shrink-0 cursor-default">
                        <OutlookIcon className="w-4 h-4 text-white" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">Official email</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[#0b1957] font-semibold select-text">
                  {displayOfficialEmail}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-gray-50 border border-gray-200 p-1.5 h-7 w-7 flex items-center justify-center rounded-md flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-[#0b1957]" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Official email revealed</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : showOfficialEmailRow ? (
              <div className="flex items-center gap-2 w-full">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-[#0b1957] rounded-full p-1.5 flex items-center justify-center flex-shrink-0 cursor-default">
                        <OutlookIcon className="w-4 h-4 text-white" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">Official email</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span
                  className="text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-gray-600 tracking-wide blur-sm select-none"
                >
                  official@company.com
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevealOfficialEmail?.(employee);
                        }}
                        disabled={officialEmailLoading}
                        className="bg-gray-50 border border-gray-200 hover:bg-gray-50 hover:border-[#0b1957] p-1.5 h-7 w-7 flex-shrink-0"
                      >
                        {officialEmailLoading ? (
                          <Loader2 className="h-5 w-5 text-[#0b1957] animate-spin" />
                        ) : (
                          <Lock className="h-5 w-5 text-[#0b1957]" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px]">
                      <p className="font-semibold mb-0.5">Click to reveal official email</p>
                      <p className="text-xs text-slate-200">
                        Searches Fullenrich for the lead's corporate address
                        {personalDomain ? ` (the ${personalDomain} address looks personal)` : ''}.
                        Costs 2 credits on success.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : null}

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
                  className="text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-gray-600 dark:text-gray-400 tracking-wide blur-sm select-none"
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
                        className="bg-gray-50 dark:bg-[#253456] border border-gray-200 dark:border-[#262831] hover:bg-gray-50 hover:border-[#0077b5] p-1.5 h-7 w-7 flex-shrink-0"
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
                <div className="p-4 bg-[#F8F9FE] dark:bg-[#0d1b3e] rounded-lg border border-[#E2E8F0] dark:border-[#262831]">
                  <p className="text-sm text-[#475569] dark:text-[#7a8ba3] leading-relaxed whitespace-pre-wrap">
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
