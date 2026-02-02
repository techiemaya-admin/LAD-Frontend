'use client';
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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
  Building2,
  Phone,
  MapPin,
  Users,
  Globe,
  Linkedin,
  Facebook,
  Instagram,
  Rss,
  Settings,
  CheckCircle,
  Loader2,
} from 'lucide-react';
function getCompanySizeLabel(employeeCount: number | string | undefined | null): string {
  const count = parseInt(String(employeeCount || 0), 10);
  if (!count) return 'Unknown';
  if (count >= 200) return 'Enterprise (200+ employees)';
  if (count >= 50) return 'Large (50–199 employees)';
  if (count >= 10) return 'Medium (10–49 employees)';
  return 'Small (1–9 employees)';
}
function getCompanySizeColor(sizeLabel: string): string {
  if (!sizeLabel) return '#757575';
  if (sizeLabel.includes('Enterprise')) return '#d32f2f';
  if (sizeLabel.includes('Large')) return '#4caf50';
  if (sizeLabel.includes('Medium')) return '#ba68c8';
  if (sizeLabel.includes('Small')) return '#2196f3';
  return '#757575';
}
interface CompanyCardProps {
  company: {
    id?: string;
    companyName?: string;
    username?: string;
    name?: string;
    logoUrl?: string;
    logo?: string;
    profileImage?: string;
    companyLogo?: string;
    phone?: string;
    city?: string;
    state?: string;
    country?: string;
    website?: string;
    linkedinProfile?: string;
    twitterUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    blogUrl?: string;
    industry?: string;
    employeeCount?: number | string;
    [key: string]: any;
  };
  index?: number;
  isSelected?: boolean;
  onSelect?: () => void;
  handleViewDetails?: (company: any) => void;
  handleGetContact?: (company: any) => void;
  handleGetEmployees?: (company: any) => void;
  phoneData?: Record<string, any>;
  phoneLoading?: Record<string, boolean>;
  phoneError?: Record<string, string>;
}
export default function CompanyCard({
  company,
  index = 0,
  isSelected = false,
  onSelect,
  handleViewDetails,
  handleGetContact,
  handleGetEmployees,
  phoneData,
  phoneLoading,
  phoneError,
}: CompanyCardProps) {
  if (!company) return null;
  const companyId = company.id || index;
  const companyName =
    company.companyName || company.username || company.name || 'Unknown Company';
  const companyLogo =
    company.logoUrl ||
    company.logo ||
    company.profileImage ||
    company.companyLogo;
  const hasEmployees =
    company.employeeCount && parseInt(String(company.employeeCount), 10) > 0;
  const sizeLabel = getCompanySizeLabel(company.employeeCount);
  const sizeColor = getCompanySizeColor(sizeLabel);
  const locationParts = [
    company.city,
    company.state,
    company.country,
  ].filter(Boolean);
  const locationLabel = locationParts.join(', ');
  const hasPhoneBlock = Boolean(phoneData?.[companyId]);
  const phoneInfo = phoneData?.[companyId];
  return (
    <Card
      onClick={onSelect}
      className={`
        flex flex-1 min-h-full flex-col transition-all duration-200 ease-in-out
        ${isSelected ? 'border-2 border-[#0b1957]' : 'border border-[#e9ecef]'}
        rounded-xl overflow-hidden relative bg-white shadow-sm cursor-pointer
        hover:shadow-md hover:border-[${isSelected ? '#0b1957' : '#dee2e6'}]
        ${isSelected ? 'before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[#0b1957] before:z-[1]' : ''}
      `}
    >
      <CardContent className="flex-grow p-0 relative z-[2]">
        {/* Header */}
        <div className="bg-white p-6 relative">
        <div className="bg-white p-6 relative">
          <div className="flex items-start gap-4 relative">
            <div className="relative flex-shrink-0">
              <Avatar
                className={`w-12 h-12 flex-shrink-0 ${
                  isSelected ? 'border-[3px] border-[#0b1957]' : 'border-2 border-[#e9ecef]'
                }`}
              >
                <AvatarImage src={companyLogo} alt={`${companyName} logo`} />
                <AvatarFallback className="bg-primary">
                  <Building2 className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0b1957] flex items-center justify-center border-2 border-white shadow-md z-[3]">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 min-h-[56px] flex items-center">
              <h3
                onClick={(e) => {
                  e.stopPropagation();
                  if (handleViewDetails) {
                    handleViewDetails(company);
                  }
                }}
                className="break-words leading-tight text-lg font-bold text-black cursor-pointer transition-colors duration-200 line-clamp-2 hover:text-[#0b1957] hover:underline"
              >
                {companyName}
              </h3>
            </div>
          </div>
        </div>
        </div>
        {/* Body */}
        <div className="px-6 pt-4 pb-6">
          <div className="mb-0">
            {/* Industry */}
            <div className="min-h-[24px] mb-1">
              {company.industry && (
                <Badge variant="outline" className="font-bold h-6">
                  {company.industry}
                </Badge>
              )}
            </div>
            {/* Decision Maker Contact */}
            <div className="min-h-[60px] mb-0">
              {hasPhoneBlock && (
                <div className="mb-2 p-3 bg-green-50 rounded border border-green-600">
                  <div className="text-green-600 uppercase font-bold tracking-wide text-[0.7rem] mb-2">
                    ✓ DECISION MAKER CONTACT
                  </div>
                  {/* Phone */}
                  <div
                    className={`flex items-center gap-2 ${
                      phoneInfo?.name ? 'mb-1' : ''
                    }`}
                  >
                    <Phone className="w-4 h-4 text-green-600" />
                    <span className="text-[#212529] font-bold text-[0.95rem]">
                      {phoneInfo?.phone}
                    </span>
                    {phoneInfo?.confidence && (
                      <Badge className="bg-green-600 text-white text-[0.65rem] h-[18px] font-semibold uppercase">
                        {phoneInfo.confidence}
                      </Badge>
                    )}
                  </div>
                  {/* Contact person */}
                  {phoneInfo?.name && (
                    <p className="text-green-800 text-xs">
                      {phoneInfo.name}
                      {phoneInfo.title ? ` • ${phoneInfo.title}` : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
            {/* Contact + location row */}
            <div className="flex flex-col gap-2 mb-3">
              {/* Phone (company-level / button) */}
              <div className="flex items-center gap-2">
                <Phone className="w-[18px] h-[18px] text-[#0b1957]" />
                <span
                  className={`text-sm ${
                    company.phone
                      ? 'text-[#0b1957] font-semibold'
                      : 'text-gray-600'
                  }`}
                >
                  {company.phone || 'Phone number not available'}
                </span>
                {handleGetContact && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGetContact(company);
                            }}
                            disabled={phoneLoading?.[companyId]}
                            className="h-7 w-7 p-1 bg-gray-50 border border-gray-200 hover:bg-gray-50 hover:border-[#0b1957]"
                          >
                            {phoneLoading?.[companyId] ? (
                              <Loader2 className="h-[18px] w-[18px] text-[#0b1957] animate-spin" />
                            ) : (
                              <Settings className="h-[18px] w-[18px] text-[#0b1957]" />
                            )}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {phoneLoading?.[companyId]
                            ? 'Finding decision maker phone…'
                            : 'Get decision maker phone'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {/* Location */}
              <div className="flex items-center gap-2">
                <MapPin className="w-[18px] h-[18px] text-[#0b1957]" />
                <span
                  className={`text-sm ${
                    locationLabel ? 'text-[#0b1957]' : 'text-gray-600'
                  }`}
                >
                  {locationLabel || 'Location not available'}
                </span>
              </div>
            </div>
            {/* Company size / scale */}
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-[18px] h-[18px]" style={{ color: sizeColor }} />
              <span className="text-[#0b1957] text-sm font-semibold">
                {sizeLabel}
              </span>
            </div>
            {/* Links row */}
            {(company.website ||
              company.linkedinProfile ||
              company.twitterUrl ||
              company.facebookUrl ||
              company.instagramUrl ||
              company.blogUrl) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-[#0b1957] border border-gray-200 hover:bg-gray-50 hover:border-[#0b1957] cursor-pointer"
                    >
                      <Globe className="w-3 h-3 mr-1" />
                      Website
                    </Badge>
                  </a>
                )}
                {company.linkedinProfile && (
                  <a
                    href={company.linkedinProfile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-[#0077b5] border border-gray-200 hover:bg-gray-50 hover:border-[#0077b5] cursor-pointer"
                    >
                      <Linkedin className="w-3 h-3 mr-1" />
                      LinkedIn
                    </Badge>
                  </a>
                )}
                {company.facebookUrl && (
                  <a
                    href={company.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-[#1877F2] border border-gray-200 hover:bg-gray-50 hover:border-[#1877F2] cursor-pointer"
                    >
                      <Facebook className="w-3 h-3 mr-1" />
                      Facebook
                    </Badge>
                  </a>
                )}
                {company.instagramUrl && (
                  <a
                    href={company.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-[#C13584] border border-gray-200 hover:bg-gray-50 hover:border-[#C13584] cursor-pointer"
                    >
                      <Instagram className="w-3 h-3 mr-1" />
                      Instagram
                    </Badge>
                  </a>
                )}
                {company.blogUrl && (
                  <a
                    href={company.blogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-[#0b1957] border border-gray-200 hover:bg-gray-50 hover:border-[#0b1957] cursor-pointer"
                    >
                      <Rss className="w-3 h-3 mr-1" />
                      Blog
                    </Badge>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
      {/* Footer actions */}
      <CardFooter className="px-6 pb-6 pt-0 flex items-center justify-between gap-4">
        {/* Employee count & CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-[65px] h-[65px] rounded-full flex items-center justify-center flex-shrink-0 ${
                hasEmployees
                  ? 'bg-gradient-to-br from-[#00d2ff] to-[#3a7bd5] shadow-[0_4px_12px_rgba(0,210,255,0.4)]'
                  : 'bg-gradient-to-br from-[#9e9e9e] to-[#757575] shadow-[0_4px_12px_rgba(0,0,0,0.25)]'
              }`}
            >
              <div className="w-[55px] h-[55px] rounded-full bg-[#e0e0e0] flex items-center justify-center flex-col gap-1">
                <Users
                  className={hasEmployees ? 'text-[#3a7bd5]' : 'text-[#757575]'}
                  style={{ fontSize: hasEmployees ? 22 : 18 }}
                />
                {hasEmployees && (
                  <span className="text-[#3a7bd5] text-[0.95rem] font-bold leading-none">
                    {company.employeeCount}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (handleGetEmployees) {
                handleGetEmployees(company);
              }
            }}
            disabled={!hasEmployees}
            className={`
              ${
                hasEmployees
                  ? 'bg-gradient-to-br from-[#00d2ff] to-[#3a7bd5] text-white shadow-[0_4px_12px_rgba(0,210,255,0.4)] hover:from-[#3a7bd5] hover:to-[#2a5db0] hover:-translate-y-[1px]'
                  : 'bg-gradient-to-br from-[#bdbdbd] to-[#9e9e9e] text-[#757575] shadow-[0_4px_12px_rgba(0,0,0,0.25)]'
              }
              font-bold text-[0.85rem] px-7 py-2 h-[38px] min-w-[160px] rounded-full transition-all duration-300 flex-shrink-0
            `}
          >
            {hasEmployees ? 'View Employees' : 'No Employees Data'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
