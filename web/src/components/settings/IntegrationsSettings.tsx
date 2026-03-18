'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Settings2, Linkedin, Smartphone, Bot, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GoogleAuthIntegration } from './GoogleAuthIntegration';
import { MicrosoftAuthIntegration } from './MicrosoftAuthIntegration';
import { WhatsAppIntegration } from './WhatsAppIntegration';
import { LinkedInIntegration } from './LinkedInIntegration';
import { TenantOnboarding } from './TenantOnboarding';
import { GoHighLevelIntegration } from './GoHighLevelIntegration';
import { useTenant } from '@/contexts/TenantContext';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

type IntegrationView = 'grid' | string;

interface IntegrationCard {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  category: string;
  comingSoon?: boolean;
}

const INTEGRATIONS: IntegrationCard[] = [
  {
    id: 'whatsapp-ai',
    name: 'WhatsApp API Agent',
    description: 'Configure your WhatsApp Business API account for AI-powered conversations.',
    icon: (
      <svg viewBox="0 0 175.216 175.552" className="h-7 w-7">
        <defs><linearGradient id="wa1" x1="85.915" x2="86.535" y1="32.567" y2="137.092" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#57d163"/><stop offset="1" stopColor="#23b33a"/></linearGradient></defs>
        <path d="M87.184 25.227c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 009.349 32.535l1.455 2.313-6.179 22.558 23.146-6.069 2.235 1.324a60.95 60.95 0 0031.29 8.57c33.754 0 61.178-27.444 61.178-61.156a60.8 60.8 0 00-17.895-43.251 60.8 60.8 0 00-43.401-17.954z" fill="url(#wa1)"/>
        <path d="M68.772 55.603c-1.378-3.061-2.828-3.123-4.137-3.176l-3.524-.043a6.76 6.76 0 00-4.894 2.3c-1.682 1.837-6.426 6.278-6.426 15.312s6.578 17.765 7.497 18.99 12.701 20.326 31.346 27.7c15.518 6.138 18.689 4.918 22.061 4.611s10.877-4.447 12.408-8.74 1.532-7.977 1.073-8.74-1.685-1.226-3.525-2.146-10.877-5.367-12.56-5.981-2.91-.918-4.137.92-4.746 5.979-5.819 7.206-2.144 1.381-3.984.462-7.76-2.861-14.784-9.124c-5.465-4.873-9.154-10.891-10.228-12.73s-.114-2.835.808-3.751c.825-.824 1.838-2.147 2.759-3.22s1.224-1.837 1.836-3.064.307-2.301-.153-3.22-4.032-10.011-5.666-13.647" fill="#fff" fillRule="evenodd"/>
      </svg>
    ),
    iconBg: 'bg-green-50',
    category: 'AI',
  },
  {
    id: 'whatsapp-personal',
    name: 'WhatsApp Personal',
    description: 'Connect your personal WhatsApp number via QR code for direct messaging.',
    icon: (
      <svg viewBox="0 0 175.216 175.552" className="h-7 w-7">
        <defs><linearGradient id="wa2" x1="85.915" x2="86.535" y1="32.567" y2="137.092" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#57d163"/><stop offset="1" stopColor="#23b33a"/></linearGradient></defs>
        <path d="M87.184 25.227c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 009.349 32.535l1.455 2.313-6.179 22.558 23.146-6.069 2.235 1.324a60.95 60.95 0 0031.29 8.57c33.754 0 61.178-27.444 61.178-61.156a60.8 60.8 0 00-17.895-43.251 60.8 60.8 0 00-43.401-17.954z" fill="url(#wa2)"/>
        <path d="M68.772 55.603c-1.378-3.061-2.828-3.123-4.137-3.176l-3.524-.043a6.76 6.76 0 00-4.894 2.3c-1.682 1.837-6.426 6.278-6.426 15.312s6.578 17.765 7.497 18.99 12.701 20.326 31.346 27.7c15.518 6.138 18.689 4.918 22.061 4.611s10.877-4.447 12.408-8.74 1.532-7.977 1.073-8.74-1.685-1.226-3.525-2.146-10.877-5.367-12.56-5.981-2.91-.918-4.137.92-4.746 5.979-5.819 7.206-2.144 1.381-3.984.462-7.76-2.861-14.784-9.124c-5.465-4.873-9.154-10.891-10.228-12.73s-.114-2.835.808-3.751c.825-.824 1.838-2.147 2.759-3.22s1.224-1.837 1.836-3.064.307-2.301-.153-3.22-4.032-10.011-5.666-13.647" fill="#fff" fillRule="evenodd"/>
      </svg>
    ),
    iconBg: 'bg-green-50',
    category: 'Messaging',
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Connect Google Calendar, Drive, Sheets, Gmail, and Analytics.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    iconBg: 'bg-gray-50',
    category: 'Email & Calendar',
  },
  {
    id: 'microsoft',
    name: 'Microsoft 365',
    description: 'Connect Outlook calendar and email for scheduling and communication.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
        <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
      </svg>
    ),
    iconBg: 'bg-blue-50',
    category: 'Email & Calendar',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Connect LinkedIn to sync leads and manage outreach campaigns.',
    icon: <Linkedin className="h-6 w-6 text-blue-700" />,
    iconBg: 'bg-blue-50',
    category: 'Social',
  },
  {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    description: 'Connect GoHighLevel CRM to sync contacts, deals, and automate workflows.',
    icon: (
      <svg viewBox="0 0 120 120" className="h-6 w-6">
        {/* Yellow arrow (left) - shortest */}
        <polygon points="15,100 27,100 27,60 15,60" fill="#FFB902"/>
        <polygon points="7,60 35,60 21,30" fill="#FFB902"/>
        <polygon points="21,30 35,60 28,60 28,42" fill="#E0A300"/>
        {/* Blue arrow (center) */}
        <polygon points="40,100 52,100 52,55 40,55" fill="#0B81FF"/>
        <polygon points="32,55 60,55 46,22" fill="#0B81FF"/>
        <polygon points="46,22 60,55 53,55 53,36" fill="#0066CC"/>
        {/* Green arrow (right) - tallest */}
        <polygon points="65,100 77,100 77,48 65,48" fill="#00C853"/>
        <polygon points="57,48 85,48 71,12" fill="#00C853"/>
        <polygon points="71,12 85,48 78,48 78,28" fill="#009624"/>
      </svg>
    ),
    iconBg: 'bg-white',
    category: 'CRM',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Receive real-time business updates and notifications in your workspace.',
    icon: (
      <svg viewBox="0 0 54 54" className="h-6 w-6">
        <path fill="#E01E5A" d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386"/>
        <path fill="#36C5F0" d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387"/>
        <path fill="#2EB67D" d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386"/>
        <path fill="#ECB22E" d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336 0v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387V34.25a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387"/>
      </svg>
    ),
    iconBg: 'bg-purple-50',
    category: 'Social',
    comingSoon: true,
  },
  // Coming Soon integrations
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Connect Instagram for DM automation and lead capture from social interactions.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FD5" />
            <stop offset="50%" stopColor="#FF543E" />
            <stop offset="100%" stopColor="#C837AB" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="url(#ig-grad)" strokeWidth="2"/>
        <circle cx="12" cy="12" r="5" fill="none" stroke="url(#ig-grad)" strokeWidth="2"/>
        <circle cx="18" cy="6" r="1.5" fill="url(#ig-grad)"/>
      </svg>
    ),
    iconBg: 'bg-pink-50',
    category: 'Social',
    comingSoon: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Connect Facebook Messenger and Pages for lead engagement and messaging.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
      </svg>
    ),
    iconBg: 'bg-blue-50',
    category: 'Social',
    comingSoon: true,
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    description: 'Monitor mentions, engage with leads, and automate outreach on Twitter.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#000"/>
      </svg>
    ),
    iconBg: 'bg-gray-50',
    category: 'Social',
    comingSoon: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Integrate TikTok for lead generation and social commerce automation.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.29 6.29 0 0 0-.79-.05 6.27 6.27 0 0 0-6.27 6.27 6.27 6.27 0 0 0 6.27 6.27 6.27 6.27 0 0 0 6.27-6.27V8.98a8.22 8.22 0 0 0 4.83 1.56V7.09a4.84 4.84 0 0 1-1-.4z" fill="#000"/>
      </svg>
    ),
    iconBg: 'bg-gray-50',
    category: 'Social',
    comingSoon: true,
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Sync contacts, deals, and activities with your Salesforce CRM.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <path d="M10.006 5.415a4.195 4.195 0 0 1 3.045-1.306c1.56 0 2.954.862 3.677 2.14a5.1 5.1 0 0 1 2.16-.478c2.82 0 5.112 2.293 5.112 5.112 0 2.82-2.293 5.113-5.112 5.113a5.1 5.1 0 0 1-1.303-.169 3.744 3.744 0 0 1-3.412 2.198 3.72 3.72 0 0 1-1.623-.371A4.495 4.495 0 0 1 8.39 20.22a4.494 4.494 0 0 1-2.2.572c-1.682 0-3.139-.923-3.912-2.29A4.038 4.038 0 0 1 1 18.59c-1.1 0-2.1-.448-2.823-1.172A3.982 3.982 0 0 1-3 14.595c0-1.4.723-2.633 1.815-3.345A4.03 4.03 0 0 1-.5 8.595c0-2.2 1.8-4 4-4a3.98 3.98 0 0 1 2.5.878 4.195 4.195 0 0 1 4.006.942z" fill="#00A1E0" transform="translate(3 2)"/>
      </svg>
    ),
    iconBg: 'bg-sky-50',
    category: 'CRM',
    comingSoon: true,
  },
  {
    id: 'zoho',
    name: 'Zoho CRM',
    description: 'Integrate Zoho CRM for contact sync, deal tracking, and workflow automation.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <path d="M5.6 7.2L1 12l4.6 4.8L8 14.5 6 12l2-2.5zM12 4l-2.4 1.4L12 16l2.4-10.6zm6.4 3.2L16 9.5l2 2.5-2 2.5 2.4 2.3L23 12z" fill="#E42527"/>
      </svg>
    ),
    iconBg: 'bg-red-50',
    category: 'CRM',
    comingSoon: true,
  },
];

