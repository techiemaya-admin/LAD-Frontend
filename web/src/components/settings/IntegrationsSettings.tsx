'use client';

import { useState, useMemo } from 'react';
import { Search, Settings2, Linkedin, Smartphone, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GoogleAuthIntegration } from './GoogleAuthIntegration';
import { MicrosoftAuthIntegration } from './MicrosoftAuthIntegration';
import { WhatsAppIntegration } from './WhatsAppIntegration';
import { LinkedInIntegration } from './LinkedInIntegration';
import { TenantOnboarding } from './TenantOnboarding';

type IntegrationView = 'grid' | string;

interface IntegrationCard {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  category: string;
}

const INTEGRATIONS: IntegrationCard[] = [
  {
    id: 'whatsapp-ai',
    name: 'WhatsApp AI Agent',
    description: 'Configure your WhatsApp Business API account for AI-powered conversations.',
    icon: <Bot className="h-6 w-6 text-green-600" />,
    iconBg: 'bg-green-50',
    category: 'AI',
  },
  {
    id: 'whatsapp-personal',
    name: 'WhatsApp Personal',
    description: 'Connect your personal WhatsApp number via QR code for direct messaging.',
    icon: <Smartphone className="h-6 w-6 text-emerald-600" />,
    iconBg: 'bg-emerald-50',
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
  },
];

export const IntegrationsSettings: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<IntegrationView>('grid');

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
          onClick={() => setActiveView('grid')}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          &larr; Back to Integrations
        </button>

        {activeView === 'whatsapp-ai' && <TenantOnboarding />}
        {activeView === 'whatsapp-personal' && <WhatsAppIntegration />}
        {activeView === 'google' && <GoogleAuthIntegration />}
        {activeView === 'microsoft' && <MicrosoftAuthIntegration />}
        {activeView === 'linkedin' && <LinkedInIntegration />}
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
            className="group relative flex flex-col rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
            onClick={() => setActiveView(integration.id)}
          >
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
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary border border-border rounded-lg py-2 hover:bg-primary/5 transition-colors">
              <Settings2 className="h-3.5 w-3.5" />
              Manage
            </button>
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
