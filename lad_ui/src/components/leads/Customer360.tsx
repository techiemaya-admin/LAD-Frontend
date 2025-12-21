"use client";

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Compass,
  Sparkles,
  HeartHandshake,
  FolderKanban,
  UserCircle2,
  Linkedin,
  Facebook,
  Instagram,
  MessageCircle,
  Twitter,
  GaugeCircle,
  Wallet,
} from 'lucide-react';
import Gauge from './Gauge';
import ProfilePopup from './ProfilePopup';
import JourneyPopup from './JourneyPopup';
import InsightsPopup from './InsightsPopup';
import CasesPopup from './CasesPopup';
import type { Lead } from './types';
import { Button } from '@/components/ui/button';

type CircleBadgeProps = {
  position: React.CSSProperties;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
};

const CircleBadge: React.FC<CircleBadgeProps> = ({ position, icon: Icon, label, onClick }) => {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`absolute flex w-24 flex-col items-center gap-2 text-center transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      }`}
      style={{ ...position, transform: 'translate(-50%, -50%)' }}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#cbd5f1] bg-white text-[#18284F] shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[11px] font-semibold capitalize leading-tight tracking-wide text-[#18284F]">{label}</span>
    </Component>
  );
};

export const customer360MockData: Lead = {
  id: '24',
  name: 'Prem Kumar',
  avatar: null,
  role: 'Team Manager',
  bio: 'Prem Kumar is an avid gamer and remote worker, seeking a best laptop to fuel his personal and professional interests.',
  lastActivity: '10/5/2025',
  stage: 'Qualified',
  channel: 'LinkedIn',
  metrics: {
    conversionScore: 75,
    engagementScore: 90,
    lifetimeValue: 10000,
    averageLifetimeValue: 8500,
    engagementStatus: 'Highly Engaged',
    engagementComparison: 'Compared to 12k similar audience',
  },
  socialMedia: {
    linkedin: 'https://www.linkedin.com/in/mock-profile',
    instagram: 'https://www.instagram.com/mock-profile',
    facebook: 'https://www.facebook.com/mock-profile',
    whatsapp: 'https://wa.me/1234567890',
  },
};

const WhatsappIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    role="img"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="currentColor"
      d="M20.52 3.48A10.457 10.457 0 0 0 12.04 0C5.64 0 .48 5.04.48 11.25c0 1.99.52 3.96 1.51 5.68L0 24l7.26-2.36a11.73 11.73 0 0 0 4.78 1.01h.01c6.4 0 11.56-5.04 11.56-11.25 0-3.01-1.15-5.83-3.09-7.92ZM12.05 21.5h-.01a9.75 9.75 0 0 1-4.76-1.27l-.34-.19-4.31 1.41 1.42-4.2-.22-.35a9.56 9.56 0 0 1-1.46-5.14C2.37 6.27 6.73 2 12.04 2c2.6 0 5.04 1.02 6.87 2.88a9.8 9.8 0 0 1 2.86 6.92c0 5.25-4.24 9.5-9.72 9.5Zm5.42-7.12c-.3-.15-1.76-.87-2.03-.97-.28-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.07 4.5.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z"
    />
  </svg>
);

const socialPlatforms = [
  {
    key: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    icon: ({ className }: { className?: string }) => <Linkedin className={className} strokeWidth={2.4} />,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    icon: WhatsappIcon,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    color: '#E1306C',
    icon: ({ className }: { className?: string }) => <Instagram className={className} strokeWidth={2.2} />,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    icon: ({ className }: { className?: string }) => <Facebook className={className} strokeWidth={2.2} />,
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    color: '#1D9BF0',
    icon: ({ className }: { className?: string }) => <Twitter className={className} strokeWidth={2.2} />,
  },
];

type Customer360CardProps = {
  lead?: Lead | null;
};

function formatCurrency(value?: number): string {
  if (!value && value !== 0) return '$0';
  return `$${value.toLocaleString()}`;
}