// Connection status for integrations that support it
type ConnectionStatus = 'connected' | 'disconnected' | 'loading';

export const IntegrationsSettings: React.FC = () => {
  const { tenantId } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<IntegrationView>('grid');
  const [statusMap, setStatusMap] = useState<Record<string, ConnectionStatus>>({});

  // Helper to update a single integration's status
  const setStatus = useCallback((id: string, status: ConnectionStatus) => {
    setStatusMap((prev) => ({ ...prev, [id]: status }));
  }, []);

  // Check all integration statuses on mount
  useEffect(() => {
    // WhatsApp Personal
    const checkWaPersonal = async () => {
      setStatus('whatsapp-personal', 'loading');
      try {
        const res = await fetchWithTenant('/api/personal-whatsapp/accounts');
        if (!res.ok) { setStatus('whatsapp-personal', 'disconnected'); return; }
        const data = await res.json();
        const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
        const connected = accounts.some((a: { status: string }) => a.status === 'connected');
        setStatus('whatsapp-personal', connected ? 'connected' : 'disconnected');
      } catch { setStatus('whatsapp-personal', 'disconnected'); }
    };

    // WhatsApp AI (Business API)
    const checkWaAI = async () => {
      setStatus('whatsapp-ai', 'loading');
      try {
        const res = await fetchWithTenant('/api/whatsapp-conversations/admin/whatsapp-accounts');
        if (!res.ok) { setStatus('whatsapp-ai', 'disconnected'); return; }
        const data = await res.json();
        const accounts = Array.isArray(data) ? data : (Array.isArray(data?.accounts) ? data.accounts : []);
        const active = accounts.some((a: { status?: string }) => a.status === 'active' || a.status === 'connected');
        setStatus('whatsapp-ai', active ? 'connected' : 'disconnected');
      } catch { setStatus('whatsapp-ai', 'disconnected'); }
    };

    // Google
    const checkGoogle = async () => {
      setStatus('google', 'loading');
      try {
        const res = await fetchWithTenant('/api/social-integration/calendar/google/status', { method: 'POST' });
        if (!res.ok) { setStatus('google', 'disconnected'); return; }
        const data = await res.json();
        setStatus('google', data?.connected ? 'connected' : 'disconnected');
      } catch { setStatus('google', 'disconnected'); }
    };

    // Microsoft
    const checkMicrosoft = async () => {
      setStatus('microsoft', 'loading');
      try {
        const res = await fetchWithTenant('/api/social-integration/calendar/microsoft/status', { method: 'POST' });
        if (!res.ok) { setStatus('microsoft', 'disconnected'); return; }
        const data = await res.json();
        setStatus('microsoft', data?.connected ? 'connected' : 'disconnected');
      } catch { setStatus('microsoft', 'disconnected'); }
    };

    // LinkedIn
    const checkLinkedIn = async () => {
      setStatus('linkedin', 'loading');
      try {
        const res = await fetchWithTenant('/api/campaigns/linkedin/accounts');
        if (!res.ok) { setStatus('linkedin', 'disconnected'); return; }
        const data = await res.json();
        const accounts = Array.isArray(data) ? data : (Array.isArray(data?.accounts) ? data.accounts : []);
        const connected = accounts.some((a: { status?: string }) =>
          a.status === 'connected' || a.status === 'active'
        );
        setStatus('linkedin', connected ? 'connected' : 'disconnected');
      } catch { setStatus('linkedin', 'disconnected'); }
    };

    // GoHighLevel
    const checkGHL = async () => {
      setStatus('gohighlevel', 'loading');
      try {
        const res = await fetchWithTenant('/api/social-integration/gohighlevel/status');
        if (!res.ok) { setStatus('gohighlevel', 'disconnected'); return; }
        const data = await res.json();
        setStatus('gohighlevel', data?.data?.connected ? 'connected' : 'disconnected');
      } catch { setStatus('gohighlevel', 'disconnected'); }
    };

    checkWaPersonal();
    checkWaAI();
    checkGoogle();
    checkMicrosoft();
    checkLinkedIn();
    checkGHL();
  }, [tenantId, setStatus]);

  // Re-check all statuses
  const refreshStatuses = useCallback(() => {
    // Trigger re-check by re-running the effect
    const checkAll = async () => {
      // WhatsApp Personal
      setStatus('whatsapp-personal', 'loading');
      try {
        const res = await fetchWithTenant('/api/personal-whatsapp/accounts');
        if (!res.ok) { setStatus('whatsapp-personal', 'disconnected'); return; }
        const data = await res.json();
        const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
        const connected = accounts.some((a: { status: string }) => a.status === 'connected');
        setStatus('whatsapp-personal', connected ? 'connected' : 'disconnected');
      } catch { setStatus('whatsapp-personal', 'disconnected'); }

      // WhatsApp AI
      setStatus('whatsapp-ai', 'loading');
      try {
        const res = await fetchWithTenant('/api/whatsapp-conversations/admin/whatsapp-accounts');
        if (!res.ok) { setStatus('whatsapp-ai', 'disconnected'); return; }
        const data = await res.json();
        const accounts = Array.isArray(data) ? data : (Array.isArray(data?.accounts) ? data.accounts : []);
        const active = accounts.some((a: { status?: string }) => a.status === 'active' || a.status === 'connected');
        setStatus('whatsapp-ai', active ? 'connected' : 'disconnected');
      } catch { setStatus('whatsapp-ai', 'disconnected'); }

      // Google
      setStatus('google', 'loading');
      try {
        const res = await fetchWithTenant('/api/social-integration/calendar/google/status', { method: 'POST' });
        if (!res.ok) { setStatus('google', 'disconnected'); return; }
        const data = await res.json();
        setStatus('google', data?.connected ? 'connected' : 'disconnected');
      } catch { setStatus('google', 'disconnected'); }

      // Microsoft
      setStatus('microsoft', 'loading');
      try {
        const res = await fetchWithTenant('/api/social-integration/calendar/microsoft/status', { method: 'POST' });
        if (!res.ok) { setStatus('microsoft', 'disconnected'); return; }
        const data = await res.json();
        setStatus('microsoft', data?.connected ? 'connected' : 'disconnected');
      } catch { setStatus('microsoft', 'disconnected'); }

      // LinkedIn
      setStatus('linkedin', 'loading');
      try {
        const res = await fetchWithTenant('/api/campaigns/linkedin/accounts');
        if (!res.ok) { setStatus('linkedin', 'disconnected'); return; }
        const data = await res.json();
        const accounts = Array.isArray(data) ? data : (Array.isArray(data?.accounts) ? data.accounts : []);
        const connected = accounts.some((a: { status?: string }) =>
          a.status === 'connected' || a.status === 'active'
        );
        setStatus('linkedin', connected ? 'connected' : 'disconnected');
      } catch { setStatus('linkedin', 'disconnected'); }

      // GoHighLevel
      setStatus('gohighlevel', 'loading');
      try {
        const res = await fetchWithTenant('/api/social-integration/gohighlevel/status');
        if (!res.ok) { setStatus('gohighlevel', 'disconnected'); return; }
        const data = await res.json();
        setStatus('gohighlevel', data?.data?.connected ? 'connected' : 'disconnected');
      } catch { setStatus('gohighlevel', 'disconnected'); }
    };
    checkAll();
  }, [setStatus]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return INTEGRATIONS;
    const q = searchQuery.toLowerCase();
    return INTEGRATIONS.filter(
      (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Detail view for a specific integration
  if (activeView !== 'grid') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => {
            setActiveView('grid');
            refreshStatuses();
          }}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          &larr; Back to Integrations
        </button>

        {activeView === 'whatsapp-ai' && <TenantOnboarding />}
        {activeView === 'whatsapp-personal' && <WhatsAppIntegration />}
        {activeView === 'google' && <GoogleAuthIntegration />}
        {activeView === 'microsoft' && <MicrosoftAuthIntegration />}
        {activeView === 'linkedin' && <LinkedInIntegration />}
        {activeView === 'gohighlevel' && <GoHighLevelIntegration />}
        {activeView === 'slack' && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Slack integration coming soon.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Integrations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect your tools to automate workflows and sync data.
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((integration) => (
          <div
            key={integration.id}
            className={`group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all ${
              integration.comingSoon
                ? 'opacity-75 cursor-default'
                : 'hover:border-primary/30 hover:shadow-md cursor-pointer'
            }`}
            onClick={() => {
              if (!integration.comingSoon) setActiveView(integration.id);
            }}
          >
            {/* Coming Soon badge (top-right) */}
            {integration.comingSoon && (
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="h-2.5 w-2.5" />
                  Coming Soon
                </span>
              </div>
            )}

            {/* Status badge (top-right) — only for non-coming-soon integrations */}
            {!integration.comingSoon && statusMap[integration.id] && statusMap[integration.id] !== 'loading' && (
              <div className="absolute top-3 right-3">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  statusMap[integration.id] === 'connected'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    statusMap[integration.id] === 'connected' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  {statusMap[integration.id] === 'connected' ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            )}

            {/* Icon + Title */}
            <div className="flex items-start gap-3 mb-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${integration.iconBg} flex items-center justify-center`}>
                {integration.icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-sm text-foreground leading-tight">{integration.name}</h3>
                <span className="text-[11px] text-muted-foreground">{integration.category}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1 leading-relaxed">
              {integration.description}
            </p>

            {/* Action */}
            {integration.comingSoon ? (
              <button
                disabled
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg py-2 cursor-not-allowed"
              >
                <Clock className="h-3.5 w-3.5" />
                Coming Soon
              </button>
            ) : (
              <button className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary border border-border rounded-lg py-2 hover:bg-primary/5 transition-colors">
                <Settings2 className="h-3.5 w-3.5" />
                Manage
              </button>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No integrations found matching &ldquo;{searchQuery}&rdquo;
        </div>
      )}
    </div>
  );
};
