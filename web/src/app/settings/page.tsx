'use client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCompanyName, setCompanyLogo } from '../../store/slices/settingsSlice';
import { IntegrationsSettings } from '../../components/settings/IntegrationsSettings';
import { VoiceAgentSettings } from '../../components/settings/VoiceAgentSettings';
import { BillingSettings } from '../../components/settings/BillingSettings';
import { CreditsSettings } from '../../components/settings/CreditsSettings';
import { CompanySettings } from '../../components/settings/CompanySettings';
import { TeamManagement } from '../../components/settings/TeamManagement';
import { Building2, Users, UserCircle, Globe, Plug, Terminal, CreditCard, Coins, Upload } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

type ActiveTab = 'company' | 'team' | 'accounts' | 'website' | 'integrations' | 'api' | 'billing' | 'credits';

const SettingsPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await getCurrentUser();
        setAuthed(true);
      } catch {
        setAuthed(false);
        const redirect = encodeURIComponent('/settings');
        router.replace(`/login?redirect_url=${redirect}`);
      }
    })();
  }, [router]);

  const dispatch = useDispatch();
  const companyName = useSelector((state: any) => state.settings.companyName);
  const companyLogo = useSelector((state: any) => state.settings.companyLogo);
  const [activeTab, setActiveTab] = useState<ActiveTab>('integrations');
  const [renewalDate, setRenewalDate] = useState<string>('');

  useEffect(() => {
    if (authed !== true) return;
    // Initialize active tab from URL query param if present
    const tabParam = (searchParams.get('tab') || '').toLowerCase();
    const allowed: ActiveTab[] = ['company','team','accounts','website','integrations','api','billing','credits'];
    if (allowed.includes(tabParam as ActiveTab)) {
      setActiveTab(tabParam as ActiveTab);
    }
    // Fetch subscription data to get renewal date
    const fetchRenewalDate = async () => {
      try {
        // Calculate renewal date from current_period_end (15 days from now based on mock data)
        const periodEnd = Date.now() + 86400 * 15 * 1000; // 15 days from now in milliseconds
        const date = new Date(periodEnd);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        setRenewalDate(formattedDate);
      } catch (error) {
        console.error('Error fetching renewal date:', error);
        setRenewalDate('November 29th, 2025'); // Fallback
      }
    };

    fetchRenewalDate();
  }, [authed, searchParams]);

  if (authed === null) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authed) return <></>;

  

  const tabs = [
    { id: 'company' as ActiveTab, label: 'Company', icon: Building2 },
    { id: 'team' as ActiveTab, label: 'Team', icon: Users },
    // { id: 'accounts' as ActiveTab, label: 'Accounts', icon: UserCircle },
    // { id: 'website' as ActiveTab, label: 'Website', icon: Globe },
    { id: 'integrations' as ActiveTab, label: 'Integrations', icon: Plug },
    { id: 'api' as ActiveTab, label: 'Voice Settings', icon: Terminal },
    { id: 'billing' as ActiveTab, label: 'Billing', icon: CreditCard },
    { id: 'credits' as ActiveTab, label: 'Credits', icon: Coins },
  ];

  return (
    <div className="space-y-6">
      {/* Combined Header with Logo, Company Name, Renewal Date, and Tabs */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Top Section: Logo, Company Name, and Renewal */}
        <div className="p-6 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow-md flex items-center justify-center border-2 border-white">
                  <img
                    src={companyLogo}
                    alt="Company Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <label
                  htmlFor="header-logo-upload"
                  className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-full cursor-pointer hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                >
                  <Upload className="w-3 h-3" />
                  <input
                    id="header-logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          dispatch(setCompanyLogo(reader.result as string));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              <div>
                <h1 className="text-gray-900 font-semibold text-xl">{companyName}</h1>
                <p className="text-gray-600 text-sm">
                  Renews on {renewalDate || 'Loading...'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Tabs Navigation */}
        <div className="border-t border-gray-200/50 bg-white/30 backdrop-blur-sm">
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
                    ? 'bg-white text-blue-700 shadow-md font-semibold'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'company' && (
          <CompanySettings 
            companyName={companyName}
            setCompanyName={(name: string) => dispatch(setCompanyName(name))}
            companyLogo={companyLogo}
            setCompanyLogo={(logo: string) => dispatch(setCompanyLogo(logo))}
          />
        )}
        {activeTab === 'integrations' && <IntegrationsSettings />}
        {activeTab === 'api' && <VoiceAgentSettings />}
        
        {/* Placeholder for other tabs */}
        {activeTab === 'team' && <TeamManagement />}

        {false && activeTab === 'accounts' && (
          <div className="space-y-6">
            {/* Enrichment Preferences */}
            <div>
              <h2 className="text-gray-900 text-xl font-semibold mb-4">Enrichment Preferences</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-6 border-2 border-blue-500 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-medium">Work emails + Premium database</h3>
                      <p className="text-gray-600 text-sm mt-1">50 Credits per row</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-medium">Personal emails + Premium database</h3>
                      <p className="text-gray-600 text-sm mt-1">100 Credits per row</p>
                    </div>
                  </div>
                </div>
              </div>
              <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>Save Changes</span>
              </button>
            </div>

            {/* Email Accounts */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-900 text-xl font-semibold">Email Accounts</h2>
                <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Add Account</span>
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                          <span>Account</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Name</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>Job title</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Status</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Sending limits</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Use this mailbox</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Managed deliverability</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={8} className="text-center text-gray-500 py-12">
                        No results.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* LinkedIn Accounts */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-900 text-xl font-semibold">LinkedIn Accounts</h2>
                <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Add Account</span>
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Account</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Status</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Sending limits</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Use this account</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className="text-center text-gray-500 py-12">
                        No results.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Power Dialer Numbers */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-900 text-xl font-semibold">Power Dialer Numbers</h2>
                <div className="flex space-x-3">
                  <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Existing Phone</span>
                  </button>
                  <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Add Phone</span>
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>Phone number</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Name</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Status</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Region</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">Capability</th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={6} className="text-center text-gray-500 py-12">
                        No phone numbers configured.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {false && activeTab === 'website' && (
          <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-lg p-8 border border-gray-200 shadow-sm">
            <h2 className="text-gray-900 text-xl font-semibold mb-2">Website Settings</h2>
            <p className="text-gray-600">Configure website tracking and integration options.</p>
          </div>
        )}
        
        {activeTab === 'billing' && <BillingSettings />}
        
        {activeTab === 'credits' && <CreditsSettings />}
      </div>
    </div>
  );
};

export default SettingsPage;
