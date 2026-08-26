'use client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Users,
  Plug,
  Terminal,
  CreditCard,
  Coins,
  MessageSquare,
  Target,
  Crosshair,
  ClipboardCheck,
} from 'lucide-react';
import { setCompanyName } from '@/store/slices/settingsSlice';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';
import { VoiceAgentSettings } from '@/components/voice-agent/VoiceAgentSettings';
import { ChatSettings } from '@/components/settings/ChatSettings';
import { BillingSettings } from '@/components/settings/BillingSettings';
import { CreditsSettings } from '@/components/settings/CreditsSettings';
import { BusinessProfileSettings } from '@/components/settings/BusinessProfileSettings';
import { TeamManagement } from '@/components/settings/TeamManagement';
import { ProposalSettings } from '@/components/settings/proposal/ProposalSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';

type ActiveTab =
  | 'businessprofile'
  | 'team'
  | 'accounts'
  | 'website'
  | 'integrations'
  | 'chat'
  | 'api'
  | 'billing'
  | 'credits'
  | 'proposal_settings';

const SettingsPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { tenant } = useTenant();
  const { user, isLoading: isAuthLoading } = useAuth();

  const companyName = useSelector((state: any) => state.settings.companyName);
  const companyLogo = useSelector((state: any) => state.settings.companyLogo);
  const [activeTab, setActiveTab] = useState<ActiveTab>('integrations');
  const [renewalDate, setRenewalDate] = useState<string>('');
  const [logoError, setLogoError] = useState(false);

  // Redirect if not authenticated and not loading
  useEffect(() => {
    if (!isAuthLoading && !user) {
      const redirect = encodeURIComponent('/settings');
      router.replace(`/login?redirect_url=${redirect}`);
    }
  }, [isAuthLoading, user, router]);

  // Update company name from tenant or user profile
  useEffect(() => {
    if (!user) return;

    const sessionName =
      tenant?.name && tenant.name !== 'Default'
        ? tenant.name
        : (user as any)?.company_name || user?.name;

    if (sessionName && sessionName !== companyName && sessionName !== 'Default') {
      dispatch(setCompanyName(sessionName));
    }
  }, [tenant?.name, user, companyName, dispatch]);

  // Source of truth for display: prioritize tenant/user data over Redux if they exist
  const displayCompanyName =
    tenant?.name && tenant.name !== 'Default'
      ? tenant.name
      : (user as any)?.company_name || user?.name || (companyName !== 'My Organization' ? companyName : '');

  useEffect(() => {
    if (!user) return;
    const tabParam = (searchParams.get('tab') || '').toLowerCase();
    const allowed: ActiveTab[] = [
      'businessprofile',
      'team',
      'accounts',
      'website',
      'integrations',
      'chat',
      'api',
      'billing',
      'credits',
      'proposal_settings',
    ];
    if (tabParam === 'company') {
      const sp = new URLSearchParams(Array.from(searchParams.entries()));
      sp.set('tab', 'businessprofile');
      router.replace(`/settings?${sp.toString()}`);
      setActiveTab('businessprofile');
    } else if (allowed.includes(tabParam as ActiveTab)) {
      setActiveTab(tabParam as ActiveTab);
    }

    const fetchRenewalDate = async () => {
      try {
        const periodEnd = Date.now() + 86400 * 15 * 1000;
        const date = new Date(periodEnd);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        setRenewalDate(formattedDate);
      } catch (error) {
        console.error('Error fetching renewal date:', error);
        setRenewalDate('November 29th, 2025');
      }
    };
    fetchRenewalDate();
  }, [user, searchParams, router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B1957]"></div>
      </div>
    );
  }

  if (!user) return null;

  const tabs = [
    { id: 'businessprofile' as ActiveTab, label: 'Business Profile', icon: Target },
    { id: 'team' as ActiveTab, label: 'Team', icon: Users },
    { id: 'integrations' as ActiveTab, label: 'Integrations', icon: Plug },
    { id: 'chat' as ActiveTab, label: 'Chat Settings', icon: MessageSquare },
    { id: 'api' as ActiveTab, label: 'Voice Settings', icon: Terminal },
    { id: 'billing' as ActiveTab, label: 'Billing', icon: CreditCard },
    { id: 'credits' as ActiveTab, label: 'Credits', icon: Coins },
    { id: 'proposal_settings' as ActiveTab, label: 'Proposal Settings', icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#000724] space-y-6 p-4 sm:p-6">
      {/* Combined Header with Logo, Company Name, Renewal Date, and Tabs */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Top Section: Logo, Company Name, and Renewal */}
        <div className="p-6 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white dark:bg-gray-800 shadow-md flex items-center justify-center border-2 border-white dark:border-gray-700">
                {logoError || !companyLogo ? (
                  <Building2 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                ) : (
                  <img
                    src={companyLogo}
                    alt="Company Logo"
                    className="w-full h-full object-cover"
                    onError={() => setLogoError(true)}
                  />
                )}
              </div>
              <div>
                <h1 className="text-gray-900 dark:text-gray-100 font-semibold text-xl">{displayCompanyName}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Renews on {renewalDate || 'Loading...'}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom Section: Tabs Navigation */}
        <div className="border-t border-gray-200/50 dark:border-gray-800/60 bg-white/30 dark:bg-black/20 backdrop-blur-sm">
          <div className="flex space-x-1 overflow-x-auto p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  const sp = new URLSearchParams(Array.from(searchParams.entries()));
                  sp.set('tab', tab.id);
                  router.replace(`/settings?${sp.toString()}`);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-800 text-[#0B1957] dark:text-blue-400 shadow-md font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-800/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => router.push('/settings/icp-search-strategy')}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-800/50"
            >
              <Crosshair className="w-4 h-4" />
              ICP Strategy
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'businessprofile' && <BusinessProfileSettings />}
        {activeTab === 'integrations' && <IntegrationsSettings />}
        {activeTab === 'chat' && <ChatSettings />}
        {activeTab === 'api' && <VoiceAgentSettings />}
        {activeTab === 'team' && <TeamManagement />}
        {activeTab === 'billing' && <BillingSettings />}
        {activeTab === 'credits' && <CreditsSettings />}
        {activeTab === 'proposal_settings' && <ProposalSettings />}
      </div>
    </div>
  );
};

export default SettingsPage;
