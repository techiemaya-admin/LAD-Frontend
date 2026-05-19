'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Settings2, Linkedin, Instagram, Smartphone, Bot, Clock, Lock, Server, X } from 'lucide-react';
import { useCreditsBalance } from '@lad/frontend-features/billing';
import { Input } from '@/components/ui/input';
import { GoogleAuthIntegration } from './GoogleAuthIntegration';
import { MicrosoftAuthIntegration } from './MicrosoftAuthIntegration';
import { CustomEmailIntegration } from './CustomEmailIntegration';
import { WhatsAppIntegration } from './WhatsAppIntegration';
import { PersonalWaTemplateManager } from '../conversations/PersonalWaTemplateManager';
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
  // When set, clicking the card navigates to this URL instead of
  // setActiveView(id). Used for integrations that own a dedicated page
  // (e.g. Instagram has its own /instagram management surface).
  route?: string;
}

const CREDIT_GATED_IDS = new Set(['linkedin', 'whatsapp-ai', 'whatsapp-personal', 'google', 'microsoft']);

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
    id: 'instagram',
    name: 'Instagram',
    description: 'Connect Instagram for AI-powered DMs, comments, and lead capture.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <defs>
          <radialGradient id="ig-grad" cx="0.3" cy="1.1" r="1">
            <stop offset="0" stopColor="#fdf497" />
            <stop offset="0.05" stopColor="#fdf497" />
            <stop offset="0.45" stopColor="#fd5949" />
            <stop offset="0.6" stopColor="#d6249f" />
            <stop offset="0.9" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad)" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.6" />
        <circle cx="17.6" cy="6.4" r="1.1" fill="#fff" />
      </svg>
    ),
    iconBg: 'bg-pink-50',
    category: 'Social',
    // Land on the Accounts tab — same parity as clicking the WhatsApp tile
    // which opens the tenant onboarding form right away.
    route: '/instagram/settings?tab=accounts',
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
    id: 'custom-email',
    name: 'Custom Email (SMTP)',
    description: 'Connect Roundcube, cPanel mail, Zoho, Yandex, Fastmail, or any self-hosted webmail.',
    icon: <Server className="h-6 w-6 text-emerald-600" />,
    iconBg: 'bg-emerald-50',
    category: 'Email & Calendar',
  },
  {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    description: 'Connect GoHighLevel CRM to sync contacts, deals, and automate workflows.',
    icon: (
      <svg viewBox="0 0 120 120" className="h-6 w-6">
        <polygon points="15,100 27,100 27,60 15,60" fill="#FFB902"/>
        <polygon points="7,60 35,60 21,30" fill="#FFB902"/>
        <polygon points="21,30 35,60 28,60 28,42" fill="#E0A300"/>
        <polygon points="40,100 52,100 52,55 40,55" fill="#0B81FF"/>
        <polygon points="32,55 60,55 46,22" fill="#0B81FF"/>
        <polygon points="46,22 60,55 53,55 53,36" fill="#0066CC"/>
        <polygon points="65,100 77,100 77,48 65,48" fill="#00C853"/>
        <polygon points="57,48 85,48 71,12" fill="#00C853"/>
        <polygon points="71,12 85,48 78,48 78,28" fill="#009624"/>
      </svg>
    ),
    iconBg: 'bg-white',
    category: 'CRM',
  },
  {
    id: 'mindbody',
    name: 'MindBody',
    description: 'Connect MindBody to automate trial class booking via WhatsApp AI.',
    icon: (
      <span className="text-2xl leading-none select-none" aria-label="MindBody">🧘</span>
    ),
    iconBg: 'bg-teal-50',
    category: 'CRM',
    comingSoon: false,
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
];

type ConnectionStatus = 'connected' | 'disconnected' | 'loading';

