import React from 'react';
import {
  Linkedin,
  MessageSquare,
  Users,
  Globe,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  Star,
  Zap,
  Radio,
  Search,
  FileText,
  Link,
  Hash,
  UserCircle,
  Megaphone,
  Target,
  TrendingUp,
  CheckCircle
} from 'lucide-react';

interface PipelineBadgeProps {
  source: string;
  showLabel?: boolean;
}

const normalizeSourceKey = (source: string): string => {
  return source
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
};

const getSourceIcon = (source: string) => {
  const normalized = normalizeSourceKey(source);
  switch (normalized) {
    case 'voice agent':
      return Phone;
    case 'linkedin':
    case 'linked in':
      return Linkedin;
    case 'referral':
    case 'referrals':
      return Users;
    case 'website':
    case 'web':
    case 'organic':
      return Globe;
    case 'email':
      return Mail;
    case 'phone':
    case 'call':
      return Phone;
    case 'company':
    case 'internal':
      return Building;
    case 'job':
    case 'career':
      return Briefcase;
    case 'event':
    case 'conference':
    case 'webinar':
      return Calendar;
    case 'partner':
    case 'affiliate':
      return Star;
    case 'api':
    case 'integration':
      return Zap;
    case 'ad':
    case 'campaign':
    case 'ppc':
    case 'google':
    case 'facebook':
    case 'instagram':
    case 'twitter':
    case 'social':
      return Radio;
    case 'seo':
    case 'search':
    case 'bing':
    case 'yahoo':
      return Search;
    case 'document':
    case 'pdf':
    case 'form':
      return FileText;
    case 'link':
    case 'url':
    case 'hyperlink':
      return Link;
    case 'hashtag':
    case 'tag':
    case 'category':
      return Hash;
    case 'manual':
    case 'data':
    case 'import':
    case 'list':
      return UserCircle;
    case 'outreach':
      return Megaphone;
    case 'lead':
    case 'prospect':
      return Target;
    case 'hot':
    case 'warm':
      return TrendingUp;
    case 'qualified':
    case 'qualified lead':
      return CheckCircle;
    default:
      return Hash;
  }
};

const getSourceColor = (source: string) => {
  const normalized = normalizeSourceKey(source);
  switch (normalized) {
    case 'voice agent':
      return '#10b981';
    case 'linkedin':
    case 'linked in':
      return '#0077b5';
    case 'referral':
    case 'referrals':
      return '#059669';
    case 'website':
    case 'web':
    case 'organic':
      return '#6366f1';
    case 'email':
      return '#ea4335';
    case 'phone':
    case 'call':
      return '#22c55e';
    case 'company':
    case 'internal':
      return '#64748b';
    case 'job':
    case 'career':
      return '#f59e0b';
    case 'event':
    case 'conference':
    case 'webinar':
      return '#8b5cf6';
    case 'partner':
    case 'affiliate':
      return '#f97316';
    case 'api':
    case 'integration':
      return '#8b5cf6';
    case 'ad':
    case 'campaign':
    case 'ppc':
    case 'google':
    case 'facebook':
    case 'instagram':
    case 'twitter':
    case 'social':
      return '#ef4444';
    case 'seo':
    case 'search':
    case 'bing':
    case 'yahoo':
      return '#3b82f6';
    case 'document':
    case 'pdf':
    case 'form':
      return '#6b7280';
    case 'link':
    case 'url':
    case 'hyperlink':
      return '#0ea5e9';
    case 'hashtag':
    case 'tag':
    case 'category':
      return '#ec4899';
    case 'manual':
    case 'data':
    case 'import':
    case 'list':
      return '#6b7280';
    case 'campaign':
    case 'outreach':
      return '#f59e0b';
    case 'lead':
    case 'prospect':
      return '#f97316';
    case 'hot':
    case 'warm':
      return '#f59e0b';
    case 'qualified':
    case 'qualified lead':
      return '#10b981';
    default:
      return '#6b7280';
  }
};

const hexToRgba = (hex: string, alpha: number): string => {
  const raw = hex.replace('#', '').trim();
  const expanded = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const PipelineBadge: React.FC<PipelineBadgeProps> = ({ source, showLabel = true }) => {
  const Icon = getSourceIcon(source);
  const color = getSourceColor(source);
  const iconOnly = !showLabel;
  const backgroundColor = iconOnly ? hexToRgba(color, 0.12) : color;
  const borderColor = iconOnly ? hexToRgba(color, 0.25) : 'transparent';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${
        iconOnly ? 'w-8 h-8' : 'px-3 py-1.5'
      }`}
      style={{ backgroundColor, border: `1px solid ${borderColor}` }}
      title={`Source: ${source}`}
    >
      <Icon className={iconOnly ? 'w-4 h-4' : 'w-3.5 h-3.5'} style={{ color: iconOnly ? color : 'white' }} />
      {showLabel && <span className="ml-1 text-white">{source}</span>}
    </span>
  );
};

export default PipelineBadge;
