// TypeScript types for Leads components

export interface Lead {
  id: number | string;
  name: string;
  email?: string;
  avatar?: string | null;
  role?: string;
  channel?: string;
  status?: 'Active' | 'Inactive';
  age?: number;
  address?: string;
  location?: string;
  phoneNumber?: string;
  bio?: string;
  lastActivity?: string;
  stage?: string;
  profileUrl?: string;
  socialMedia?: {
    linkedin?: string;
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  metrics?: LeadMetrics;
  [key: string]: unknown;
}

export interface LeadMetrics {
  conversionScore?: number;
  engagementScore?: number;
  lifetimeValue?: number;
  averageLifetimeValue?: number;
  engagementStatus?: string;
  engagementComparison?: string;
}

export interface JourneyStep {
  id: number;
  type: string;
  date: string;
  details?: {
    responseTime?: string;
    [key: string]: unknown;
  };
}

export interface JourneyData {
  leadId: string;
  leadName: string;
  platform: string;
  avatar: string | null;
  journey: JourneyStep[];
}

export interface CircleBadgeProps {
  top: string | { [key: string]: string };
  left?: string | { [key: string]: string };
  right?: string | { [key: string]: string };
  icon: React.ReactElement;
  label: string;
  onClick?: () => void;
}

export interface StatGroupProps {
  label: string;
  value: string | number;
}

export interface PopupProps {
  open: boolean;
  onClose: () => void;
  lead?: Lead;
}