const Customer360Card: React.FC<Customer360CardProps> = ({ lead }) => {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [journeyDialogOpen, setJourneyDialogOpen] = useState(false);
  const [insightsDialogOpen, setInsightsDialogOpen] = useState(false);
  const [casesDialogOpen, setCasesDialogOpen] = useState(false);

  const safeLead = useMemo<Lead>(() => ({ ...customer360MockData, ...(lead ?? {}) }), [lead]);

  const avatar = safeLead.avatar ?? null;
  const name = safeLead.name ?? 'Unknown Lead';
  const role = safeLead.role ?? '-';
  const bio = safeLead.bio ?? 'Bio not available.';
  const id = safeLead.id ?? '—';
  const lastActivity = safeLead.lastActivity ?? 'N/A';
  const stage = safeLead.stage ?? '—';
  const metrics = safeLead.metrics ?? customer360MockData.metrics;

  const getPlatformUrl = (platform: string): string | undefined => {
    const social = safeLead.socialMedia?.[platform as keyof typeof safeLead.socialMedia];
    if (typeof social === 'string' && social.length > 0) return social;
    if (safeLead.profileUrl) return safeLead.profileUrl;
    const mockUrls: Record<string, string> = {
      facebook: 'https://www.facebook.com/mock-profile',
      instagram: 'https://www.instagram.com/mock-profile',
      whatsapp: 'https://wa.me/1234567890',
      linkedin: 'https://www.linkedin.com/in/mock-profile',
      twitter: 'https://twitter.com/mock-profile',
    };
    return mockUrls[platform];
  };

  const socialLinks = socialPlatforms
    .map((platform) => {
      const url = getPlatformUrl(platform.key);
      if (!url) return null;
      return { ...platform, url };
    })
    .filter(Boolean) as Array<{
      key: string;
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      url: string;
      color: string;
    }>;

  return (
      <div 
        id="customer-container" 
        className="overflow-hidden rounded-[24px]"
        style={{
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 4px 60px 0px #E2ECF980'
        }}
      >
      <div className="flex items-center gap-3 pt-3 px-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <UserCircle2 className="h-5 w-5 rotate-180" />
        </div>
        <h2 className="text-xl font-semibold text-[#18284F] ">Customer 360</h2>
      </div>

      <div className="relative mx-auto mt-8 flex w-full max-w-3xl justify-center">
        <div className="relative h-[400px] w-[400px]">
          {/* Outer ring - very pale blue-grey gradient */}
          <div className="absolute inset-0 rounded-full border-[2px] border-[#e0e7f1] bg-[radial-gradient(circle_at_center,#fafbfc_0%,#f3f5f9_50%,#e8ecf4_100%)] shadow-[0_4px_20px_rgba(100,116,139,0.08)]" />
          
          {/* Middle ring - subtle white to pale blue gradient */}
          {/* <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#e0e7f1] bg-[radial-gradient(circle_at_center,#ffffff_0%,#fafbfd_60%,#f3f5f9_100%)] shadow-[0_2px_12px_rgba(100,116,139,0.06)]" /> */}
          
          {/* Inner circle - almost white with very subtle blue tint */}
          <div className="absolute left-1/2 top-1/2 flex h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#e0e7f1] bg-[radial-gradient(circle_at_center,#ffffff_0%,#fcfcfd_70%,#f8f9fb_100%)] shadow-[0_2px_8px_rgba(100,116,139,0.04)]">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="flex h-[90px] w-[90px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white shadow-md">
                {avatar ? (
                  <Image src={avatar} alt={name} width={120} height={120} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-indigo-600">{name.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="mt-3 flex flex-col items-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0em] text-slate-400">{role}</p>
                <p className="mt-0.5 text-base font-semibold text-slate-900">{name}</p>
              </div>
            </div>
          </div>

          {/* Action badges positioned on outer ring */}
          <CircleBadge
            position={{ top: '10%', left: '50%' }}
            icon={Sparkles}
            label="Insights"
            onClick={() => setInsightsDialogOpen(true)}
          />
          <CircleBadge
            position={{ top: '32%', left: '16%' }}
            icon={Compass}
            label="Journey"
            onClick={() => setJourneyDialogOpen(true)}
          />
          <CircleBadge
            position={{ top: '32%', left: '84%' }}
            icon={HeartHandshake}
            label="Relationship"
          />
          <CircleBadge
            position={{ top: '60%', left: '15%' }}
            icon={UserCircle2}
            label="Profile"
            onClick={() => setProfileDialogOpen(true)}
          />
          <CircleBadge
            position={{ top: '60%', left: '85%' }}
            icon={FolderKanban}
            label="Cases"
            onClick={() => setCasesDialogOpen(true)}
          />
        </div>
      </div>

      {/* Horizontal divider */}
      <div className="relative -mt-17 h-[2px] w-full bg-[#1a275b]/15" />

      {/* Single bordered band with column layout matching Figma - overlapping the circle */}
      <div className="relative -mt-10 rounded-[20px] border border-slate-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
        <div className="grid divide-x divide-slate-200 lg:grid-cols-[2.5fr_1.25fr_1.25fr]">
          {/* Column 1: ID, Last Activity, Stage (horizontal), User Bio, Social Media */}
          <div className="space-y-5 p-6">
            {/* ID, Last Activity, Stage - horizontal layout */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">ID</p>
                <p className="mt-1 text-base font-semibold text-slate-800">{id}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold capitalize tracking-[0.08em] text-slate-400">Last Activity</p>
                <p className="mt-1 text-base font-semibold text-slate-800">{lastActivity}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold capitalize tracking-[0.08em] text-slate-400">Stage</p>
                <p className="mt-1 text-base font-semibold text-slate-800">{stage}</p>
              </div>
            </div>
            
            {/* User Bio */}
            <div className="border-t border-slate-200 pt-4">
              <p className="text-[10px] font-bold capitalize tracking-[0.08em] text-slate-400 mb-2">User Bio</p>
              <h3 className="text-sm font-semibold text-slate-900">{name}</h3>
              <p className="mt-1.5 text-xs leading-[1.6] text-slate-600">{bio}</p>
            </div>

            {/* Social Media */}
            <div className="border-t border-slate-200 pt-4">
              <p className="text-[10px] font-bold capitalize tracking-[0.08em] text-slate-400 mb-2.5">Social Media</p>
              <div className="flex items-center gap-2.5">
                {socialLinks.map(({ key, icon: Icon, label: socialLabel, url, color }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
                    style={{ backgroundColor: color }}
                    aria-label={socialLabel}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Deal Recommendation & Lifetime Value */}
          <div className="flex flex-col divide-y divide-slate-200">
            {/* Deal Recommendation */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-1 text-center">
              <p className="text-[11px] font-bold capitalize tracking-[0.08em] text-slate-500 mb-3">Deal Recommendation</p>
              <Button className="rounded-full bg-[#1a2847] px-8 py-3 text-sm font-bold text-white shadow-[0_2px_12px_rgba(26,40,71,0.25)] transition-all hover:bg-[#0f1a33] hover:shadow-[0_4px_16px_rgba(26,40,71,0.35)] hover:scale-105">
                Open here
              </Button>
            </div>
            
            {/* Lifetime Value */}
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-slate-700 stroke-[2.5]" />
                <p className="text-[11px] font-bold capitalize tracking-[0.08em] text-slate-500">Life Time Value</p>
              </div>
              <p className="mt-1 text-xl font-semibold text-slate-900">{formatCurrency(metrics?.lifetimeValue)}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">(Average {formatCurrency(metrics?.averageLifetimeValue)})</p>
            </div>
          </div>

          {/* Column 3: Conversion Score & Engagement Score */}
          <div className="flex flex-col divide-y divide-slate-200">
            {/* Conversion Score */}
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <p className="text-[11px] font-bold capitalize tracking-[0.08em] text-slate-500 mb-3">Conversion Score</p>
              <div className="h-28 w-28">
                <Gauge value={metrics?.conversionScore ?? 0} color="#18284F" fontSize={22} />
              </div>
            </div>
            
            {/* Engagement Score */}
            <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <GaugeCircle className="h-5 w-5 text-slate-700 stroke-[2.5]" />
                <p className="text-[11px] font-bold capitalize tracking-[0.08em] text-slate-500">Engagement Score</p>
              </div>
              <div className="flex justify-center">
                <Gauge value={metrics?.engagementScore ?? 0} semicircle size={120} strokeWidth={8} />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{metrics?.engagementStatus ?? 'Unknown'}</p>
              <p className="mt-0.5  text-xs font-medium text-slate-500">{metrics?.engagementComparison ?? 'No data'}</p>
            </div>
          </div>
        </div>
      </div>

      <ProfilePopup open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} lead={safeLead} />
      <JourneyPopup open={journeyDialogOpen} onClose={() => setJourneyDialogOpen(false)} lead={safeLead} />
      <InsightsPopup open={insightsDialogOpen} onClose={() => setInsightsDialogOpen(false)} />
      <CasesPopup open={casesDialogOpen} onClose={() => setCasesDialogOpen(false)} />
    </div>
  );
};

export default Customer360Card;



