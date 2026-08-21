'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Settings2, Linkedin, Instagram, Smartphone, Bot, Clock, Lock, Server, Truck, X, Power, Loader2, FolderOpen } from 'lucide-react';
import { useCreditsBalance } from '@lad/frontend-features/billing';
import { Input } from '@/components/ui/input';
import { GoogleAuthIntegration } from './GoogleAuthIntegration';
import { MicrosoftAuthIntegration } from './MicrosoftAuthIntegration';
import { CustomEmailIntegration } from './CustomEmailIntegration';
import { WhatsAppIntegration } from './WhatsAppIntegration';
import { PersonalWaTemplateManager } from '../conversations/PersonalWaTemplateManager';
import { LinkedInIntegration } from './LinkedInIntegration';
import { TenantOnboarding } from './TenantOnboarding';
import { WhatsAppEmbeddedSignup } from './WhatsAppEmbeddedSignup';
import { GoHighLevelIntegration } from './GoHighLevelIntegration';
import { ZohoIntegration } from './ZohoIntegration';
import { MageSettings } from './MageSettings';
import { useTenant } from '@/contexts/TenantContext';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { safeStorage } from '@lad/shared/storage';

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
    // Not an OAuth connection — we provision a Drive folder on our own account
    // and share it with the user, so this asks nothing of their Google account.
    // Distinct from the 'google' card above, which is their own Google sign-in.
    id: 'brand-assets',
    name: 'Media Generation Engine',
    description: 'Brand DNA, reference imagery, generated media, and the shorthand the media agent understands.',
    icon: <FolderOpen className="h-6 w-6 text-indigo-600" />,
    iconBg: 'bg-indigo-50',
    category: 'Content',
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
    id: 'zoho',
    name: 'Zoho CRM',
    description: 'Connect Zoho CRM to sync Contacts, Leads, and Deals - and push Mr LAD leads back into Zoho.',
    icon: (
      <span className="text-lg font-bold text-red-600 select-none leading-none" aria-label="Zoho">Z</span>
    ),
    iconBg: 'bg-red-50',
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
    id: 'routemagic',
    name: 'Route Magic',
    description: 'Connect Route Magic ERP to sync customers as leads and create sale orders from WhatsApp.',
    icon: <Truck className="h-6 w-6 text-emerald-700" />,
    iconBg: 'bg-emerald-50',
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

  // ── WhatsApp "AI Replies" master switch (tenant/channel-level) ─────────────
  // One flag per channel (chat_settings.ai_enabled), rendered as a pill on each
  // connected WhatsApp card. null = not loaded yet → pill shows the default (ON) and
  // is disabled until we know the real value. Mirrors the LinkedIn/Instagram
  // connected-account AI-Replies toggles.
  const [wabaAiEnabled, setWabaAiEnabled] = useState<boolean | null>(null);
  const [wapaAiEnabled, setWapaAiEnabled] = useState<boolean | null>(null);
  const [wabaAiSaving, setWabaAiSaving] = useState(false);
  const [wapaAiSaving, setWapaAiSaving] = useState(false);
  const [aiToggleToast, setAiToggleToast] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null);
  // Auto-dismiss the AI-Replies toast after a few seconds (mirrors LinkedIn/Instagram).
  useEffect(() => {
    if (!aiToggleToast) return;
    const t = setTimeout(() => setAiToggleToast(null), 4500);
    return () => clearTimeout(t);
  }, [aiToggleToast]);

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

  // ── Route Magic state ─────────────────────────────────────────────────────
  const [showRouteMagicModal, setShowRouteMagicModal] = useState(false);
  const [routeMagicForm, setRouteMagicForm] = useState({
    rm_tenant_id: '',
    display_name: '',
    api_key: '',
    base_url: 'https://staging-api.routemagic.co.uk',
  });
  const [routeMagicConnecting, setRouteMagicConnecting] = useState(false);
  const [routeMagicError, setRouteMagicError] = useState<string | null>(null);
  const [routeMagicStatusData, setRouteMagicStatusData] = useState<{
    rm_tenant_id: string | null;
    display_name: string | null;
    base_url: string | null;
    last_verified_at: string | null;
    last_sync_at: string | null;
  } | null>(null);
  const [routeMagicDisconnecting, setRouteMagicDisconnecting] = useState(false);
  const [routeMagicSyncing, setRouteMagicSyncing] = useState(false);
  const [routeMagicSyncResult, setRouteMagicSyncResult] = useState<{
    fetched: number;
    inserted: number;
    skipped: number;
    errors: number;
  } | null>(null);

  const routeMagicFormReset = () => {
    setRouteMagicForm({
      rm_tenant_id: '',
      display_name: '',
      api_key: '',
      base_url: 'https://staging-api.routemagic.co.uk',
    });
    setRouteMagicError(null);
  };

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
          // NOTE: do NOT write localStorage.whatsappChannel here — it globally biased
          // proxyClient routing to 'personal' for every unspecified call (sending WABA
          // requests to the personal/WAPA service). Channel is now per-request/explicit.
          // Load the WAPA "AI Replies" master switch for the connected-account pill.
          // WAPA returns { success, settings: { ai_enabled, ... } }. Default ON.
          if (connected) {
            try {
              const cs = await fetchWithTenant('/api/whatsapp-conversations/chat-settings');
              if (cs.ok) {
                const csData = await cs.json();
                setWapaAiEnabled(csData?.settings?.ai_enabled !== false);
              }
            } catch { /* non-fatal - pill stays at its default (ON) */ }
          }
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
          // Load the WABA "AI Replies" master switch for the connected-account pill.
          // WABA (?channel=waba) returns the settings dict directly with a top-level
          // ai_enabled. Default ON.
          if (active) {
            try {
              const cs = await fetchWithTenant('/api/whatsapp-conversations/chat-settings?channel=waba');
              if (cs.ok) {
                const csData = await cs.json();
                setWabaAiEnabled(csData?.ai_enabled !== false);
              }
            } catch { /* non-fatal - pill stays at its default (ON) */ }
          }
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

      // Zoho CRM
      setStatus('zoho', 'loading');
      try {
        const res = await fetchWithTenant('/api/social-integration/zoho/status');
        if (!res.ok) { setStatus('zoho', 'disconnected'); }
        else {
          const data = await res.json();
          setStatus('zoho', data?.data?.connected ? 'connected' : 'disconnected');
        }
      } catch { setStatus('zoho', 'disconnected'); }

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

      // Route Magic
      try {
        setStatus('routemagic', 'loading');
        const r = await fetchWithTenant('/api/social-integration/routemagic/status');
        const data = await r.json();
        setStatus('routemagic', data?.connected ? 'connected' : 'disconnected');
        if (data?.connected) {
          setRouteMagicStatusData({
            rm_tenant_id: data.rm_tenant_id ?? null,
            display_name: data.display_name ?? null,
            base_url: data.base_url ?? null,
            last_verified_at: data.last_verified_at ?? null,
            last_sync_at: data.last_sync_at ?? null,
          });
        }
      } catch {
        setStatus('routemagic', 'disconnected');
      }

      // Brand Assets folder — served by the playground worker, not the Next.js
      // API, so this goes direct with the JWT rather than via fetchWithTenant.
      //
      // Deliberately last in this chain. Every other check hits our own API,
      // but this one hits a Cloud Run service in asia-south1 that has no
      // minScale, so a first visit after an idle period pays a cold start.
      // Anywhere earlier and every integration below it waits behind that.
      // Being last also means the timeout can be generous: ConnectionStatus has
      // no "unknown", so timing out has to claim 'disconnected', and a short
      // fuse would mislabel a connected folder whenever the worker was cold.
      setStatus('brand-assets', 'loading');
      try {
        const workerUrl = process.env.NEXT_PUBLIC_PLAYGROUND_WORKER_URL || 'http://localhost:8080';
        const token = safeStorage.getItem('token');
        const res = await fetch(`${workerUrl}/brand-assets/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) { setStatus('brand-assets', 'disconnected'); }
        else {
          const data = await res.json();
          setStatus('brand-assets', data?.asset_count > 0 || data?.drive_connected ? 'connected' : 'disconnected');
        }
      } catch { setStatus('brand-assets', 'disconnected'); }
    };
    checkAll();
  }, [setStatus]);

  useEffect(() => {
    refreshStatuses();
  }, [tenantId, refreshStatuses]);

  // Returning from the Zoho OAuth redirect (/settings?tab=integrations&zoho=...)
  // → open the Zoho detail view so its success/error banner + status show.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const zoho = new URLSearchParams(window.location.search).get('zoho');
    if (zoho) setActiveView('zoho');
  }, []);

  // Flip a WhatsApp channel's tenant-level "AI Replies" master switch. Optimistic UI;
  // revert + toast on failure. Both calls go through the shared chat-settings proxy:
  //   WABA → PATCH /api/settings           (?channel=waba), echoes top-level ai_enabled
  //   WAPA → PUT /api/personal-whatsapp/chat-settings, echoes { settings: { ai_enabled } }
  // Mirrors the LinkedIn/Instagram connected-account AI-Replies toggle.
  const toggleWabaAi = useCallback(async () => {
    if (wabaAiSaving) return;
    const previous = wabaAiEnabled ?? true;
    const next = !previous;
    setWabaAiEnabled(next); // optimistic
    setWabaAiSaving(true);
    try {
      const res = await fetchWithTenant('/api/whatsapp-conversations/chat-settings?channel=waba', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_enabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || 'Failed to update AI Replies');
      if (typeof data?.ai_enabled === 'boolean') setWabaAiEnabled(data.ai_enabled); // reconcile
    } catch (err) {
      setWabaAiEnabled(previous); // revert
      setAiToggleToast({ kind: 'err', message: err instanceof Error ? err.message : 'Could not update AI Replies.' });
    } finally {
      setWabaAiSaving(false);
    }
  }, [wabaAiEnabled, wabaAiSaving]);

  const toggleWapaAi = useCallback(async () => {
    if (wapaAiSaving) return;
    const previous = wapaAiEnabled ?? true;
    const next = !previous;
    setWapaAiEnabled(next); // optimistic
    setWapaAiSaving(true);
    try {
      const res = await fetchWithTenant('/api/whatsapp-conversations/chat-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_enabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error || data?.message || 'Failed to update AI Replies');
      const serverVal = data?.settings?.ai_enabled;
      if (typeof serverVal === 'boolean') setWapaAiEnabled(serverVal); // reconcile
    } catch (err) {
      setWapaAiEnabled(previous); // revert
      setAiToggleToast({ kind: 'err', message: err instanceof Error ? err.message : 'Could not update AI Replies.' });
    } finally {
      setWapaAiSaving(false);
    }
  }, [wapaAiEnabled, wapaAiSaving]);

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
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors dark:text-slate-300"
          >
            &larr; Back to Integrations
          </button>

          {activeView === 'whatsapp-ai' && (
            <div className="space-y-6">
              {/* Self-serve path — Meta Embedded Signup via our Tech Provider app. */}
              <WhatsAppEmbeddedSignup />
              {/* Fallback — bring-your-own Meta app, for tenants provisioned that way. */}
              <TenantOnboarding />
            </div>
          )}
          {activeView === 'whatsapp-personal' && (
            <div className="space-y-6">
              <WhatsAppIntegration />
              <div className="text-card-foreground flex flex-col gap-6 py-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#071131]" style={{ minHeight: 400 }}>
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
          {activeView === 'brand-assets' && <MageSettings />}
          {activeView === 'linkedin' && <LinkedInIntegration />}
          {activeView === 'gohighlevel' && <GoHighLevelIntegration />}
          {activeView === 'zoho' && <ZohoIntegration />}
          {activeView === 'slack' && (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              Slack integration coming soon.
            </div>
          )}
          {activeView === 'mindbody' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-900/60 bg-white dark:bg-[#000319] p-5 sm:p-6 space-y-6 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 flex items-center justify-center">
                  <span className="text-2xl leading-none select-none" aria-label="MindBody">🧘</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight">MindBody</h3>
                  <p className="text-sm text-slate-400 dark:text-slate-400 mt-1 font-medium leading-relaxed">Automate trial class booking via WhatsApp AI</p>
                </div>
              </div>

              {statusMap['mindbody'] === 'connected' ? (
                <div className="space-y-4 animate-in fade-in duration-200">

                  <div className="rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#00051d]/40 p-4 space-y-3 text-sm font-semibold">
                    {mindBodyStatusData?.display_name && (
                      <div className="flex justify-between items-center border-b border-slate-100/60 dark:border-slate-800/40 pb-2">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">Display Name</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">{mindBodyStatusData.display_name}</span>
                      </div>
                    )}
                    {mindBodyStatusData?.site_id && (
                      <div className="flex justify-between items-center border-b border-slate-100/60 dark:border-slate-800/40 pb-2">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">Site ID</span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono text-xs bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">{mindBodyStatusData.site_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start gap-4 pt-0.5">
                      <span className="text-slate-400 dark:text-slate-500 font-medium flex-shrink-0">Target Classes</span>
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-slate-700 dark:text-slate-300 text-right break-words font-bold">

                          {mindBodyStatusData?.target_classes?.length
                            ? mindBodyStatusData.target_classes.join(', ')
                            : <span className="text-slate-400 dark:text-slate-500 italic font-medium">None selected</span>}
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
                            className="text-xs font-bold text-blue-500 hover:underline flex-shrink-0 mt-0.5 cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {editingClasses && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-950/10 p-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Select Target Classes</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClasses(false);
                            setConnectedAvailableClasses([]);
                            setConnectedClassFetchError(null);
                          }}
                          className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
                        >
                          ✕ Cancel
                        </button>
                      </div>

                      {connectedFetchingClasses && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          Loading available classes…
                        </div>
                      )}

                      {connectedClassFetchError && (
                        <p className="text-xs font-semibold text-red-500 leading-relaxed">{connectedClassFetchError}</p>
                      )}

                      {!connectedFetchingClasses && connectedAvailableClasses.length > 0 && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#00051d] divide-y divide-slate-100 dark:divide-slate-800/60 max-h-44 overflow-y-auto custom-scrollbar">
                          {connectedAvailableClasses.map((cls) => (
                            <label
                              key={cls}
                              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors select-none font-semibold text-sm text-slate-700 dark:text-slate-300"
                            >
                              <input
                                type="checkbox"
                                checked={connectedSelectedClasses.includes(cls)}
                                onChange={(e) => {
                                  setConnectedSelectedClasses((prev) =>
                                    e.target.checked ? [...prev, cls] : prev.filter((c) => c !== cls)
                                  );
                                }}
                                className="h-4 w-4 rounded accent-[#0b1957] dark:accent-[#2563eb] flex-shrink-0 cursor-pointer"
                              />
                              <span className="truncate">{cls}</span>
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
                        className="w-full h-11 px-4 rounded-xl text-sm font-bold text-white bg-[#0b1957] hover:bg-[#122572] dark:bg-[#2563eb] dark:hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none"
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
                    className="w-full sm:w-auto h-11 px-5 rounded-xl text-sm font-bold border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Disconnect MindBody
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-sm font-medium text-slate-400 dark:text-slate-400 leading-relaxed">
                    Connect your MindBody account to enable automated trial class booking workflows through the WhatsApp AI agent.
                  </p>
                  <button
                    onClick={() => {
                      mindBodyFormReset();
                      setShowMindBodyModal(true);
                    }}
                    className="w-full sm:w-auto h-11 px-5 rounded-xl text-sm font-bold text-white bg-[#0b1957] hover:bg-[#122572] dark:bg-[#2563eb] dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] cursor-pointer border-none"
                  >
                    <Settings2 className="h-4 w-4 shrink-0 stroke-[2.5]" />
                    Connect to MindBody
                  </button>
                </div>
              )}
            </div>
          )}
          {activeView === 'routemagic' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-900/60 bg-white dark:bg-[#000319] p-5 sm:p-6 space-y-6 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight">Route Magic</h3>
                  <p className="text-sm text-slate-400 dark:text-slate-400 mt-1 font-medium leading-relaxed">Sync customers as leads · create sale orders from WhatsApp</p>
                </div>
              </div>

              {statusMap['routemagic'] === 'connected' ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#00051d]/40 p-4 space-y-3 text-sm font-semibold">
                    {routeMagicStatusData?.display_name && (
                      <div className="flex justify-between items-center border-b border-slate-100/60 dark:border-slate-800/40 pb-2">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">Display Name</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">{routeMagicStatusData.display_name}</span>
                      </div>
                    )}
                    {routeMagicStatusData?.rm_tenant_id && (
                      <div className="flex justify-between items-center border-b border-slate-100/60 dark:border-slate-800/40 pb-2">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">Route Magic Tenant</span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono text-xs bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">{routeMagicStatusData.rm_tenant_id}</span>
                      </div>
                    )}
                    {routeMagicStatusData?.base_url && (
                      <div className="flex justify-between items-start gap-4 border-b border-slate-100/60 dark:border-slate-800/40 pb-2">
                        <span className="text-slate-400 dark:text-slate-500 font-medium flex-shrink-0">Base URL</span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono text-xs text-right break-all max-w-[70%]">{routeMagicStatusData.base_url}</span>
                      </div>
                    )}
                    {routeMagicStatusData?.last_sync_at && (
                      <div className="flex justify-between items-center pt-0.5">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">Last Customer Sync</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold text-xs">{new Date(routeMagicStatusData.last_sync_at).toLocaleString()}</span>
                      </div>
                    )}
                    {!routeMagicStatusData?.last_sync_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Customer Sync</span>
                        <span className="text-muted-foreground italic text-xs">Never synced</span>
                      </div>
                    )}
                  </div>

                  {routeMagicSyncResult && (
                    <div className="rounded-xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/40 dark:bg-emerald-950/10 p-3.5 text-xs font-semibold space-y-2">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[10px]">Last sync result</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700 dark:text-slate-300">
                    <div className="bg-white dark:bg-[#000319]/40 rounded-lg p-2 border border-slate-100 dark:border-slate-900/40"><span className="text-slate-400 dark:text-slate-500 font-medium block mb-0.5">Fetched:</span> <span className="font-bold text-sm text-blue-500">{routeMagicSyncResult.fetched}</span></div>
                        <div className="bg-white dark:bg-[#000319]/40 rounded-lg p-2 border border-slate-100 dark:border-slate-900/40"><span className="text-slate-400 dark:text-slate-500 font-medium block mb-0.5">Inserted:</span> <span className="font-bold text-sm text-emerald-500">{routeMagicSyncResult.inserted}</span></div>
                        <div className="bg-white dark:bg-[#000319]/40 rounded-lg p-2 border border-slate-100 dark:border-slate-900/40"><span className="text-slate-400 dark:text-slate-500 font-medium block mb-0.5">Skipped:</span> <span className="font-bold text-sm text-slate-500">{routeMagicSyncResult.skipped}</span></div>
                    <div className="bg-white dark:bg-[#000319]/40 rounded-lg p-2 border border-slate-100 dark:border-slate-900/40"><span className="text-slate-400 dark:text-slate-500 font-medium block mb-0.5">Errors:</span> <span className="font-bold text-sm text-red-500">{routeMagicSyncResult.errors}</span></div>
                      </div>
                    </div>
                  )}

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={routeMagicSyncing}
                      onClick={async () => {
                        setRouteMagicSyncing(true);
                        setRouteMagicSyncResult(null);
                        try {
                          const r = await fetchWithTenant('/api/social-integration/routemagic/customers/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ size: 100 }),
                          });
                          const data = await r.json();
                          if (r.ok && data?.success) {
                            setRouteMagicSyncResult({
                              fetched: data.fetched ?? 0,
                              inserted: data.inserted ?? 0,
                              skipped: data.skipped ?? 0,
                              errors: Array.isArray(data.errors) ? data.errors.length : 0,
                            });
                            setRouteMagicStatusData((prev) => prev ? { ...prev, last_sync_at: new Date().toISOString() } : prev);
                          }
                        } catch {} finally {
                          setRouteMagicSyncing(false);
                        }
                      }}
                      className="w-full sm:w-auto h-11 px-5 rounded-xl text-sm font-bold text-white bg-[#0b1957] hover:bg-[#122572] dark:bg-[#2563eb] dark:hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                      {routeMagicSyncing ? 'Syncing…' : 'Sync customers as leads'}
                    </button>
                    <button
                      type="button"
                      disabled={routeMagicDisconnecting}
                      onClick={async () => {
                        if (!confirm('Disconnect Route Magic? Sale-order history and customer sync watermarks remain in the DB.')) return;
                        setRouteMagicDisconnecting(true);
                        try {
                          await fetchWithTenant('/api/social-integration/routemagic/disconnect', { method: 'POST' });
                          setStatus('routemagic', 'disconnected');
                          setRouteMagicStatusData(null);
                          setRouteMagicSyncResult(null);
                        } catch {} finally {
                          setRouteMagicDisconnecting(false);
                        }
                      }}
                      className="w-full sm:w-auto h-11 px-5 rounded-xl text-sm font-bold border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      {routeMagicDisconnecting ? 'Disconnecting…' : 'Disconnect Route Magic'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <p className="text-sm font-medium text-slate-400 dark:text-slate-400 leading-relaxed">
                    Connect Route Magic so Maya can look up customers, share product info, and place sale orders straight from WhatsApp conversations.
                  </p>
                  <button
                    onClick={() => {
                      routeMagicFormReset();
                      setShowRouteMagicModal(true);
                    }}
                    className="w-full sm:w-auto h-11 px-5 rounded-xl text-sm font-bold text-white bg-[#0b1957] hover:bg-[#122572] dark:bg-[#2563eb] dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] cursor-pointer border-none"
                  >
                    <Settings2 className="h-4 w-4 shrink-0 stroke-[2.5]" />
                    Connect to Route Magic
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="pl-6 pr-4 sm:px-8 pt-4 pb-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Integrations
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold leading-relaxed">
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

          {/* AI-Replies toggle feedback — only surfaces on failure (mirrors LinkedIn). */}
          {aiToggleToast && (
            <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
              aiToggleToast.kind === 'ok'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
            }`}>
              {aiToggleToast.message}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 sm:px-0">
            {filtered.map((integration) => {
              const isCreditGated = CREDIT_GATED_IDS.has(integration.id);
              const isAlreadyConnected = statusMap[integration.id] === 'connected';
              const isLocked = isCreditGated && !hasCredits && !isAlreadyConnected;
              const status = statusMap[integration.id];

              return (
                <div
                  key={integration.id}
                  className={`group relative flex flex-col rounded-xl border border-border bg-card dark:bg-[#071131] dark:border-blue-950/40 p-5 transition-all ${
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
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50">
                        <Clock className="h-2.5 w-2.5" />
                        Coming Soon
                      </span>
                    </div>
                  )}

                  {!integration.comingSoon && isLocked && (
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50">
                        <Lock className="h-2.5 w-2.5" />
                        Requires Credits
                      </span>
                    </div>
                  )}

                  {!integration.comingSoon && !isLocked && status && status !== 'loading' && (
                    <div className="absolute top-3 right-3">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        status === 'connected'
                          ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/60'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          status === 'connected' ? 'bg-green-500 dark:bg-emerald-400' : 'bg-gray-400 dark:bg-slate-400'
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
                      <span className="text-[11px] text-muted-foreground dark:text-slate-300">{integration.category}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1 leading-relaxed dark:text-slate-300">
                    {integration.description}
                  </p>

                  {/* AI Replies master switch — only on a CONNECTED WhatsApp card.
                      Tenant/channel-level kill switch (chat_settings.ai_enabled): off
                      stops AI replies for ALL chats on this account (messages still
                      land in the inbox); on resumes. stopPropagation keeps a toggle
                      click from triggering the card's navigate-on-click. */}
                  {(integration.id === 'whatsapp-ai' || integration.id === 'whatsapp-personal') && status === 'connected' && (
                    <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                      <AiToggleChip
                        label="AI Replies"
                        enabled={(integration.id === 'whatsapp-ai' ? wabaAiEnabled : wapaAiEnabled) ?? true}
                        disabled={
                          integration.id === 'whatsapp-ai'
                            ? wabaAiEnabled === null || wabaAiSaving
                            : wapaAiEnabled === null || wapaAiSaving
                        }
                        onToggle={integration.id === 'whatsapp-ai' ? toggleWabaAi : toggleWapaAi}
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground leading-snug dark:text-slate-300">
                        Applies to all chats on this account
                      </p>
                    </div>
                  )}

                  <div className="mt-auto">
                    {integration.comingSoon ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 text-xs font-bold uppercase tracking-wider cursor-not-allowed border border-dashed border-gray-200 dark:text-slate-300"
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
                        className={`w-full h-11 px-5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 outline-none cursor-pointer border-none shadow-sm ${
                          status === 'connected'
                            ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-[#1a2a43]/40 dark:text-slate-300 dark:hover:bg-[#1a2a43]/60 dark:border-blue-500/30'
                            : 'bg-[#0b1957] hover:bg-[#122572] text-white dark:bg-[#2563eb] dark:hover:bg-blue-700 shadow-md'
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
          <div className="bg-white dark:bg-[#000319] border border-slate-200 dark:border-slate-900/60 rounded-2xl shadow-2xl w-full sm:max-w-5xl sm:w-[90vw] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 shrink-0">
                  <span className="text-xl select-none">🧘</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Connect MindBody</h3>
              </div>
              <button
                onClick={() => {
                  setShowMindBodyModal(false);
                  mindBodyFormReset();
                }}
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

              {(() => {
                const modalInputClass =
                    'w-full rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#00051d] px-3 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-0 focus-visible:ring-0 transition-all [box-shadow:0_0_0_30px_white_inset] dark:[box-shadow:0_0_0_30px_#00051d_inset] [-webkit-text-fill-color:#1e293b] dark:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0_30px_white_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#1e293b] dark:[&:-webkit-autofill]:[box-shadow:0_0_0_30px_#00051d_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:white]';

        return (
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
              className="p-6 sm:p-8 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Site ID <span className="text-destructive">*</span></label>
                  <Input
                    required
                    placeholder="e.g. -99"
                    value={mindBodyForm.site_id}
                    onChange={(e) => setMindBodyForm((f) => ({ ...f, site_id: e.target.value }))}
                    className={modalInputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Display Name</label>
                  <Input
                    placeholder="e.g. My Yoga Studio"
                    value={mindBodyForm.display_name}
                    onChange={(e) => setMindBodyForm((f) => ({ ...f, display_name: e.target.value }))}
                    className={modalInputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Username <span className="text-destructive">*</span></label>
                  <Input
                    required
                    placeholder="MindBody username"
                    value={mindBodyForm.username}
                    onChange={(e) => setMindBodyForm((f) => ({ ...f, username: e.target.value }))}
                    className={modalInputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">API Key <span className="text-destructive">*</span></label>
                  <Input
                    required
                    placeholder="MindBody API key"
                    value={mindBodyForm.api_key}
                    onChange={(e) => setMindBodyForm((f) => ({ ...f, api_key: e.target.value }))}
                    className={modalInputClass}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password *</label>
                  <Input
                    required
                    type="password"
                    placeholder="MindBody password"
                    value={mindBodyForm.password}
                    onChange={(e) => setMindBodyForm((f) => ({ ...f, password: e.target.value }))}
                    className={modalInputClass}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Classes</label>
                  {mindBodyForm.site_id && mindBodyForm.api_key && (
                    <button
                      type="button"
                      onClick={fetchAvailableClasses}
                      disabled={fetchingClasses}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-4 h-9 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {fetchingClasses ? 'Fetching...' : 'Fetch Classes'}
                    </button>
                  )}
                </div>

                {availableClasses.length > 0 && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#00051d]/40 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-48 overflow-y-auto p-2 custom-scrollbar">
                    {availableClasses.map((cls) => (
                      <label
                        key={cls}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white dark:hover:bg-[#00051d] rounded-xl transition-all select-none font-semibold text-sm text-slate-700 dark:text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(cls)}
                          onChange={(e) => {
                            setSelectedClasses((prev) =>
                              e.target.checked ? [...prev, cls] : prev.filter((c) => c !== cls)
                            );
                          }}
                          className="h-4 w-4 rounded accent-[#0b1957] dark:accent-[#2563eb] flex-shrink-0 cursor-pointer"
                        />
                        <span className="truncate">{cls}</span>
                      </label>
                    ))}
                  </div>
                )}

                {classFetchError && (
                  <p className="text-xs font-semibold text-red-500 leading-relaxed">{classFetchError}</p>
                )}
              </div>

              {mindBodyError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-semibold leading-relaxed animate-in fade-in duration-200">
                            <div className="flex items-start gap-2.5">
                 {mindBodyError}
              </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/40">
                <button
                  type="submit"
                  disabled={mindBodyConnecting}
                  className="w-full h-11 px-5 rounded-xl text-sm font-bold text-white bg-[#0b1957] hover:bg-[#122572] dark:bg-[#2563eb] dark:hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-[#0b1957] dark:disabled:hover:bg-[#2563eb] disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer border-none"
                >
                  {mindBodyConnecting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Connecting MindBody Account...
                              </>
                          ) : (
                              'Connect MindBody Account'
                          )}
                </button>
              </div>
            </form>
        );
      })()}
          </div>
        </div>
      )}

      {/* Route Magic Connect Modal */}
      {showRouteMagicModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#000319] border border-slate-200 dark:border-slate-900/60 rounded-2xl shadow-2xl w-full sm:max-w-3xl sm:w-[90vw] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 shrink-0">
                  <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Connect Route Magic</h3>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">Provided by your Route Magic admin</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRouteMagicModal(false);
                  routeMagicFormReset();
                }}
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </button>
            </div>

              {(() => {
                const modalInputClass =
                    'w-full rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#00051d] px-3 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-0 focus-visible:ring-0 transition-all [box-shadow:0_0_0_30px_white_inset] dark:[box-shadow:0_0_0_30px_#00051d_inset] [-webkit-text-fill-color:#1e293b] dark:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0_30px_white_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#1e293b] dark:[&:-webkit-autofill]:[box-shadow:0_0_0_30px_#00051d_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:white]';

        return (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setRouteMagicConnecting(true);
                setRouteMagicError(null);
                try {
                  const payload = {
                    rm_tenant_id: routeMagicForm.rm_tenant_id.trim(),
                    display_name: routeMagicForm.display_name.trim() || undefined,
                    api_key: routeMagicForm.api_key.trim(),
                    base_url: routeMagicForm.base_url.trim() || undefined,
                  };
                  const r = await fetchWithTenant('/api/social-integration/routemagic/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  const data = await r.json();
                  if (r.ok && data?.connected) {
                    setStatus('routemagic', 'connected');
                    setRouteMagicStatusData({
                      rm_tenant_id: data.rm_tenant_id ?? null,
                      display_name: data.display_name ?? null,
                      base_url: data.base_url ?? null,
                      last_verified_at: data.last_verified_at ?? null,
                      last_sync_at: data.last_sync_at ?? null,
                    });
                    setShowRouteMagicModal(false);
                    routeMagicFormReset();
                  } else {
                    const errorMsg = data?.detail
                      ? `${data.error}: ${data.detail}`
                      : (data?.error || data?.message || 'Connection failed. Please verify your credentials.');
                    setRouteMagicError(errorMsg);
                  }
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Unknown error';
                  setRouteMagicError(`Failed to connect: ${msg}`);
                } finally {
                  setRouteMagicConnecting(false);
                }
              }}
              className="p-6 sm:p-8 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Route Magic Tenant ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                      type="text"
                    placeholder="e.g. sunmeetdemo"
                    value={routeMagicForm.rm_tenant_id}
                    onChange={(e) => setRouteMagicForm((f) => ({ ...f, rm_tenant_id: e.target.value }))}
                    className={modalInputClass}
                  />
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            Sent as <code className="font-mono text-slate-500 dark:text-slate-400 px-1 bg-slate-50 dark:bg-slate-900 rounded">RM-TENANT-ID</code> header
                    </p>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Display Name</label>
                  <input
                              type="text"
                    placeholder="e.g. Sunmeet (Sandbox)"
                    value={routeMagicForm.display_name}
                    onChange={(e) => setRouteMagicForm((f) => ({ ...f, display_name: e.target.value }))}
                    className={modalInputClass}
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    API Key <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="password"
                    placeholder="Route Magic API key (UUID format)"
                    value={routeMagicForm.api_key}
                    onChange={(e) => setRouteMagicForm((f) => ({ ...f, api_key: e.target.value }))}
                    className={`${modalInputClass} font-mono`}
                  />
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        Sent as <code className="font-mono text-slate-500 dark:text-slate-400 px-1 bg-slate-50 dark:bg-slate-900 rounded">RM-API-KEY</code> header
                      </p>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Base URL</label>
                  <input type="text"
                    placeholder="https://staging-api.routemagic.co.uk"
                    value={routeMagicForm.base_url}
                    onChange={(e) => setRouteMagicForm((f) => ({ ...f, base_url: e.target.value }))}
                    className={`${modalInputClass} font-mono`}
                  />
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                            Defaults to the sandbox endpoint. Switch to production when going live.</p>
                </div>
              </div>

              {routeMagicError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-semibold leading-relaxed animate-in fade-in duration-200">
                            <div className="flex items-start gap-2.5">
                  {routeMagicError}
              </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <button
                  type="submit"
                  disabled={routeMagicConnecting}
                  className="w-full h-11 px-5 rounded-xl text-sm font-bold text-white bg-[#0b1957] hover:bg-[#122572] dark:bg-[#2563eb] dark:hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-[#0b1957] dark:disabled:hover:bg-[#2563eb] disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer border-none"
                >
                  {routeMagicConnecting ? 'Verifying & Connecting…' : 'Connect Route Magic Account'}
                </button>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-3 text-center">
                  We&apos;ll call <code className="text-foreground">GET /customers</code> against Route Magic to verify before saving.
                </p>
              </div>
            </form>
        );
      })()}
          </div>
        </div>
      )}
    </>
  );
};

// ── AI Replies chip ──────────────────────────────────────────────────────────
// Green pill toggle mirroring the LinkedIn/Instagram connected-account cards
// (web/src/components/settings/LinkedInIntegration.tsx → AiToggleChip).
function AiToggleChip({
  label,
  enabled,
  onToggle,
  disabled,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 ${
        enabled
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20'
          : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
      }`}
    >
      <Power className="h-3 w-3" />
      {label}: {enabled ? 'on' : 'off'}
    </button>
  );
}