export const IntegrationsSettings: React.FC = () => {
  const router = useRouter();
  const { tenantId } = useTenant();
  const { data: creditsData } = useCreditsBalance();
  const availableCredits = creditsData?.availableBalance ?? creditsData?.balance ?? null;
  const hasCredits = availableCredits === null || availableCredits > 0;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<IntegrationView>('grid');
  const [statusMap, setStatusMap] = useState<Record<string, ConnectionStatus>>({});

  const [showMindBodyModal, setShowMindBodyModal] = useState(false);
  const [mindBodyForm, setMindBodyForm] = useState({
    site_id: '',
    display_name: '',
    username: '',
    api_key: '',
    password: '',
  });
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [fetchingClasses, setFetchingClasses] = useState(false);
  const [classFetchError, setClassFetchError] = useState<string | null>(null);

  const [mindBodyConnecting, setMindBodyConnecting] = useState(false);
  const [mindBodyError, setMindBodyError] = useState<string | null>(null);
  const [mindBodyStatusData, setMindBodyStatusData] = useState<{
    site_id: string | null;
    display_name: string | null;
    target_classes: string[];
  } | null>(null);

  const [editingClasses, setEditingClasses] = useState(false);
  const [connectedAvailableClasses, setConnectedAvailableClasses] = useState<string[]>([]);
  const [connectedSelectedClasses, setConnectedSelectedClasses] = useState<string[]>([]);
  const [connectedFetchingClasses, setConnectedFetchingClasses] = useState(false);
  const [connectedClassFetchError, setConnectedClassFetchError] = useState<string | null>(null);
  const [updatingClasses, setUpdatingClasses] = useState(false);

  const setStatus = useCallback((id: string, status: ConnectionStatus) => {
    setStatusMap((prev) => ({ ...prev, [id]: status }));
  }, []);

  const refreshStatuses = useCallback(() => {
    const checkAll = async () => {
      // WhatsApp Personal
      setStatus('whatsapp-personal', 'loading');
      try {
        const res = await fetchWithTenant('/api/personal-whatsapp/accounts');
        if (!res.ok) { setStatus('whatsapp-personal', 'disconnected'); }
        else {
          const data = await res.json();
          const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
          const connected = accounts.some((a: any) => a.status === 'connected');
          setStatus('whatsapp-personal', connected ? 'connected' : 'disconnected');
          if (connected) try { localStorage.setItem('whatsappChannel', 'personal'); } catch {}
        }
      } catch { setStatus('whatsapp-personal', 'disconnected'); }

      // WhatsApp AI
      setStatus('whatsapp-ai', 'loading');
      try {
        const res = await fetchWithTenant('/api/whatsapp-conversations/admin/whatsapp-accounts');
        if (!res.ok) { setStatus('whatsapp-ai', 'disconnected'); }
        else {
          const data = await res.json();
          const accounts = Array.isArray(data) ? data : (Array.isArray(data?.accounts) ? data.accounts : []);
          const active = accounts.some((a: any) => a.status === 'active' || a.status === 'connected');
          setStatus('whatsapp-ai', active ? 'connected' : 'disconnected');
        }
      } catch { setStatus('whatsapp-ai', 'disconnected'); }

      // Google
      setStatus('google', 'loading');
      try {
        const res = await fetchWithTenant('/api/social-integration/email/google/status', { method: 'POST' });
        if (!res.ok) { setStatus('google', 'disconnected'); }
        else {
          const data = await res.json();
          setStatus('google', data?.connected ? 'connected' : 'disconnected');
        }
      } catch { setStatus('google', 'disconnected'); }

      // Microsoft
      setStatus('microsoft', 'loading');
      try {
        const res = await fetchWithTenant('/api/social-integration/email/microsoft/status', { method: 'POST' });
        if (!res.ok) { setStatus('microsoft', 'disconnected'); }
        else {
          const data = await res.json();
          setStatus('microsoft', data?.connected ? 'connected' : 'disconnected');
        }
      } catch { setStatus('microsoft', 'disconnected'); }

      // Instagram — hits the standalone LAD-Instagram-Comms service via
      // the Next.js proxy. "Connected" = at least one active (non-deleted)
      // account row, regardless of provider (meta or unipile).
      setStatus('instagram', 'loading');
      try {
        const res = await fetchWithTenant('/api/instagram-conversations/accounts');
        if (!res.ok) { setStatus('instagram', 'disconnected'); }
        else {
          const data = await res.json();
          const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
          const connected = accounts.some(
            (a: any) => (a.status ?? 'active') !== 'inactive' && !a.is_deleted,
          );
          setStatus('instagram', connected ? 'connected' : 'disconnected');
        }
      } catch { setStatus('instagram', 'disconnected'); }

      // LinkedIn
      setStatus('linkedin', 'loading');
      try {
        const res = await fetchWithTenant('/api/campaigns/linkedin/accounts');
        if (!res.ok) { setStatus('linkedin', 'disconnected'); }
        else {
          const data = await res.json();
          const accounts = Array.isArray(data) ? data : (Array.isArray(data?.accounts) ? data.accounts : []);
          const connected = accounts.some((a: any) => a.status === 'connected' || a.status === 'active');
          setStatus('linkedin', connected ? 'connected' : 'disconnected');
        }
      } catch { setStatus('linkedin', 'disconnected'); }

      // GoHighLevel
      setStatus('gohighlevel', 'loading');
      try {
        const res = await fetchWithTenant('/api/social-integration/gohighlevel/status');
        if (!res.ok) { setStatus('gohighlevel', 'disconnected'); }
        else {
          const data = await res.json();
          setStatus('gohighlevel', data?.data?.connected ? 'connected' : 'disconnected');
        }
      } catch { setStatus('gohighlevel', 'disconnected'); }

      // MindBody
      try {
        setStatus('mindbody', 'loading');
        const r = await fetchWithTenant('/api/social-integration/mindbody/status', { method: 'POST' });
        const data = await r.json();
        setStatus('mindbody', data?.connected ? 'connected' : 'disconnected');
        if (data?.connected) {
          setMindBodyStatusData({
            site_id: data.site_id ?? null,
            display_name: data.display_name ?? null,
            target_classes: Array.isArray(data.target_classes) ? data.target_classes : [],
          });
        }
      } catch {
        setStatus('mindbody', 'disconnected');
      }
    };
    checkAll();
  }, [setStatus]);

  useEffect(() => {
    refreshStatuses();
  }, [tenantId, refreshStatuses]);

  const fetchAvailableClasses = async () => {
    setFetchingClasses(true);
    setClassFetchError(null);
    try {
      const r = await fetchWithTenant('/api/social-integration/mindbody/preview-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: mindBodyForm.site_id, api_key: mindBodyForm.api_key }),
      });
      const data = await r.json();
      if (Array.isArray(data?.uniqueNames) && data.uniqueNames.length > 0) {
        setAvailableClasses(data.uniqueNames);
      } else {
        setAvailableClasses([]);
        setClassFetchError('No classes found in the next 7 days. Verify your Site ID and API Key.');
      }
    } catch {
      setClassFetchError('Failed to fetch classes. Please verify your credentials.');
    } finally {
      setFetchingClasses(false);
    }
  };

  const mindBodyFormReset = () => {
    setMindBodyForm({ site_id: '', display_name: '', username: '', api_key: '', password: '' });
    setAvailableClasses([]);
    setSelectedClasses([]);
    setClassFetchError(null);
    setMindBodyError(null);
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return INTEGRATIONS;
    const q = searchQuery.toLowerCase();
    return INTEGRATIONS.filter(
      (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <>
      {activeView !== 'grid' ? (
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
          {activeView === 'whatsapp-personal' && (
            <div className="space-y-6">
              <WhatsAppIntegration />
              <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ minHeight: 400 }}>
                <PersonalWaTemplateManager />
              </div>
            </div>
          )}
          {activeView === 'google' && <GoogleAuthIntegration />}
          {activeView === 'microsoft' && <MicrosoftAuthIntegration />}
          {activeView === 'custom-email' && (
            <CustomEmailIntegration
              onStatusChange={(connected) =>
                setStatus('custom-email', connected ? 'connected' : 'disconnected')
              }
            />
          )}
          {activeView === 'linkedin' && <LinkedInIntegration />}
          {activeView === 'gohighlevel' && <GoHighLevelIntegration />}
          {activeView === 'slack' && (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              Slack integration coming soon.
            </div>
          )}
          {activeView === 'mindbody' && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <span className="text-2xl leading-none select-none" aria-label="MindBody">🧘</span>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground">MindBody</h3>
                  <p className="text-xs text-muted-foreground">Automate trial class booking via WhatsApp AI</p>
                </div>
              </div>

              {statusMap['mindbody'] === 'connected' ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
                    {mindBodyStatusData?.display_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Display Name</span>
                        <span className="font-medium text-foreground">{mindBodyStatusData.display_name}</span>
                      </div>
                    )}
                    {mindBodyStatusData?.site_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Site ID</span>
                        <span className="font-medium text-foreground">{mindBodyStatusData.site_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-muted-foreground flex-shrink-0">Target Classes</span>
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="font-medium text-foreground text-right break-words">
                          {mindBodyStatusData?.target_classes?.length
                            ? mindBodyStatusData.target_classes.join(', ')
                            : <span className="text-muted-foreground italic">None selected</span>}
                        </span>
                        {!editingClasses && (
                          <button
                            type="button"
                            onClick={async () => {
                              setEditingClasses(true);
                              setConnectedFetchingClasses(true);
                              setConnectedClassFetchError(null);
                              setConnectedSelectedClasses(mindBodyStatusData?.target_classes ?? []);
                              try {
                                const r = await fetchWithTenant('/api/social-integration/mindbody/classes');
                                const data = await r.json();
                                const names: string[] = Array.isArray(data?.classes)
                                  ? [...new Set((data.classes as { name: string }[]).map(c => c.name).filter(Boolean))].sort() as string[]
                                  : [];
                                setConnectedAvailableClasses(names);
                                if (!names.length) setConnectedClassFetchError('No classes found in the next 7 days.');
                              } catch {
                                setConnectedClassFetchError('Failed to load classes from MindBody.');
                              } finally {
                                setConnectedFetchingClasses(false);
                              }
                            }}
                            className="text-[11px] font-medium text-primary hover:underline flex-shrink-0 mt-0.5"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {editingClasses && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Select Target Classes</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClasses(false);
                            setConnectedAvailableClasses([]);
                            setConnectedClassFetchError(null);
                          }}
                          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          ✕ Cancel
                        </button>
                      </div>

                      {connectedFetchingClasses && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-block h-3 w-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          Loading available classes…
                        </div>
                      )}

                      {connectedClassFetchError && (
                        <p className="text-xs text-destructive">{connectedClassFetchError}</p>
                      )}

                      {!connectedFetchingClasses && connectedAvailableClasses.length > 0 && (
                        <div className="rounded-lg border border-border bg-background divide-y divide-border max-h-44 overflow-y-auto">
                          {connectedAvailableClasses.map((cls) => (
                            <label
                              key={cls}
                              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={connectedSelectedClasses.includes(cls)}
                                onChange={(e) => {
                                  setConnectedSelectedClasses((prev) =>
                                    e.target.checked ? [...prev, cls] : prev.filter((c) => c !== cls)
                                  );
                                }}
                                className="h-3.5 w-3.5 rounded accent-primary flex-shrink-0"
                              />
                              <span className="text-sm text-foreground">{cls}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={updatingClasses || connectedFetchingClasses}
                        onClick={async () => {
                          setUpdatingClasses(true);
                          setConnectedClassFetchError(null);
                          try {
                            const r = await fetchWithTenant('/api/social-integration/mindbody/target-classes', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ target_classes: connectedSelectedClasses }),
                            });
                            const data = await r.json();
                            if (r.ok) {
                              setMindBodyStatusData((prev) =>
                                prev ? { ...prev, target_classes: connectedSelectedClasses } : prev
                              );
                              setEditingClasses(false);
                              setConnectedAvailableClasses([]);
                            } else {
                              setConnectedClassFetchError(data?.error || 'Failed to update target classes.');
                            }
                          } catch {
                            setConnectedClassFetchError('Failed to save changes. Please try again.');
                          } finally {
                            setUpdatingClasses(false);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-lg px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {updatingClasses ? 'Saving…' : 'Save Target Classes'}
                      </button>
                    </div>
                  )}

                  <button
                    onClick={async () => {
                      try {
                        await fetchWithTenant('/api/social-integration/mindbody/disconnect', { method: 'POST' });
                        setStatus('mindbody', 'disconnected');
                        setMindBodyStatusData(null);
                        setEditingClasses(false);
                        setConnectedAvailableClasses([]);
                      } catch {}
                    }}
                    className="text-sm font-medium text-destructive border border-destructive/30 rounded-lg px-4 py-2 hover:bg-destructive/5 transition-colors"
                  >
                    Disconnect MindBody
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Connect your MindBody account to enable automated trial class booking workflows through the WhatsApp AI agent.
                  </p>
                  <button
                    onClick={() => {
                      mindBodyFormReset();
                      setShowMindBodyModal(true);
                    }}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary border border-border rounded-lg px-4 py-2 hover:bg-primary/5 transition-colors"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Connect to MindBody
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Integrations</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Connect your tools to automate workflows and sync data.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 sm:h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((integration) => {
              const isCreditGated = CREDIT_GATED_IDS.has(integration.id);
              const isAlreadyConnected = statusMap[integration.id] === 'connected';
              const isLocked = isCreditGated && !hasCredits && !isAlreadyConnected;
              const status = statusMap[integration.id];

              return (
                <div
                  key={integration.id}
                  className={`group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-all ${
                    integration.comingSoon || isLocked
                      ? 'opacity-75 cursor-default'
                      : 'hover:border-primary/30 hover:shadow-md cursor-pointer'
                  }`}
                  onClick={() => {
                    if (integration.comingSoon || isLocked) return;
                    if (integration.route) {
                      router.push(integration.route);
                    } else {
                      setActiveView(integration.id);
                    }
                  }}
                >
                  {integration.comingSoon && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="h-2.5 w-2.5" />
                        Coming Soon
                      </span>
                    </div>
                  )}

                  {!integration.comingSoon && isLocked && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        <Lock className="h-2.5 w-2.5" />
                        Requires Credits
                      </span>
                    </div>
                  )}

                  {!integration.comingSoon && !isLocked && status && status !== 'loading' && (
                    <div className="absolute top-3 right-3">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        status === 'connected'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 text-gray-500 border border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          status === 'connected' ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        {status === 'connected' ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-3 mb-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${integration.iconBg} flex items-center justify-center`}>
                      {integration.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm text-foreground leading-tight">{integration.name}</h3>
                      <span className="text-[11px] text-muted-foreground">{integration.category}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1 leading-relaxed">
                    {integration.description}
                  </p>

                  <div className="mt-auto">
                    {integration.comingSoon ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 text-xs font-bold uppercase tracking-wider cursor-not-allowed border border-dashed border-gray-200"
                      >
                        Coming Soon
                      </button>
                    ) : isLocked ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 text-xs font-bold uppercase tracking-wider cursor-not-allowed border border-orange-200"
                      >
                        <Lock className="h-3 w-3 inline mr-1" />
                        Credits Required
                      </button>
                    ) : (
                      <button
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                          status === 'connected'
                            ? 'bg-gray-50 dark:bg-gray-800 text-gray-600 hover:bg-gray-100 border border-gray-200'
                            : 'bg-primary text-primary-foreground hover:shadow-lg'
                        }`}
                      >
                        {status === 'connected' ? 'Manage Settings' : 'Connect Now'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MindBody Connect Modal - Standardized */}
      {showMindBodyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#000724] border border-gray-200 dark:border-[#262831] rounded-[2rem] shadow-2xl w-full sm:max-w-5xl sm:w-[90vw] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 pt-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-600">
                  <span className="text-xl">🧘</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Connect MindBody</h3>
              </div>
              <button
                onClick={() => {
                  setShowMindBodyModal(false);
                  mindBodyFormReset();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[#253456] rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setMindBodyConnecting(true);
                setMindBodyError(null);
                try {
                  const payload = {
                    site_id: mindBodyForm.site_id,
                    display_name: mindBodyForm.display_name,
                    username: mindBodyForm.username,
                    api_key: mindBodyForm.api_key,
                    password: mindBodyForm.password,
                    target_classes: selectedClasses,
                  };
                  const r = await fetchWithTenant('/api/social-integration/mindbody/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  const data = await r.json();
                  if (data?.connected) {
                    setStatus('mindbody', 'connected');
                    setMindBodyStatusData({
                      site_id: data.site_id ?? null,
                      display_name: data.display_name ?? null,
                      target_classes: Array.isArray(data.target_classes) ? data.target_classes : [],
                    });
                    setShowMindBodyModal(false);
                    mindBodyFormReset();
                  } else {
                    const errorMsg = data?.detail
                      ? `${data.error}: ${data.detail}`
                      : (data?.error || data?.message || 'Connection failed. Please check your credentials.');
                    setMindBodyError(errorMsg);
                  }
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Unknown error';
                  setMindBodyError(`Failed to connect: ${msg}`);
                } finally {
                  setMindBodyConnecting(false);
                }
              }}
              className="p-8 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-[#7a8ba3] uppercase tracking-wider ml-1">Site ID <span className="text-destructive">*</span></label>
                  <Input
                    required
                    placeholder="e.g. -99"
                    value={mindBodyForm.site_id}
                    onChange={(e) => setMindBodyForm((f) => ({ ...f, site_id: e.target.value }))}
                    className="h-12 bg-gray-50 dark:bg-[#1a2a43] border-gray-200 dark:border-[#262831] rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-[#7a8ba3] uppercase tracking-wider ml-1">Display Name</label>
                  <Input
                    placeholder="e.g. My Yoga Studio"
                    value={mindBodyForm.display_name}
                    onChange={(e) => setMindBodyForm((f) => ({ ...f, display_name: e.target.value }))}
                    className="h-12 bg-gray-50 dark:bg-[#1a2a43] border-gray-200 dark:border-[#262831] rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-[#7a8ba3] uppercase tracking-wider ml-1">Username <span className="text-destructive">*</span></label>
                  <Input
                    required
                    placeholder="MindBody username"
                    value={mindBodyForm.username}
                    onChange={(e) => setMindBodyForm((f) => ({ ...f, username: e.target.value }))}
                    className="h-12 bg-gray-50 dark:bg-[#1a2a43] border-gray-200 dark:border-[#262831] rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-[#7a8ba3] uppercase tracking-wider ml-1">API Key <span className="text-destructive">*</span></label>
                  <Input
                    required
                    placeholder="MindBody API key"
                    value={mindBodyForm.api_key}
                    onChange={(e) => setMindBodyForm((f) => ({ ...f, api_key: e.target.value }))}
                    className="h-12 bg-gray-50 dark:bg-[#1a2a43] border-gray-200 dark:border-[#262831] rounded-xl"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-[#7a8ba3] uppercase tracking-wider ml-1">Password <span className="text-destructive">*</span></label>
                  <Input
                    required
                    type="password"
                    placeholder="MindBody password"
                    value={mindBodyForm.password}
                    onChange={(e) => setMindBodyForm((f) => ({ ...f, password: e.target.value }))}
                    className="h-12 bg-gray-50 dark:bg-[#1a2a43] border-gray-200 dark:border-[#262831] rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 dark:text-[#7a8ba3] uppercase tracking-wider ml-1">Target Classes</label>
                  {mindBodyForm.site_id && mindBodyForm.api_key && (
                    <button
                      type="button"
                      onClick={fetchAvailableClasses}
                      disabled={fetchingClasses}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-primary uppercase tracking-widest border border-primary/30 rounded-lg px-4 py-1.5 hover:bg-primary/5 transition-all disabled:opacity-60"
                    >
                      {fetchingClasses ? 'Fetching...' : 'Fetch Classes'}
                    </button>
                  )}
                </div>

                {availableClasses.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 dark:border-[#262831] bg-gray-50/50 dark:bg-[#1a2a43]/30 divide-y divide-gray-100 dark:divide-[#262831] max-h-48 overflow-y-auto p-2">
                    {availableClasses.map((cls) => (
                      <label
                        key={cls}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white dark:hover:bg-[#1a2a43] rounded-xl transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(cls)}
                          onChange={(e) => {
                            setSelectedClasses((prev) =>
                              e.target.checked ? [...prev, cls] : prev.filter((c) => c !== cls)
                            );
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-white">{cls}</span>
                      </label>
                    ))}
                  </div>
                )}

                {classFetchError && (
                  <p className="text-sm text-destructive font-medium px-2">{classFetchError}</p>
                )}
              </div>

              {mindBodyError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400 text-sm font-medium">
                  {mindBodyError}
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={mindBodyConnecting}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {mindBodyConnecting ? 'Connecting...' : 'Connect MindBody Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
