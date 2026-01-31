// components/CompanyCard.jsx
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

function getCompanySizeLabel(employeeCount) {
  const count = parseInt(employeeCount || 0, 10);
  if (!count) return 'Unknown';
  if (count >= 200) return 'Enterprise (200+ employees)';
  if (count >= 50) return 'Large (50–199 employees)';
  if (count >= 10) return 'Medium (10–49 employees)';
  return 'Small (1–9 employees)';
}

function getCompanySizeColor(sizeLabel) {
  if (!sizeLabel) return '#757575';
  if (sizeLabel.includes('Enterprise')) return '#d32f2f';
  if (sizeLabel.includes('Large')) return '#4caf50';
  if (sizeLabel.includes('Medium')) return '#ba68c8';
  if (sizeLabel.includes('Small')) return '#2196f3';
  return '#757575';
}

export default function CompanyCard({
  company,
  index,
  isSelected,
  onSelect,
  handleViewDetails,
  handleGetContact,
  handleGetEmployees,
  phoneData,
  phoneLoading,
  phoneError,
}) {
  if (!company) return null;

  const companyId = company.id ?? index;
  const companyName =
    company.companyName || company.username || company.name || 'Unknown Company';
  const companyLogo =
    company.logoUrl ||
    company.logo ||
    company.profileImage ||
    company.companyLogo;
  const hasEmployees =
    company.employeeCount && parseInt(company.employeeCount, 10) > 0;
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
        hover:shadow-md
        ${isSelected ? 'before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[#0b1957] before:z-[1]' : ''}
      `}
    >
      <CardContent className="flex-grow p-0 relative z-[2]">
        {/* Header */}
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
                className="break-words leading-tight text-lg text-black cursor-pointer transition-colors duration-200 line-clamp-2 hover:text-[#0b1957] hover:underline font-bold"
              >
                {companyName}
              </h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 pt-4">
          <div className="mb-0">
            {/* Industry */}
            <div className="min-h-[24px] mb-2">
              {company.industry && (
                <Badge variant="outline" className="font-bold h-6">
                  {company.industry}
                </Badge>
              )}
            </div>

            {/* Decision Maker Contact */}
            <div className="min-h-[60px] mb-0">
              {hasPhoneBlock && (
                <div className="mb-4 p-3 bg-[#f0fff4] rounded border border-[#28a745]">
                  <span className="text-[#28a745] uppercase font-bold tracking-wider text-[0.7rem] mb-2 block">
                    ✓ DECISION MAKER CONTACT
                  </span>
                  {/* Phone */}
                  <div className={`flex items-center gap-2 ${phoneInfo?.name ? 'mb-1' : ''}`}>
                    <Phone className="w-4 h-4 text-[#28a745]" />
                    <span className="text-[#212529] font-bold text-[0.95rem]">
                      {phoneInfo?.phone}
                    </span>
                    {phoneInfo?.confidence && (
                      <Badge className="bg-[#28a745] text-white text-[0.65rem] h-[18px] font-semibold uppercase">
                        {phoneInfo.confidence}
                      </Badge>
                    )}
                  </div>
                  {/* Contact person */}
                  {phoneInfo?.name && (
                    <span className="text-[#2e7d32] text-xs">
                      {phoneInfo.name}
                      {phoneInfo.title ? ` • ${phoneInfo.title}` : ''}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Contact + location row */}
            <div className="flex flex-col gap-4 mb-6">
              {/* Phone (company-level / button) */}
              <div className="flex items-center gap-2">
                <Phone className="w-[18px] h-[18px] text-[#0b1957]" />
                <span
                  className={`text-sm ${
                    company.phone ? 'text-[#0b1957] font-semibold' : 'text-neutral-500'
                  }`}
                >
                  {company.phone || 'Phone number not available'}
                </span>
                {handleGetContact && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGetContact(company);
                          }}
                          disabled={phoneLoading?.[companyId]}
                          className="h-7 w-7 bg-neutral-50 border-neutral-300 hover:bg-neutral-50 hover:border-[#0b1957]"
                        >
                          {phoneLoading?.[companyId] ? (
                            <Loader2 className="w-[18px] h-[18px] text-[#0b1957] animate-spin" />
                          ) : (
                            <Settings className="w-[18px] h-[18px] text-[#0b1957]" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{phoneLoading?.[companyId] ? 'Finding decision maker phone…' : 'Get decision maker phone'}</p>
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
                    locationLabel ? 'text-[#0b1957]' : 'text-neutral-500'
                  }`}
                >
                  {locationLabel || 'Location not available'}
                </span>
              </div>
            </div>

            {/* Company size / scale */}
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-[18px] h-[18px]" style={{ color: sizeColor }} />
              <span className="text-sm text-[#0b1957] font-semibold">
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
              <div className="flex flex-wrap gap-2 mt-4">
                {company.website && (
                  <Badge
                    variant="outline"
                    className="bg-neutral-50 text-[#0b1957] border-neutral-300 hover:bg-neutral-50 hover:border-[#0b1957] cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(company.website, '_blank');
                    }}
                  >
                    <Globe className="w-3 h-3 mr-1" />
                    Website
                  </Badge>
                )}
                {company.linkedinProfile && (
                  <Badge
                    variant="outline"
                    className="bg-neutral-50 text-[#0077b5] border-neutral-300 hover:bg-neutral-50 hover:border-[#0077b5] cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(company.linkedinProfile, '_blank');
                    }}
                  >
                    <Linkedin className="w-3 h-3 mr-1" />
                    LinkedIn
                  </Badge>
                )}
                {company.facebookUrl && (
                  <Badge
                    variant="outline"
                    className="bg-neutral-50 text-[#1877F2] border-neutral-300 hover:bg-neutral-50 hover:border-[#1877F2] cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(company.facebookUrl, '_blank');
                    }}
                  >
                    <Facebook className="w-3 h-3 mr-1" />
                    Facebook
                  </Badge>
                )}
                {company.instagramUrl && (
                  <Badge
                    variant="outline"
                    className="bg-neutral-50 text-[#C13584] border-neutral-300 hover:bg-neutral-50 hover:border-[#C13584] cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(company.instagramUrl, '_blank');
                    }}
                  >
                    <Instagram className="w-3 h-3 mr-1" />
                    Instagram
                  </Badge>
                )}
                {company.blogUrl && (
                  <Badge
                    variant="outline"
                    className="bg-neutral-50 text-[#0b1957] border-neutral-300 hover:bg-neutral-50 hover:border-[#0b1957] cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(company.blogUrl, '_blank');
                    }}
                  >
                    <Rss className="w-3 h-3 mr-1" />
                    Blog
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Footer actions */}
      <CardFooter className="px-6 pb-6 pt-0 flex items-center justify-between gap-4">
        {/* Employee count & CTA */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div
              className="w-[65px] h-[65px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: hasEmployees
                  ? 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)'
                  : 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)',
                boxShadow: hasEmployees
                  ? '0 4px 12px rgba(0, 210, 255, 0.4)'
                  : '0 4px 12px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div className="w-[55px] h-[55px] rounded-full bg-[#e0e0e0] flex items-center justify-center flex-col gap-1">
                <Users
                  className={hasEmployees ? 'w-[22px] h-[22px]' : 'w-[18px] h-[18px]'}
                  style={{ color: hasEmployees ? '#3a7bd5' : '#757575' }}
                />
                {hasEmployees && (
                  <span className="text-[#3a7bd5] font-bold text-[0.95rem] leading-none">
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
            className="font-bold text-[0.85rem] px-9 py-2 h-[38px] min-w-[160px] rounded-full flex-shrink-0 transition-all duration-300"
            style={{
              background: hasEmployees
                ? 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)'
                : 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)',
              color: hasEmployees ? 'white' : '#757575',
              boxShadow: hasEmployees
                ? '0 4px 12px rgba(0, 210, 255, 0.4)'
                : '0 4px 12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {hasEmployees ? 'View Employees' : 'No Employees Data'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
