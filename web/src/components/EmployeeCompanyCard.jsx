// components/EmployeeCompanyCard.jsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  Loader2,
} from 'lucide-react';

export default function EmployeeCompanyCard({
  employee,
  employeeViewMode = 'grid',
  revealedContacts = {},
  revealingContacts = {},
  handleRevealPhone,
  handleRevealEmail,
}) {
  if (!employee) return null;
  const idKey = employee.id || employee.name;
  const phoneRevealed = revealedContacts[idKey]?.phone;
  const emailRevealed = revealedContacts[idKey]?.email;
  const phoneLoading = revealingContacts[idKey]?.phone;
  const emailLoading = revealingContacts[idKey]?.email;
  return (
    <Card
      className={`
        flex-1 min-h-full bg-white rounded-xl border border-[oklch(0.922_0_0)]
        shadow-sm transition-all duration-300 ease-in-out relative overflow-hidden
        hover:shadow-[0_4px_12px_rgba(11,25,87,0.15)] hover:border-[#0b1957]
        ${
          employeeViewMode === 'grid'
            ? 'hover:-translate-y-1'
            : 'hover:-translate-y-0.5'
        }
      `}
    >
      <CardContent className={employeeViewMode === 'grid' ? 'p-6' : 'p-5'}>
        <div
          className={`
            flex items-center
            ${
              employeeViewMode === 'grid'
                ? 'flex-col gap-3'
                : 'flex-row gap-8 justify-between'
            }
          `}
        >
          {/* Left: photo + name/title */}
          <div
            className={`
              flex items-center
              ${
                employeeViewMode === 'grid'
                  ? 'flex-col gap-4'
                  : 'flex-row gap-6 flex-shrink-0'
              }
            `}
          >
            <Avatar
              className={`
                border-[#0b1957] flex-shrink-0
                ${
                  employeeViewMode === 'grid'
                    ? 'w-[90px] h-[90px] border-4 shadow-md'
                    : 'w-20 h-20 border-[3px] shadow-lg'
                }
              `}
            >
              <AvatarImage src={employee.photo_url} alt={employee.name} />
              <AvatarFallback className="bg-gray-100">
                <User
                  className={employeeViewMode === 'grid' ? 'w-12 h-12' : 'w-10 h-10'}
                />
              </AvatarFallback>
            </Avatar>
            {/* Name & Title */}
            <div
              className={`
                flex flex-col gap-2
                ${employeeViewMode === 'grid' ? 'max-w-full' : 'min-w-[200px] max-w-[300px]'}
              `}
            >
              <h6
                className={`
                  font-bold text-[1.05rem] text-[#0b1957] overflow-hidden
                  text-ellipsis leading-tight
                  ${employeeViewMode === 'grid' ? 'whitespace-normal' : 'whitespace-nowrap'}
                `}
              >
                {employee.name || 'Unknown'}
              </h6>
              {employee.title && (
                <Badge
                  variant="default"
                  className="font-semibold text-[0.8rem] max-w-fit h-[26px] px-3"
                >
                  {employee.title}
                </Badge>
              )}
              {employee.linkedin_url && (
                <span
                  className="text-xs text-[oklch(0.556_0_0)] max-w-full overflow-hidden
                    text-ellipsis whitespace-nowrap"
                >
                  {employee.linkedin_url}
                </span>
              )}
            </div>
          </div>
          {/* Right: contact info */}
          <div className="flex flex-col gap-3 flex-1">
            {/* Phone */}
            <div className="flex items-center gap-2">
              <div
                className="bg-[#0b1957] rounded-full p-1 flex items-center
                  justify-center"
              >
                <Phone className="w-4 h-4 text-white" />
              </div>
              <span
                className={`
                  text-[0.8rem] overflow-hidden text-ellipsis whitespace-nowrap
                  flex-1
                  ${phoneRevealed ? 'text-[#0b1957] font-semibold' : 'text-[oklch(0.556_0_0)] tracking-wide blur-sm'}
                  ${phoneRevealed ? 'select-text' : 'select-none'}
                `}
              >
                {phoneRevealed ||
                  '+971 50 123 4567'}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (handleRevealPhone) {
                            handleRevealPhone(employee);
                          }
                        }}
                        disabled={phoneLoading || phoneRevealed}
                        className="h-8 w-8 bg-[oklch(0.97_0_0)] border-[oklch(0.922_0_0)]
                          hover:bg-[oklch(0.97_0_0)] hover:border-[#0b1957]"
                      >
                        {phoneLoading ? (
                          <Loader2 className="w-5 h-5 text-[#0b1957] animate-spin" />
                        ) : phoneRevealed ? (
                          <CheckCircle className="w-5 h-5 text-[#0b1957]" />
                        ) : (
                          <Lock className="w-5 h-5 text-[#0b1957]" />
                        )}
                      </Button>
                    </span>
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
            </div>
            {/* Email */}
            <div className="flex items-center gap-2">
              <div
                className="bg-[#0b1957] rounded-full p-1 flex items-center
                  justify-center"
              >
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span
                className={`
                  text-[0.8rem] overflow-hidden text-ellipsis whitespace-nowrap
                  flex-1
                  ${emailRevealed ? 'text-[#0b1957] font-semibold' : 'text-[oklch(0.556_0_0)] tracking-wide blur-sm'}
                  ${emailRevealed ? 'select-text' : 'select-none'}
                `}
              >
                {emailRevealed || 'name@company.com'}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (handleRevealEmail) {
                            handleRevealEmail(employee);
                          }
                        }}
                        disabled={emailLoading || emailRevealed}
                        className="h-8 w-8 bg-[oklch(0.97_0_0)] border-[oklch(0.922_0_0)]
                          hover:bg-[oklch(0.97_0_0)] hover:border-[#0b1957]"
                      >
                        {emailLoading ? (
                          <Loader2 className="w-5 h-5 text-[#0b1957] animate-spin" />
                        ) : emailRevealed ? (
                          <CheckCircle className="w-5 h-5 text-[#0b1957]" />
                        ) : (
                          <Lock className="w-5 h-5 text-[#0b1957]" />
                        )}
                      </Button>
                    </span>
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
